# Decisions

## 2026-09-30 — Home cube Desktop Hover / Focus edge stability

- **Status: Closed / Resolved — owner manual PASS (2026-09-30).** The owner reported all behavior good after manual testing. The exact browser names/versions were not specified. The preceding Desktop Drag / auto-scroll finding remains closed and unchanged.
- Root cause: CSS 3D faces move across a stationary screen pointer while the cube focuses. Descendant hit-testing and `mouseleave` can therefore change because of cube geometry, even though the user did not move the mouse. Requiring `scene.matches(':hover')` at timer completion and cancelling a candidate whenever the current event target stopped being a face made hover intent depend on that moving geometry.
- Chosen architecture: latch intent from a real mouse move onto a real `.face`, then retain it using two frozen screen-space rectangles. No live hit-test is used to retain focus; no scene/face leave event, invisible overlay, pointer-events workaround, global cube envelope, kernel, polling, or new animation loop is used.
- Candidate envelope: read the acquired face's `getBoundingClientRect()` once, expand all four sides by 18 px, and keep the 250 ms intent delay. Blank hit-testing does not cancel the candidate while the pointer remains inside that frozen rectangle. A real pointer move outside it cancels; a real move to a different face can start a new candidate after the 6 px switch threshold.
- Hold envelope: for the selected face, project its four cube-space vertices through 12 evenly spaced samples (including both endpoints) along the actual shortest-yaw path from the current pose to `FACE_ANGLES`. Reuse `nearestAngle()`, `rotateVector()`, `projectVertex()`, the existing perspective and scene dimensions. Convert the path bounds to client coordinates, union the current rendered face rect, then expand by 24 px. Freeze the result before calling `focusFace()`; reduced-motion jumps are therefore covered too.
- Actual pointer intent is tracked using successive `clientX` / `clientY` mouse events. Cube movement without a changed mouse position cannot acquire, cancel, release, or switch a face. Switching requires a real face hit and at least 6 px from the current intent anchor, followed by the same 250 ms delay; the old focused face remains while the new candidate is pending.
- A single `releaseHoverFocus()` clears candidate, hold, face classes, cube hover state and submenu pointer state, then calls `unfocusCube()` once when a committed hover existed. Explicit exits are window leave (except an active held Landing drag), window blur, hidden document and page scroll.
- Desktop hover uses the existing window mouse-move route. Held-button input retains the prior drag `preventDefault()` and `moveDrag()` path. Landing-wide drag, pitch limits/resistance, recoil, click threshold, native auto-scroll suppression, face navigation, keyboard, touch and mobile paths are preserved. Existing Focus interpolation and SVG wireframe functions are outside this fix.
- `css/parts/cube.css` was already modified in the supplied WIP to style `.hover-intent`, `.hover-focused`, `.cube.hovering` and submenu pointer state. This fix kept that visual design and added no CSS, markup, or overlay changes.
- Validation: `node --check js/modules/cube.js` and `git diff --check` passed. The local Browser Preview loaded and showed the cube, but its available interaction surface did not provide pointer-only movement. The owner subsequently tested manually and reported PASS for the behavior; the finding is closed based on that report.

## 2026-09-30 — Close Home cube Desktop drag / auto-scroll finding

- Root cause: native browser drag and text selection behavior could intercept a Desktop Landing drag and scroll the page.
- The fix preserves Landing-wide drag and suppresses native drag/selection only while the mouse gesture is active; it does not lock page scrolling.
- Vertical pitch resistance now ramps toward the hard ±90° limit, with stronger vertical velocity damping near the limit. Inward movement remains responsive, and the gesture no longer auto-disengages before mouseup.
- Releasing near the pitch limit applies a short recoil. The existing click threshold and face navigation remain intact.
- Owner manually tested the final Desktop drag behavior and reported PASS. Finding status: Closed / Resolved.

## 2026-09-29 — Home cube screen-space edges

- Root cause: transformed one-pixel face borders and thin 3D edge primitives caused rasterization artifacts; overlapping face borders produced thick bars.
- Rejected face borders as visible edges, `outline`, gradient-per-face, independent CSS 3D edges and thicker 3D strips. The earlier gradient experiment remains rolled back.
- The six CSS 3D faces keep their content and interaction with transparent borders; a screen-space 2D SVG draws the twelve unique edges.
- The first SVG implementation could lag because CSS continued transitioning between event-driven SVG updates. The fix samples the rendered cube pose in the existing animation frame, including during drag, without a second loop or changing the motion transition.
- Rear-edge visibility now accounts for the finite perspective camera; the earlier `normal.z > 0` test exposed rear edges before a side face emerged from behind the front face.
- Owner manually verified the final version in real Firefox and reported PASS. Finding status: Closed / Resolved.
- The header's mini navigation cube retains its separate borders and is outside this change.

