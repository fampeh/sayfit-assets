# Changelog

## 2026-09-27 — About section preview

- Added an inline disclosure for the long About copy in English and Persian.
- The collapsed state now shows two complete paragraphs with natural wrapping beside the portrait; Show more reveals the remaining copy.
- Reviewed the local desktop layout visually in both languages.

## 2026-09-27 — Documentation aligned with the current source

- Updated the architecture and SEO guides to use the six current Work categories and the public `/work/eyewear/` and `/work/photography/` routes.
- Corrected the Home collection counter description and replaced the outdated project tree with a concise map of current source, generated output and development folders.
- Added the Work-page generation guide referenced by the page generator and linked it from the documentation index.
- Clarified the explicit docs-only commit exception in the root contributor instructions while preserving the source-file ignore policy.
- No runtime behavior changed.

## 2026-09-15 — About copy refresh

- Replaced the About section with the owner-provided bilingual SayFit practice statement.
- Expanded the section from five to seven paragraphs, covering the multidisciplinary practice, product-design process, sculpture, material language, graphic-design background and core approach.
- Kept English and Persian copy in their respective i18n sources and retained the HTML fallbacks for the initial page render.

## 2026-09-15 — Landing intro handoff

- Reduced the preloader cube to 44 px and shortened its exit to a 180 ms fade.
- Added a 420 ms white handoff after the preloader before the logo motion begins.
- Deferred the landing-cube intro until all logo stroke and type animations complete, preventing the cube from appearing during the logo sequence.
- Kept the completed-intro session marker so repeat Home visits in one tab open directly in the settled state.

Validation: JavaScript syntax and runtime ordering checks passed. The deployment builder regenerates public pages and verifies every copied file by hash.

## 2026-09-15 — Compact mobile project summaries

- Added a mobile-only, one-line project-description preview with a restrained fade at the clipped edge.
- Added bilingual `Show more` / `Show less` controls with an accessible expanded state and smooth opening/closing motion.
- Moved the mobile image count to the row opposite the project year and tightened the project-header spacing so gallery media starts sooner.
- Regenerated all 21 Work pages and the 22-URL sitemap. JavaScript syntax and generated metadata checks passed; browser-based visual QA was not available.

## 2026-09-14 — Work collections, project viewer and deploy package

- Rebuilt Home Work alignment around a shared grid for desktop and mobile.
- Renamed the public Tailor made glasses collection to Eyewear, migrated its generated URL tree to `/work/eyewear/`, and added Photography throughout navigation, translations, generated pages and sitemap.
- Added Work to visible and structured breadcrumbs and retained `#work` when navigating from Home so browser Back returns to the Work section.
- Moved carousel arrows outside media, removed their circular treatment and aligned title/count baselines.
- Reworked project pages into dark, direct-scroll viewers with no nested media modal. The active collection carousel is sticky; desktop uses gallery-left and carousel-right columns, while mobile stacks the two.
- Added in-page project changes, media preloading, content fades, page-wide project swipes, category-entry fade handoffs and shared carousel transitions where supported.
- Unified drag/release carousel mechanics across Home, category and project viewer contexts. Desktop viewer carousels use a hover-restored dim filter; mobile keeps its original brightness.
- Added `tools/prepare-deploy.ps1` and generated `deploy/`: it rebuilds the generated output, copies only host files, verifies hashes and keeps all source, documentation and Customer files out of the upload package.

Validation: generated 21 Work pages and a 22-URL sitemap; JavaScript syntax, Python compilation, JSON parsing, i18n key parity, project viewer interaction checks and deploy-copy verification passed. Automated visual review could not run because no browser surface was connected.

## 2026-09-13 — Session close: cube, navigation, intro and media

- Simplified Home cube faces to section titles and section scrolling; removed
  cube-face submenus.
- Added black touch feedback before mobile face scrolling and smooth scrolling
  for same-page hamburger links.
