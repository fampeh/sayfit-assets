/**
 * The landing cube.
 *
 * ---------------------------------------------------------------------------
 * Why this is CSS 3D and not a <canvas>
 * ---------------------------------------------------------------------------
 * A canvas would give us full control of the rasteriser, but the cube is not
 * a picture - it is the site's main menu. Its faces contain real headings,
 * real buttons and real links. On canvas all of that would have to be redrawn
 * as pixels: no text selection, no tab order, no screen reader, no search
 * engine reading the words "Work" and "About", and every label re-rendered at
 * every zoom level. That is a large loss to fix an edge-quality problem that
 * had a different cause.
 *
 * The ragged edges were not CSS 3D being imprecise. `.scene` carried a
 * `filter: blur()` for its entrance animation, and a filter on an ancestor of
 * a 3D scene forces the browser to flatten the whole subtree into one bitmap
 * and transform that bitmap - so every 1px border was being resampled at an
 * angle. Dropping the filter once the intro is over (the `settled` class)
 * puts the borders back into the normal paint, where they are antialiased
 * properly. See css/parts/cube.css.
 *
 * ---------------------------------------------------------------------------
 * Why labels never appear mirrored any more
 * ---------------------------------------------------------------------------
 * That was `backface-visibility` defaulting to `visible`: you were seeing the
 * inside of the far faces through the near ones. Fixed in CSS, not here.
 *
 * Upside-down text is prevented here instead, by clamping pitch - see
 * clampPitch() below.
 *
 * ---------------------------------------------------------------------------
 * How the motion is built
 * ---------------------------------------------------------------------------
 * Three layers, and it matters that they are separate:
 *
 *   1. A requestAnimationFrame loop sets rotX/rotY every frame.
 *   2. A short CSS transition on .cube smooths between those frames. This is
 *      what gives the cube its fluid, slightly-trailing feel under the hand.
 *      It was briefly removed during a refactor and the cube immediately felt
 *      dry and mechanical - that transition is not incidental.
 *   3. When the cube turns ITSELF (hover, click, recoil) the transition is
 *      switched off, because the spring in the loop is already producing the
 *      easing and layering a transition on top makes it feel laggy and vague.
 */

import { prefersReducedMotion, isDesktop } from './config.js';
import { scrollToTarget } from './scroll.js';

/* -- Tuning ----------------------------------------------------------------- */

const DEFAULT_ROT_X = -25;
const DEFAULT_ROT_Y = 35;

const INTRO_DELAY = prefersReducedMotion ? 0 : 3200;
const INTRO_ROTATE = prefersReducedMotion ? 0 : 1600;

const DRAG_THRESHOLD = 8;      // px of travel before a press stops being a click
const HOVER_INTENT_DELAY = 250; // ms of hovering before the cube turns to a face

/* --- Pitch: how far the cube will tip -----------------------------------
   The cube may tip until a face is square to the camera (90 degrees, which is
   what brings About and Contact to the front) but never past it, because past
   it every label is upside down.

   PITCH_SOFT is where it starts to resist. PITCH_RELUCTANT is where it decides
   it does not want to go any further and will spring back on release - the
   "I would rather not turn over" behaviour. */
const PITCH_LIMIT = 90;
const PITCH_SOFT = 52;
const PITCH_RELUCTANT = 62;
const PITCH_REST = 34;      // where a reluctant cube settles back to

/* --- Spring used when the cube turns itself to face something ------------
   Deliberately slow and heavy. A stiff spring here reads as a snap, which
   felt abrupt and cheap; this one has weight and takes its time. */
const SPRING_STIFFNESS = 0.048;
const SPRING_DAMPING = 0.875;
const SPRING_SETTLED = 0.05;

/* --- Recoil: softer and slower still, so the refusal reads as reluctance
   rather than as a bounce. */
const RECOIL_STIFFNESS = 0.030;
const RECOIL_DAMPING = 0.90;

/* --- Free motion --------------------------------------------------------- */
const INERTIA_DECAY = 0.965;    // 1.0 would never stop
const DRAG_SENSITIVITY = 0.4;   // degrees of turn per pixel of drag

/* --- Idle drift. Two speeds that do not divide evenly, so the cube never
   repeats the same pose on a loop and reads as alive rather than motorised. */
const DRIFT_YAW = 0.06;
const DRIFT_PITCH = 0.022;
const DRIFT_WOBBLE = 0.4;

/* -- State ------------------------------------------------------------------ */

let scene = null;
let cube = null;
let landing = null;
let faces = [];

let rotX = 0, rotY = 0;
let velX = 0, velY = 0;
let dragging = false;
let lastX = 0, lastY = 0;
let dragDistance = 0;
let autoSpin = false;

