# Navigation Cube

## Desktop Hover / Focus edge stability (2026-09-30)

**Status: Closed / Resolved — owner manual PASS (2026-09-30).** The owner
reported all behavior good after manual testing; exact browser names/versions
were not specified. This finding is separate from Desktop Landing drag /
auto-scroll, which remains Closed / Resolved.

### Diagnosis and decision

The cube faces are moving CSS 3D geometry. As a face rotates toward the user,
its projection can move under a stationary pointer and change the descendant
reported by hit-testing. A `mouseleave` from the scene can consequently reflect
the transformed descendant hit-test rather than the pointer leaving the fixed
scene rectangle. The former controller also required `scene.matches(':hover')`
at commit time and cancelled its candidate when the current event target was
not a face. Those checks confused geometry motion with pointer intent and
caused a short focus followed by an immediate return.

The owner-selected architecture is an intent latch plus two frozen, screen-space
envelopes. Initial acquisition still requires a real mouse move onto a real
`.face`; hover cannot start in blank scene space. A blank hit-test after
acquisition does not itself cancel the candidate.

### Candidate and switching

- `HOVER_INTENT_DELAY` remains 250 ms.
- On acquisition, the controller reads that face's `getBoundingClientRect()`
  once and expands it 18 px in every direction. This Candidate Envelope is
  frozen for that candidate.
- The candidate survives changing face/descendant hit-tests while the actual
  pointer remains inside that envelope. A real move outside it cancels the
  candidate. A real hit on a different face can replace it after at least 6 px
  of movement from the intent anchor.
- Timer commit checks that the drag is idle, the same candidate remains,
  there is no active face, and the last actual pointer position remains inside
  the frozen Candidate Envelope. It performs no live hover confirmation.
- When switching from a committed face, the old face stays focused while the
  new 250 ms candidate is pending. Cancelling that candidate preserves the old
  focus only while its Hold Envelope still contains the pointer; the switch
  anchor is resynchronized at cancellation so the next switch still observes
  the full 6 px threshold.

### Face-specific Hold Envelope

Before `focusFace()` starts, the controller gets the target from `FACE_ANGLES`
and computes the same nearest yaw using `nearestAngle()`. It samples the
current-to-target rotation at 12 evenly spaced values of `t` from 0 through 1.
At each sample, the four vertices of the selected face are projected with the
existing `projectVertex()` and `rotateVector()` math, current perspective, and
scene dimensions. The resulting local bounds are converted to client space,
unioned with the face's current rendered `getBoundingClientRect()` (to include
any compositor/state offset), and expanded 24 px in each direction.

This rectangle is Face-specific and covers only that face's actual path to its
target. It is frozen: no animation-frame update, live polling, convex hull,
polygon clipping or maximum envelope for the whole cube is used. The existing
focus path runs unchanged, including its immediate target jump under reduced
motion.

### Pointer, release and preserved behavior

Actual pointer movement is detected by comparing each window mouse event's
`clientX` / `clientY` with the previous event. No `movementX` / `movementY`,
scene `mousemove` / `mouseleave`, or `scene.matches(':hover')` check controls
retention. Cube motion without actual pointer movement cannot change Hover
state. Face switching needs both a real hit on another face and the 6 px
threshold, then the same 250 ms delay.

`releaseHoverFocus()` is the shared committed-hover exit path. It clears
candidate and hold geometry, intent/focus classes, the cube hover class and
submenu pointer state, then calls `unfocusCube()` once if a committed face was
focused. Real exits are window leave (except a held active Landing drag), blur,
hidden document and page scroll.

Desktop hover shares the existing window mouse-move route with drag. While a
mouse button is held, the previous `preventDefault()` and `moveDrag()` behavior
keeps priority; drag start clears hover. Landing-wide drag, auto-scroll
suppression, reverse motion, pitch limits/resistance, recoil and click threshold
remain intact. Face click/navigation, Enter, Space, Escape, touch/mobile and
reduced-motion behavior are retained. Submenu item pointer classes continue to
be maintained for any future submenu markup.

No SVG wireframe projection, visibility, animation-frame synchronization or
visual styling was changed. The CSS state-class WIP was already present at the
start of this finding and was preserved without visual changes.

### Verification and closure

`node --check js/modules/cube.js` and `git diff --check` passed. The local
Browser Preview loaded the Home page and rendered the cube, but its available
controls did not allow pointer-only movement. The owner subsequently reported
a manual PASS for all requested behavior and the finding is closed on that
owner report. Browser names and versions were not supplied. The detailed
regression checklist remains in `TESTING.md` for future changes. Final source
review after that report also resynchronized the pointer intent anchor when a
pending switch is cancelled but the previous face remains held; this small
bookkeeping adjustment passed static checks but was not separately exercised
in the Browser Preview.

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

## Desktop Landing drag and auto-scroll (2026-09-30)

**Status: Closed / Resolved.** The owner manually tested this implementation and reported PASS.

Desktop dragging is available across the Landing area, not only on the cube. Native browser drag and text selection could otherwise take over a vertical mouse gesture and cause page auto-scroll. During an active mouse drag, the window move handler prevents the native default and a capture-phase dragstart handler blocks browser drag initiation. A temporary cube-mouse-dragging class disables selection only for the duration of that gesture; page scrolling is not locked.

Pitch resistance ramps in after 56 degrees and approaches the hard -90/+90 degree limit. Vertical inertia is damped more strongly near the limit, while movement back toward the centre remains direct. The drag remains active until release rather than disengaging at the limit. Releasing beyond 62 degrees triggers a short recoil of up to 4.5 degrees toward the centre, with a floor at 56 degrees. The existing movement threshold keeps a stationary click available for face navigation.

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
