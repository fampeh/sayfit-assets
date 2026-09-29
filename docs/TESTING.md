# Testing Checklist

Start the local server with `start-server.bat` or:

```text
python -m http.server 8000
```

Verify:

- Telemetry sends one `first_visit` per page load and one `first_engaged` after the first trusted interaction; each request body contains only `event` and uses `/api/telemetry/v1`.
- `/` loads without a blank page.
- `/fa/` returns Persian HTML and keeps Persian after refresh; `/` remains English regardless of browser language or local storage.
- EN/FA language links have real alternate `href` values and switch language without a full reload.
- Home contains one six-collection Work carousel and no repeated category sections.
- Carousel media remains grayscale by default, including on touch/mobile; colour appears only on hover-capable pointers, and inactive faces stay outside the tab order.
- Category carousels navigate to project pages; mobile category entry uses the
  perspective/fade handoff rather than an abrupt refresh.
- Header Work menu exposes Sculpture, Eyewear, Visual identity, Jewelry,
  Painting and Photography on Home and generated pages.
- Project viewers use a dark background, keep the category carousel sticky,
  show direct scrollable media without a nested modal, and place the gallery
  left of the carousel on desktop.
- Drag physics and release behaviour match between the Home carousel, category
  carousels and project-viewer carousel. On desktop the viewer carousel is
  dimmed until hover; mobile applies no extra dimming.
- Swiping across the project viewer outside controls moves to the adjacent
  project; swiping on the carousel continues to operate the carousel.
- On a narrow project viewer, the description initially shows one faded-edge
  line; Show more / Show less expands and collapses it smoothly, and the image
  count shares the row opposite the year. Desktop keeps the full description.
- Language switch has no border and switches both UI and project text.
- The landing cube keeps its original geometry and interaction; transparent one-pixel face borders preserve sizing, while one-pixel screen-space SVG edges remain continuous without showing hidden back edges. Face visibility accounts for the finite perspective camera.
- Check the Home cube nearly front-on, with Top + Front and Top + Front + Side visible, and with near-horizontal, near-vertical and shallow-angle edges. Check while dragging, during inertia, through intro, at a narrow viewport, after resize, and at common browser zoom levels. The edge overlay stays hidden with `intro-stroke-off` until the logo handoff completes, then shares the cube's reveal and float.
- Confirm the edge overlay stays aligned during responsive resizing, intro opacity/scale/blur, drag and CSS transition frames. It samples the rendered cube pose in the existing animation loop, with no second loop, and has `pointer-events: none` and `aria-hidden="true"`.
- Verify Home cube edge rendering in Chromium, Edge and Firefox when those browsers are available. The small header navigation cube retains its independent face borders and is outside this rendering change.
- Closure 2026-09-29: owner manually verified the final Home cube in real Firefox and reported PASS for clean edges and coherent motion, including perspective-aware rear-edge visibility.
- Touching a Home face shows its active black state before the delayed section scroll; Home faces contain titles only and no submenus.
- Same-page hamburger links use smooth scrolling and close the mobile menu after navigation.
- In a fresh browser tab, the 44 px preloader fades out, the white handoff remains visible briefly, the logo completes its full draw, and only then does the landing cube begin its intro. Repeat Home visits in that tab start in the settled cube state.
- Generated Work and project headers contain the animated home cube and link it to the site root.
- Generated sculpture and eyewear pages return 200.
- Generated Persian homepage, category pages and translated project pages return 200; their raw HTML has `lang="fa"`, `dir="rtl"`, Persian copy and self-canonicals.
- Every sitemap URL returns 200.
- JSON files parse successfully.
- JavaScript files pass `node --check`.
- `update_projects.py` preserves SEO image numbers across reruns and assigns the next unused number to a new image without renaming videos.
- All CDN media URLs respond successfully.
- No stale generated pages remain after regeneration.
- Customer is absent from public navigation and sitemap.
- `./tools/prepare-deploy.ps1` completes and `deploy/` contains only the
  documented public upload files.

## Bilingual SEO release checks

- Explicit EN/FA selection adds one history entry; Back/Forward follows the path language without creating extra entries. Confirm scroll and current carousel/project state are not unnecessarily reset.
- The sitemap has 22 English URLs, 22 Persian URLs, and 44 total; `<loc>` values are unique and contain no `?lang=`. All pages self-canonicalize, language pairs expose reciprocal `en`/`fa` alternates, and `x-default` points to English.
- Language identity is path-based. Legacy `?lang=fa` and `?lang=en` do not switch language in the website; their permanent server-side migration belongs to separate Server Work and must be verified in the confirmed active Caddy configuration.