let targetRotX = 0, targetRotY = 0;
let springVelX = 0, springVelY = 0;
let isFocusingFace = false;
let isReturningFromFocus = false;
let isRecoiling = false;

let savedRotX = 0, savedRotY = 0;
let savedVelX = 0, savedVelY = 0;
let savedAutoSpin = false;

let pendingFaceScroll = null; // { target: string, isMobile: boolean }
let hoverIntentTimer = null;
let driftClock = 0;

/* -- Maths ------------------------------------------------------------------ */

const FACE_ANGLES = {
  front:  { rotX: 0,   rotY: 0 },
  back:   { rotX: 0,   rotY: 180 },
  left:   { rotX: 0,   rotY: 90 },
  right:  { rotX: 0,   rotY: -90 },
  top:    { rotX: -90, rotY: 0 },
  bottom: { rotX: 90,  rotY: 0 }
};

/**
 * Turn toward `target` the short way round, so a cube sitting at 350 degrees
 * asked to go to 10 turns forward 20 rather than backward 340.
 */
function nearestAngle(current, target) {
  const delta = ((((target - current) % 360) + 540) % 360) - 180;
  return current + delta;
}

/**
 * Keep pitch inside +/-90 so text is never upside down, with the last 20
 * degrees compressed so the cube eases into the limit instead of stopping
 * dead. The curve approaches PITCH_LIMIT asymptotically and never crosses it.
 *
 * Only applied to hand-driven rotation. When the cube turns itself to show
 * the About or Contact face it needs exactly +/-90, which this would prevent.
 */
function clampPitch(value) {
  const magnitude = Math.abs(value);
  if (magnitude <= PITCH_SOFT) return value;

  const range = PITCH_LIMIT - PITCH_SOFT;
  const over = magnitude - PITCH_SOFT;
  const eased = range * (1 - Math.exp(-over / range));
  return Math.sign(value) * (PITCH_SOFT + eased);
}

/**
 * The CSS transition is what smooths the per-frame updates while the cube is
 * being pushed around. It has to be off while a spring is running, or the two
 * easings compound and the motion turns to mush.
 */
function setSmoothing(on) {
  if (!cube) return;
  cube.classList.toggle('no-cube-transition', !on);
}

function render() {
  if (!cube) return;
  cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
}

/* -- Faces ------------------------------------------------------------------ */

export function closeAllFaces() {
  faces.forEach((face) => {
    face.classList.remove('active');
    if (face.classList.contains('has-sub')) {
      face.setAttribute('aria-expanded', 'false');
    }
  });
}

export function resetCube() {
  rotX = DEFAULT_ROT_X;
  rotY = DEFAULT_ROT_Y;
  velX = velY = 0;
  springVelX = springVelY = 0;
  isFocusingFace = false;
  isReturningFromFocus = false;
  isRecoiling = false;
  pendingFaceScroll = null;
  setSmoothing(true);
  render();
  closeAllFaces();
}

/**
 * Everything that happens the instant the cube finishes turning to a face:
 * scroll to the section it stands for, or hand control back to free spin.
 *
 * Pulled out of the animation loop because under `prefers-reduced-motion`
 * there IS no animation loop - the cube jumps to its angle and this runs
 * straight away. Before that, a visitor with reduced motion turned on could
 * click a cube face and absolutely nothing happened.
 */
function onFocusArrived() {
  if (pendingFaceScroll) {
    scrollToTarget(pendingFaceScroll.target);
    if (pendingFaceScroll.isMobile) unfocusCube();
    pendingFaceScroll = null;
    return;
  }

  if (isReturningFromFocus) {
    isReturningFromFocus = false;
    autoSpin = savedAutoSpin;
    velX = savedVelX;
    velY = savedVelY;
    setSmoothing(true);
  }
}

function focusFace(face) {
  const target = FACE_ANGLES[face.dataset.faceOrient];
  if (!target) return;

  if (!isFocusingFace && !isReturningFromFocus) {
    savedRotX = rotX;
    savedRotY = rotY;
    savedVelX = velX;
    savedVelY = velY;
    savedAutoSpin = autoSpin;

    autoSpin = false;
    velX = velY = 0;
    springVelX = springVelY = 0;
    dragging = false;
    setSmoothing(false);
  }

  isRecoiling = false;
  targetRotX = nearestAngle(rotX, target.rotX);
  targetRotY = nearestAngle(rotY, target.rotY);
  isFocusingFace = true;
  isReturningFromFocus = false;

  if (prefersReducedMotion) {
    rotX = targetRotX;
    rotY = targetRotY;
    render();
    onFocusArrived();
  }
}