## 2026-09-28 — Privacy-preserving Sayfit telemetry

- Added one shared frontend telemetry module for the Home page and generated Work/project pages.
- Each page load sends one `first_visit` event to the same-origin `/api/telemetry/v1` endpoint.
- The first trusted click, key press, mouse-wheel scroll or touch start sends one `first_engaged` event; listeners are removed immediately afterwards.
- Requests contain only the event field, omit credentials and referrer, and use no identifiers, storage, retries, queues or analytics dependency.
- Sayfit currently has no manifest, service worker or installed-PWA mode, so `first_pwa_open` is not emitted.

## 2026-09-27 — About section disclosure

- The About section uses an inline Show more / Show less control in English and Persian.
- Its collapsed preview shows the first two complete paragraphs with natural line wrapping in the column beside the portrait; the remaining paragraphs appear when expanded.
- The control reuses the existing bilingual labels and updates `aria-expanded`. The full copy remains visible if JavaScript does not initialize.
- The preview was visually reviewed in the local browser in both languages on desktop.

## 2026-09-15 — Landing intro handoff and compact preloader

- The preloader now remains visible while the landing scene is prepared, then fades out in 180 ms. A 420 ms white pause follows before the main logo motion starts, so the two animations do not visually overlap.
- The logo stroke and type animations are the handoff authority: the landing cube may begin its intro only after every logo animation has finished. The scene is rendered but kept non-interactive until then.
- The preloader cube is half its former size (44 px) to keep the loading state quiet relative to the logo motion.
- The completed cube intro writes `sayfit:intro-seen` to session storage. Returning Home in the same tab skips the preloader and logo motion and opens the cube in its settled state; unavailable storage falls back to the first-visit sequence.

## 2026-09-15 — Mobile project-summary disclosure

- In the narrow project viewer, the description is collapsed by default so the first artwork appears without unnecessary scrolling. Its first line remains visible, with a subtle end gradient to signal that more copy exists.
- `Show more` / `Show less` expands and collapses the existing description in place. The control has English and Persian translations, an accessible expanded state, and a calm height/opacity transition; the desktop description remains fully visible.
- The mobile image count shares the metadata row with the year, on the opposite edge. This reclaims vertical space without removing the count or changing the desktop layout.
- The detail-page generator is the only source of this markup. After a generator or UI change, regenerate `work/` and `sitemap.xml`; do not edit generated pages directly.

## 2026-09-14 — Work grid, collection expansion and project viewer

- The Home Work section uses one shared layout grid. On desktop, its copy aligns to the image top edge; caption and numeric position share a baseline. On narrow screens the copy aligns with the image edge.
- The public collection label and route changed from "Tailor made glasses" to "Eyewear" / `/work/eyewear/`. Photography became the sixth collection and receives a stable empty category page until media is added.
- Category and project breadcrumbs now read Home / Work / Collection / Project. Entering a collection from Home preserves `#work` in browser history, so Back returns to the Work section rather than the top of Home.
- Carousel arrows are plain, outside the media bounds and have larger desktop clearance. Carousel drag mechanics are shared across Home, category and project contexts; the intentional button direction remains unchanged.
- A project is a dark viewer, not a second modal: its media is directly scrollable; the active category carousel remains sticky. On desktop the gallery occupies the left column and the carousel occupies the right column. On mobile they stack.
- Project changes are loaded in place, with image preloading and a content fade. Page-wide horizontal swipes change projects except on the carousel, header, links and media controls; carousel gestures keep their own behavior.
- The viewer carousel is visually dimmed only on hover-capable desktop devices so the gallery remains the focus. Hover restores its normal brightness.
- Category entry uses a fade handoff and, where supported, a shared view transition for the carousel. A first-paint cover provides the same calm transition on browsers without view transitions.

## 2026-09-14 — Release package rule

- `tools/prepare-deploy.ps1` is the canonical deployment builder. It regenerates generated pages, creates `deploy/`, copies only public files, verifies each copy by hash, and removes stale files only in that generated package.
- The trigger phrase **"دیپلویی بگیر"** means run that script and hand off the resulting `deploy/` directory for server upload. Customer is excluded unless its private release is explicitly requested.

## 2026-09-13 — Session close: navigation, intro and media pipeline

- The Home cube now shows section titles only. Work and Apps no longer expose
  submenus on cube faces; clicking a face selects it visually, turns toward it,
  and then scrolls to its section. The existing header remains the category
  switcher for individual Work pages.
- Mobile face taps add the selected state before the focus animation begins, so
  the black feedback is visible before the section scroll. The face selection
  and scroll target are kept in the same interaction path as desktop focus.