- Made the preloader and logo motion first-session-only with a settled repeat
  visit state.
- Restored the animated home cube to generated Work and project headers.
- Added stable `mehdi-seyfi-*` image naming to `update_projects.py`, preserving
  existing numbers and rebuilding JSON in Quick Push.
- Verified the Python script with isolated rename, idempotency, append-only
  numbering and Quick Push tests; no real project files were renamed during
  verification.

## 2026-09-13 — Legacy cube motion restored

- Restored original hover/return interpolation, 250ms delay, inertia and constant idle rotation from the old project.
- Kept a strict vertical -90/+90-degree stop; removed spring recoil and early resistance.
- Runtime motion and pitch-bound checks and JavaScript syntax validation passed.

- At the owner's request, rolled back all logo-handoff and subsequent startup changes to the baseline with random preloader turns. Later experimental entries below remain historical only.

- Removed the blocking startup regression: landing presentation no longer waits on all page images or JSON requests. Removed the eight/twelve-second fallback timers and initialize the scene before releasing the loader.

## Documentation and content organization

- Moved `PROJECT_STRUCTURE.md` into `docs/`.
- Added a documentation index, architecture, content, i18n, SEO, media, apps, deployment, testing and contribution guides.
- Created the project-local `skills/sayfit-website/` skill for future Sayfit work.
- Split app copy into `data/apps-en.json` and `data/apps-fa.json`; `data/apps.json` now contains technical records only.

## 2026-09-13

- Added separate Persian project translations in `data/projects-fa.json`.
- Added Persian project copy to the home sliders, modal data flow, project detail pages, category cards, page metadata, and JSON-LD at runtime.
- Regenerated project pages and sitemap from the current project data.
- Added project translation payloads to generated pages so language switching works without duplicating media data.
- Replaced the three repeated Home work sections with one five-collection 3D carousel.
- Added Jewelry and Painting to UI translations, navigation, generated routes and sitemap.
- Rebuilt category pages as project carousels with direct project-page navigation.
- Unified the Home and generated-page headers and added all five Work destinations.
- Removed Customer from public navigation and sitemap while leaving its files untouched.
- Renamed the public App label to Apps and changed app tiles into minimal rows.
- Removed the language-switch border and retained an accessible text focus state.
- Hid the redundant wordmark in the mobile header so the language control and home cube never overflow narrow screens.
- Changed project previous/next controls from bordered cards to text links.
- Fixed the Edge/Firefox landing-cube edge artifact by drawing edges inside transformed faces.
- Added `docs/UX_ARCHITECTURE.md` and `docs/CONVERSATION_LOG.md`, and updated architecture, content, cube, SEO and testing documentation.
- Added separate English and Persian descriptions for all nine eyewear projects and completed the Persian category keys for the five-collection model.
- Fixed project metadata after language switching so it reads the current breadcrumb category instead of the first Work submenu item.
- Removed the Quick push force-add of `data/projects.json`; both media update modes now stage only `projects/`, matching the repository policy.
- Reverted the experimental Edge/Firefox landing-cube rendering fix to the original one-pixel borders and native backface handling.
- Restored grayscale carousel media on mobile and in the default state; colour now appears only on hover-capable devices.
- Changed the preloader cube from a repeated left spin to random right, left, up and down turns, stopping cleanly before its soft fade.
- Fixed the preloader-to-logo handoff so the site initializes under the loader and the logo animation starts from its first painted frame only after the loader fade completes.
- Added bounded boot error handling and a module-independent preloader watchdog so a failed or stalled startup can no longer lock the page indefinitely.

## 2026-09-13 ? Cube hover weight and SayFit proportions

- Softened cube focus, return and recoil with strongly damped springs and refresh-independent spring timing.
- Restored the legacy SayFit wordmark spacing beneath the sign in the opening logo motion.
- Verified JavaScript syntax and spring overshoot/settling; visual browser verification unavailable in this session.
