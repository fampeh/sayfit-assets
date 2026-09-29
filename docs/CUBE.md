# Navigation Cube

## Home cube edge rendering (2026-09-29)

The six Home faces remain real CSS 3D elements and keep their existing content,
controls, interaction, perspective and motion. Their one-pixel borders are
transparent so they preserve face sizing without drawing edges. A two-dimensional
SVG overlay draws the wireframe in screen space with a consistent one-pixel
stroke.

The JavaScript defines the cube's eight local vertices and twelve unique edges.
The existing animation loop samples the cube's rendered CSS transform once per
frame and projects the same pose into the overlay. This keeps the SVG aligned
with the CSS transition while preserving the original motion and uses no second
animation loop. Projection applies the scene's perspective. Edge visibility is
perspective-aware: a face is considered visible only when its plane faces the
finite camera position, so rear edges stay hidden until a side face actually
emerges from behind the front face. A `ResizeObserver` updates the overlay when
the scene size changes.

The previous Firefox artifacts came from rasterizing transformed one-pixel
face borders and thin 3D edge geometry; overlapping borders also produced
thick bars. Tests that were rejected include face borders, `outline`, the old
gradient-per-face experiment, independent CSS 3D edges, and thicker 3D strips.
The production approach is borderless CSS 3D faces with a screen-space 2D SVG
edge overlay.

The first production version introduced a synchronization regression: it
updated the SVG only when pointer or cube-state events called `render()`, while
the browser continued interpolating the cube transform on the compositor. The
SVG could therefore lag behind the faces. The fix samples the rendered cube
pose in the existing animation frame, including during drag; motion transitions
remain enabled and no second animation loop was added. A separate visibility
bug used `normal.z > 0`, which treated the camera as infinitely far away. The
current test accounts for the actual perspective distance.

**Status: Closed / Resolved.** The owner manually verified the final version in
Firefox and reported PASS, including clean edges and coherent cube motion.

The overlay is a sibling of the 3D float layer, so it paints over the finished
cube instead of being depth-occluded by a face. It inherits the scene's intro
opacity, scale and blur, and uses the same vertical float animation and timing
as the cube. The existing `intro-stroke-off` class hides the overlay until the
logo handoff releases the cube, matching when the old face borders appeared.
A `ResizeObserver` updates its viewport size when responsive dimensions
change. The small header cube still uses its own face borders and was not
changed in this task.

The landing cube is the primary navigation surface. Its faces are real HTML controls and are wired in `js/modules/cube.js`.

- Front: home
- Left: Work
- Right: Archive
- Back: Apps
- Top: About
- Bottom: Contact

Keep the face `data-target` values aligned with section ids. Do not replace the cube navigation with decorative-only elements; keyboard and touch interaction depend on the current HTML structure.

وجه‌های Home فقط عنوان سکشن را نشان می‌دهند. Work و Apps زیرمنوی داخل مکعب
ندارند؛ کلیک روی هر وجه ابتدا آن را فعال می‌کند، سپس مکعب به وجه می‌چرخد و در
پایان به سکشن مربوط اسکرول می‌شود. دسته‌های Work همچنان از هدر مشترک صفحات و
اسلایدر Work قابل دسترسی‌اند. Customer زیرمجموعهٔ مکعب یا Archive نیست.

## سازگاری مرورگر

در ۲۰۲۶-۰۹-۲۹ لبه‌های مکعب Home از SVG دوبعدی در مختصات صفحه رسم می‌شوند.
وجه‌های CSS سه‌بعدی border شفاف دارند و اندازهٔ قبلی خود را حفظ می‌کنند. همگام‌سازی
SVG با pose واقعی مکعب در همان حلقهٔ animation انجام می‌شود و visibility وجه‌ها
فاصلهٔ واقعی perspective را در نظر می‌گیرد. مالک نسخهٔ نهایی را در Firefox واقعی
دستی بررسی کرده و Finding را PASS اعلام کرده است؛ وضعیت: بسته / حل‌شده.

## Hover motion (2026-09-13)

Motion matches `old/SayfitWebsite/js/script.js`: 250ms hover intent, 0.12 per-frame focus/return interpolation, 0.02-degree arrival tolerance, 0.92 inertia decay and 0.4 drag sensitivity. Idle rotation adds 0.08 degrees of yaw and 0.03 degrees of pitch per frame. There is no spring or recoil.

The retained exception is the vertical rotation lock: pitch is clamped to -90/+90
degrees. During hand movement, resistance begins after roughly 52 degrees and
becomes reluctant near 62 degrees; releasing beyond that point eases back to
34 degrees. Face focus uses bounded pitch targets; yaw remains unrestricted.
Geometry and one-pixel borders are unchanged.

## Interaction details (2026-09-13)

On touch, the selected face receives its black active state before focus
animation starts. The scroll is consumed only after the turn reaches its
target, so the feedback is visible before navigation. Dragging a face remains
separate from tapping it through the movement threshold.

The preloader and logo draw are controlled by the `sayfit:intro-seen` session
storage flag. A repeat visit in the same tab starts the cube at its settled
pose and skips both animations; a new tab gets the normal first-visit intro.

## Intro sequence (2026-09-15)

On a first visit, the landing scene is prepared behind the preloader. The
44 px preloader cube fades out over 180 ms, then the page stays white for
420 ms before the main logo drawing begins. `js/main.js` waits for every
animation returned by the logo stage before calling `startCubeIntro()` in
`js/modules/cube.js`; do not start the cube from an independent timer.

Faces and the landing area remain non-interactive while the logo is drawing.
When the cube intro finishes, it records `sayfit:intro-seen` in session
storage. A later Home visit in that same tab bypasses the loader, logo draw
and cube intro and uses the settled pose.