function unfocusCube() {
  if (!isFocusingFace || isReturningFromFocus) return;

  isFocusingFace = false;
  isReturningFromFocus = true;
  targetRotX = savedRotX;
  targetRotY = savedRotY;
  springVelX = springVelY = 0;

  if (prefersReducedMotion) {
    rotX = targetRotX;
    rotY = targetRotY;
    render();
    onFocusArrived();
  }
}

/**
 * The cube declining to turn over.
 *
 * Once it has been pushed past PITCH_RELUCTANT it has already been fighting
 * back (clampPitch), and letting go now eases it back to a comfortable angle
 * rather than leaving it stranded on its side. The spring is slower than the
 * one used for menus, so it reads as "I would rather not" and not as a bounce.
 */
function startRecoil() {
  if (isFocusingFace || isReturningFromFocus) return;
  if (Math.abs(rotX) <= PITCH_RELUCTANT) return;

  isRecoiling = true;
  autoSpin = false;
  velX = velY = 0;
  springVelX = springVelY = 0;
  setSmoothing(false);

  targetRotX = Math.sign(rotX) * PITCH_REST;
  targetRotY = rotY; // it objects to being turned over, not to being spun

  if (prefersReducedMotion) {
    rotX = targetRotX;
    render();
    isRecoiling = false;
    setSmoothing(true);
  }
}

/* -- Dragging --------------------------------------------------------------- */

function startDrag(x, y) {
  if (isFocusingFace || isReturningFromFocus || isRecoiling) {
    isFocusingFace = false;
    isReturningFromFocus = false;
    isRecoiling = false;
    setSmoothing(true);
  }
  pendingFaceScroll = null;
  autoSpin = false;
  dragging = true;
  lastX = x;
  lastY = y;
  dragDistance = 0;
}

function moveDrag(x, y) {
  if (!dragging) return;

  const dx = x - lastX;
  const dy = y - lastY;
  dragDistance += Math.abs(dx) + Math.abs(dy);

  velY = dx * DRAG_SENSITIVITY;
  velX = dy * DRAG_SENSITIVITY;

  rotY += velY;
  rotX = clampPitch(rotX - velX);
  render();

  lastX = x;
  lastY = y;
}

function endDrag() {
  if (!dragging) return;
  dragging = false;
  startRecoil();
}

/* -- The loop --------------------------------------------------------------- */

function stepSpring(stiffness, damping) {
  springVelX = (springVelX + (targetRotX - rotX) * stiffness) * damping;
  springVelY = (springVelY + (targetRotY - rotY) * stiffness) * damping;

  rotX += springVelX;
  rotY += springVelY;

  return (
    Math.abs(targetRotX - rotX) < SPRING_SETTLED &&
    Math.abs(targetRotY - rotY) < SPRING_SETTLED &&
    Math.abs(springVelX) < SPRING_SETTLED &&
    Math.abs(springVelY) < SPRING_SETTLED
  );
}

function step() {
  if (!dragging) {
    if (isRecoiling) {
      if (stepSpring(RECOIL_STIFFNESS, RECOIL_DAMPING)) {
        rotX = targetRotX;
        rotY = targetRotY;
        springVelX = springVelY = 0;
        isRecoiling = false;
        autoSpin = true;
        setSmoothing(true);
      }
      render();
    } else if (isFocusingFace || isReturningFromFocus) {
      // A spring rather than a straight lerp: it arrives with a touch of
      // overshoot, which is what makes the turn feel like a physical object
      // settling instead of a value being interpolated.
      if (stepSpring(SPRING_STIFFNESS, SPRING_DAMPING)) {
        rotX = targetRotX;
        rotY = targetRotY;
        springVelX = springVelY = 0;
        onFocusArrived();
      }

      render();
    } else {
      if (autoSpin) {
        driftClock += 0.01;
        // The pitch drift breathes; the yaw drift is steady with a slow
        // modulation on top. Neither period is a multiple of the other, so
        // the cube does not visibly loop.
        rotY += DRIFT_YAW * (1 + DRIFT_WOBBLE * Math.sin(driftClock * 0.37));
        rotX = clampPitch(rotX + DRIFT_PITCH * Math.sin(driftClock * 0.61));
      }

      velX *= INERTIA_DECAY;
      velY *= INERTIA_DECAY;
      if (Math.abs(velX) < 0.01) velX = 0;
      if (Math.abs(velY) < 0.01) velY = 0;

      if (velX || velY) {
        rotY += velY;
        rotX = clampPitch(rotX - velX);
      }

      render();
    }
  }

  requestAnimationFrame(step);
}

/* -- Intro ------------------------------------------------------------------ */

