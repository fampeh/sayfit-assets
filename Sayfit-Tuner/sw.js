/**
 * sw.js — Bekuk's service worker.
 *
 * Hand-written rather than generated, and it is about eighty lines, because
 * this app is the easy case: everything is static, and every asset Vite emits
 * carries a content hash in its name. A hashed file can never change under its
 * own URL, so it can be cached forever with no invalidation logic at all — which
 * is most of what a precache manifest and a Workbox dependency exist to solve.
 *
 * Two rules, and they follow from that:
 *
 *   navigation  → network first, cache as a fallback.  `index.html` is the one
 *                 file whose contents change without its name changing, so the
 *                 network's copy always wins when there is a network. Offline,
 *                 the last good copy is served and the app comes up.
 *   /assets/*   → cache first. Hashed, immutable, and the bulk of the weight.
 *
 * Anything else (the manifest, icons, og.png, robots.txt) is cached on first
 * use and refreshed in the background, which is right for files that change
 * rarely and matter little if they are a version behind for one load.
 */

/* Bumped by hand when the worker's own logic changes. It is also what makes an
   update visible: a new cache name means the old one is deleted on activate. */
const CACHE = 'bekuk-v1';

/**
 * What is fetched at install time so the app opens offline after one visit.
 *
 * Deliberately short — just enough to boot. The hashed bundle is not listed
 * because its name is not knowable here, and it does not need to be: it is
 * fetched on the first load anyway and cached by the rule below.
 */
const SHELL = ['./', './index.html', './manifest.webmanifest', './favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      /* `reload` so installing never picks the shell up out of the HTTP cache —
         a stale index.html baked into the worker's cache is the exact failure
         this whole file has to avoid. */
      cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      /* Take over open tabs straight away. Without this the new worker sits
         idle until every tab of the app has been closed, which for a tuner
         someone leaves open is effectively never. */
      await self.clients.claim();
    })()
  );
});

/**
 * `skipWaiting` on request, not on install.
 *
 * A worker that activates itself immediately swaps the assets under a running
 * page, and the page is left half on one build and half on another. The app
 * asks for this only after the user has agreed to reload.
 */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever GET, and only ever this origin. A POST is not cacheable and
  // another origin is not ours to serve — the bug report link, for one.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /**
   * Navigation: network first, and cached **under its own URL**.
   *
   * It used to write every navigation to `./index.html` regardless of what had
   * been asked for. That was fine while the app was the only page. It stopped
   * being fine the moment the landing pages existed: opening /setar/ would have
   * stored that page as the app's shell, and the next offline visit to the root
   * would have served an article about tuning a setar instead of the tuner.
   *
   * Keying on the request fixes it and costs nothing — each page falls back to
   * itself, and the app's own shell falls back to the shell.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          /* Its own copy first; the app shell only as a last resort, because a
             landing page is a better answer than the tuner for someone who
             asked for a landing page. */
          return (
            (await caches.match(request)) ||
            (await caches.match('./index.html')) ||
            Response.error()
          );
        })
    );
    return;
  }

  // Hashed assets: cache first, and never revalidated — the name is the version.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Everything else: serve what we have, and quietly fetch a fresher copy for
  // next time.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