- Same-page links in the mobile hamburger use `scrollToTarget()` with smooth
  scrolling and close the menu after the route is scheduled. Native hash jumps
  are prevented for Home, Archive, About and Contact.
- The preloader and landing logo animation run once per browser tab session.
  `sessionStorage` records the completed handoff; repeat visits in that tab
  remove the loader and initialize the cube in its settled pose. Storage errors
  fall back to the normal first-visit presentation.
- Generated Work and project pages now include the small animated home cube in
  the shared header and link it to the site root.
- `update_projects.py` now gives images stable descriptive names using the
  `mehdi-seyfi-project-name-cover.ext` and
  `mehdi-seyfi-project-name-01.ext` pattern. Existing sequence numbers are
  preserved, new files take the next unused number, videos are left unchanged,
  and the JSON is rebuilt in Quick Push so media URLs stay synchronized.
- Documentation was intentionally deferred during implementation and was
  recorded only at the owner's explicit request at the end of this session.

## 2026-09-13 — Restore legacy cube motion with pitch lock

- Owner requested the old cube behaviour with only the vertical 90-degree lock retained. This supersedes the heavy-spring tuning.
- Restored `old/SayfitWebsite/js/script.js` motion: 250ms hover delay, 0.12 per-frame focus/return interpolation, 0.02-degree arrival tolerance, 0.92 inertia decay, 0.4 drag sensitivity and constant 0.08 yaw / 0.03 pitch idle increments.
- Removed springs, recoil, early resistance and modulated drift. Pitch stops at -90/+90; face focus uses direct bounded pitch targets, and yaw remains unrestricted.
- Restored legacy CSS transition priority during focus. Current navigation and reduced-motion support remain functional.
- Runtime checks passed for focus, return, drag, inertia, idle, all six face targets and both pitch limits. JavaScript syntax passed; visual browser verification remains unavailable.

## 2026-09-13 — Owner-requested rollback to random-preloader baseline

- Restored the runtime state immediately before the owner's logo-motion handoff request, using the source captured in that conversation.
- Kept random preloader turns. Restored the original load-event timing, logo initialization at the beginning of boot, and immediate cube intro initialization.
- Removed deferred scene preparation and all later startup experiments. The later handoff and fail-safe entries below are historical and no longer describe the implementation.

## 2026-09-13 — Remove blocking startup regression

- The owner reported continuing startup delays and an unusable page after the previous changes. The previous assertion that removing the preloader proved successful startup was insufficient.
- Removed the eight-second boot race and twelve-second watchdog. They could reveal an uninitialized scene and did not repair the dependency problem.
- Initialize the landing scene and navigation synchronously after module parsing. Start its presentation independently of translation, app and project requests, and do not wait for `window.load` (which includes unrelated images).
- Translations and data continue loading asynchronously. The English HTML fallback can briefly remain visible while translations arrive; the logo timeline remains paused until after the loader fade.

## Documentation policy

- `docs/` is the canonical home for project documentation.
- `CLAUDE.md` remains at the repository root because it is an operational instruction file for coding agents.
- English and Persian website copy are stored in separate language files wherever the content is data-driven.

## 2026-09-13 — Separate Persian project translations

- Customer pages are intentionally outside the scope of this change because they are used as a client/test area.
- Project translations live in `data/projects-fa.json`, separate from the English source data.
- The home sliders and generated project pages consume the Persian title and description when `lang=fa` is active.
- Generated project pages are rebuilt from `data/projects.json` so the current sculpture descriptions and existing eyewear projects stay in sync.
- The browser bridge error (`missing field sandboxPolicy`) is environmental and cannot be repaired from this repository.

## 2026-09-13 — Unified Work system

- The owner approved replacing the repeated Home work sections with one five-face 3D carousel while explicitly preserving the carousel on mobile.
- The public collections are Sculpture, Tailor made glasses, Visual identity, Jewelry and Painting. Their technical keys stay stable and their visible labels remain translatable.
- A category page uses the same 3D carousel language for its projects. An active project opens its detail page; the detail page keeps the natural-ratio, one-column gallery and media modal.
- The shared header is the global collection switcher on Home, category pages and project pages. This avoids forcing a return to Home.
- `Apps` / `اپ‌ها` is the navigation label; “digital products” describes the content rather than replacing the concise label.
- Apps use minimal rows, not a second carousel, so Work remains the one dominant motion system.
- Archive is reserved for older work, studies and process. Customer is a private client/test space and was removed from public navigation and sitemap without changing its files.
- Empty category pages are generated for Visual identity, Jewelry and Painting so links and SEO URLs remain stable before media arrives.
- The Home category carousel uses a simple numeric position instead of the polygon navigator. Project carousel button direction remains intentionally unchanged.
- The language switch loses its visible border; keyboard focus is indicated with a text underline.
- Historical experiment: cube face borders were temporarily replaced with four one-pixel background gradients because intersecting transformed borders rendered as thick black bars and Firefox leaked shadow edges from hidden back faces. That approach was later rolled back; the issue was ultimately resolved with the screen-space SVG edge overlay recorded above.