function runIntroSequence() {
  scene.classList.add('active');
  document.body.classList.add('cube-intro', 'intro-stroke-off');
  render();

  const finish = () => {
    // Take the blur filter off the scene. This is what makes the cube's
    // edges crisp - see the note at the top of this file.
    scene.classList.add('settled');
    document.body.classList.remove('cube-intro');
    setSmoothing(true);
    autoSpin = true;
  };

  if (prefersReducedMotion) {
    rotX = DEFAULT_ROT_X;
    rotY = DEFAULT_ROT_Y;
    render();
    document.body.classList.add('float-on');
    document.body.classList.remove('intro-stroke-off');
    finish();
    // No loop runs under reduced motion, so leave the cube still. Everything
    // interactive still works: focusFace() jumps straight to its angle.
    autoSpin = false;
    return;
  }

  window.setTimeout(() => {
    rotX = DEFAULT_ROT_X;
    rotY = DEFAULT_ROT_Y;
    render();
    document.body.classList.add('float-on');
    document.body.classList.remove('intro-stroke-off');
  }, INTRO_DELAY);

  window.setTimeout(finish, INTRO_DELAY + INTRO_ROTATE);
}

/* -- Wiring ----------------------------------------------------------------- */

function bindFace(face) {
  if (isDesktop) {
    face.addEventListener('mouseenter', () => {
      if (dragging) return;
      clearTimeout(hoverIntentTimer);
      hoverIntentTimer = setTimeout(() => {
        cube.classList.add('hovering');
        focusFace(face);
      }, HOVER_INTENT_DELAY);
    });

    face.addEventListener('mouseleave', () => {
      clearTimeout(hoverIntentTimer);
      cube.classList.remove('hovering');
    });
  }

  face.addEventListener('click', (event) => {
    // A press that travelled is a drag, not a click.
    if (dragDistance > DRAG_THRESHOLD) return;

    const subItem = event.target.closest('.submenu-item');
    if (subItem) {
      if (subItem.dataset.target) scrollToTarget(subItem.dataset.target);
      closeAllFaces();
      if (!isDesktop) unfocusCube();
      return;
    }

    pendingFaceScroll = null;
    focusFace(face);

    if (face.classList.contains('has-sub')) {
      faces.forEach((other) => {
        if (other === face) return;
        other.classList.remove('active');
        other.setAttribute('aria-expanded', 'false');
      });

      const isActive = face.classList.toggle('active');
      face.setAttribute('aria-expanded', String(isActive));
      if (!isActive && !isDesktop) unfocusCube();
      return;
    }

    closeAllFaces();
    if (face.dataset.target) {
      pendingFaceScroll = { target: face.dataset.target, isMobile: !isDesktop };
      // Under reduced motion focusFace() has already arrived, so nothing
      // would ever consume this. Do it now.
      if (prefersReducedMotion) onFocusArrived();
    } else if (!isDesktop) {
      unfocusCube();
    }
  });

  face.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      face.click();
    }
    if (event.key === 'Escape') closeAllFaces();
  });
}

export function initCube() {
  scene = document.getElementById('scene');
  cube = document.getElementById('cube');
  landing = document.querySelector('.landing');
  faces = Array.from(document.querySelectorAll('.face'));

  if (!scene || !cube) return;

  runIntroSequence();

  if (isDesktop) {
    window.addEventListener('mousedown', (event) => {
      if (!landing || !landing.contains(event.target)) return;
      startDrag(event.clientX, event.clientY);
    });
    window.addEventListener('mousemove', (event) => moveDrag(event.clientX, event.clientY));
    window.addEventListener('mouseup', endDrag);

    cube.addEventListener('mouseleave', () => {
      clearTimeout(hoverIntentTimer);
      unfocusCube();
    });
  }

  cube.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  cube.addEventListener('touchmove', (event) => {
    if (!dragging) return;
    // Only claim the gesture once it is clearly a turn, so a vertical flick
    // that happens to start on the cube still scrolls the page.
    if (dragDistance > 5 && event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, { passive: false });

  cube.addEventListener('touchend', endDrag);
  cube.addEventListener('touchcancel', endDrag);

  faces.forEach(bindFace);

  // Clicking anywhere off the cube closes any open face menu.
  document.addEventListener('click', (event) => {
    if (event.target.closest('.face')) return;
    closeAllFaces();
    pendingFaceScroll = null;
    if (!isDesktop) unfocusCube();
  });

  if (!prefersReducedMotion) requestAnimationFrame(step);
}

/** Used by the little header cube, which sends you back to the top. */
export function bindHomeCube(button) {
  if (!button) return;
  button.addEventListener('click', () => {
    resetCube();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
}