## Deferred

- Dedicated static Persian URL trees such as `/fa/work/.../` would improve bilingual indexing, but are a separate routing/deployment change. The current release retains `?lang=fa`.
- Archive should receive a real chronological data source before more items are exposed there.

## 2026-09-13 — Revert landing-cube rendering experiment

- مالک گزارش کرد اصلاح آزمایشی لبه‌های مکعب، ظاهر کلی آن را به‌هم زده و نسخهٔ قبلی بهتر بوده است.
- gradientهای لبه و پنهان‌سازی هندسی وجه‌های پشت حذف شدند و مکعب به `border` یک‌پیکسلی و رفتار قبلی برگشت.
- وضعیت تاریخی: باگ لبهٔ مکعب در آن زمان باز ماند. Finding در ۲۰۲۶-۰۹-۲۹ با SVG دوبعدی، همگام‌سازی animation و visibility آگاه از perspective حل شد؛ مالک در Firefox واقعی PASS داد.
- رنگی‌شدن خودکار وجه فعال اسلایدر حذف شد؛ تمام تصاویر به‌طور پیش‌فرض خاکستری‌اند و فقط روی دستگاه دارای hover رنگی می‌شوند.

## Git boundary

- `.gitignore` remains untouched and only `projects/` belongs in the GitHub assets repository.
- `update_projects.py` may rewrite `data/projects.json` locally, but must stage only `projects/`. The JSON is uploaded to the web host manually.

## 2026-09-13 — Random preloader turns

- The owner asked to keep the current outlined preloader cube but replace its repeated left turn with random turns while the site loads.
- Each step now chooses right, left, up or down, without repeating the same direction twice in a row.
- The turn loop stops as soon as the preloader begins its existing soft fade. Reduced-motion visitors continue to see a static cube.
- The landing navigation cube and the site's boot delay were deliberately left unchanged; this decision applies only to the preloader.

## 2026-09-13 — Preloader-to-logo handoff

- The owner reported that the opening frames of the landing logo motion were still hidden even after adding the preloader.
- The cause was sequencing: the logo animation started at the beginning of `boot()`, before language loading completed and before the landing scene changed from `opacity: 0` to visible.
- Site data, translations and the landing scene now initialize behind the opaque preloader. The preloader fades only after that work is ready.
- The logo paths remain paused at their exact initial frame until the preloader has finished fading. Two animation frames are then allowed for the browser to paint that initial state before the logo and cube intro start together.
- Reduced-motion mode does not prepare hidden inline stroke offsets, so its static completed logo remains visible.

## 2026-09-13 — Preloader fail-safe

- The owner reported that the site could remain permanently stuck on the preloader after the presentation handoff change.
- The readiness gate previously awaited `boot()` with no rejection handling or upper time limit. Any unexpected initialization error or stalled request therefore prevented `hidePreloader()` from ever running.
- Normal startup still waits for translations, project data, app data and the prepared landing scene, but the readiness wait is capped at eight seconds and boot failures fall back to the static page.
- A separate twelve-second inline watchdog removes both the preloader and the translation visibility lock if the ES-module graph cannot execute at all, including stale mixed module caches and unsupported `file://` previews.
- The watchdog is an emergency escape hatch only; normal HTTP serving remains required for full interaction and data loading.

## 2026-09-13 ? Heavy cube hover and legacy logo proportions

- Owner requested a heavy, responsive turn toward the hovered face with only a very small bounce, and the original SayFit type-to-sign ratio from `old/SayfitWebsite/`.
- Reduced focus/return spring stiffness to 0.018 and damping multiplier to 0.80; recoil uses 0.012/0.82. Fixed 60 Hz spring steps preserve timing across refresh rates, with elapsed time capped after background pauses.
- A 90-degree turn now overshoots by approximately 0.27 degrees instead of 31.94 degrees and settles within 0.05 degrees in approximately 1.23 seconds.
- Legacy and current logo CSS dimensions already match (50% sign, 110% type SVG, 38px type). The actual difference was collapsed whitespace between the legacy tspans, removed during HTML compaction. Restored the original inter-letter spaces, preserving the original font and drawing sequence.
- Startup timing and preloader remain at the owner-requested rollback baseline; no new loading gate was introduced.
- JavaScript syntax checks and numerical spring validation passed. Browser visual QA could not run because the browser bridge reports no available browser.
