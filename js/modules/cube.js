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
 * Face borders are not used for the wireframe: transformed thin borders and
 * overlapping face borders produced inconsistent rasterization across
 * browsers. The visible edges are projected into a screen-space SVG overlay;
 * see updateWireframe() and css/parts/cube.css.
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
 *   3. Hover and click use the legacy 0.12 interpolation per frame, with
 *      the CSS transition switched off. Pitch alone is limited to +/-90.
 */

import { prefersReducedMotion, isDesktop } from './config.js';
import { scrollToTarget } from './scroll.js';

/* -- Tuning ----------------------------------------------------------------- */

const DEFAULT_ROT_X = -25;
const DEFAULT_ROT_Y = 35;

const INTRO_DELAY = prefersReducedMotion ? 0 : 3200;
const INTRO_ROTATE = prefersReducedMotion ? 0 : 1600;

const DRAG_THRESHOLD = 8;      // px of travel before a press stops being a click
const HOVER_INTENT_DELAY = 250; // ms, matching old/SayfitWebsite/js/script.js

/* Vertical drag resistance, hard pitch safety limit and local recoil tuning. */
const PITCH_LIMIT = 90;
const PITCH_RESISTANCE_START = 56;
const PITCH_RECOIL_START = 62;
const RECOIL_DISTANCE = 4.5;
const RECOIL_LERP = 0.1;
const FOCUS_LERP = 0.12;
const FOCUS_SETTLED = 0.02;

/* --- Free motion --------------------------------------------------------- */
const INERTIA_DECAY = 0.92;    // legacy inertia
const DRAG_SENSITIVITY = 0.4;   // degrees of turn per pixel of drag

const DRIFT_YAW = 0.08;
const DRIFT_PITCH = 0.03;

/* -- State ------------------------------------------------------------------ */

let scene = null;
let cube = null;
let wireframe = null;
let landing = null;
let faces = [];
let wireframeWidth = 0;
let wireframeHeight = 0;
let perspectiveDistance = 1000;
let edgeLines = [];

const FACE_NORMALS = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, -1, 0],
  bottom: [0, 1, 0]
};

const FACE_BY_AXIS_SIGN = {
  x: { '-1': 'left', '1': 'right' },
  y: { '-1': 'top', '1': 'bottom' },
  z: { '-1': 'back', '1': 'front' }
};

const CUBE_AXES = ['x', 'y', 'z'];

function createWireframe() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('cube-edge-overlay');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('viewBox', `0 0 ${wireframeWidth} ${wireframeHeight}`);

  edgeLines = [];
  CUBE_AXES.forEach((variableAxis) => {
    const fixedAxes = CUBE_AXES.filter((axis) => axis !== variableAxis);
    [-1, 1].forEach((firstSign) => {
      [-1, 1].forEach((secondSign) => {
        const firstVertex = { x: 0, y: 0, z: 0 };
        const secondVertex = { x: 0, y: 0, z: 0 };
        firstVertex[variableAxis] = -1;
        secondVertex[variableAxis] = 1;
        firstVertex[fixedAxes[0]] = secondVertex[fixedAxes[0]] = firstSign;
        firstVertex[fixedAxes[1]] = secondVertex[fixedAxes[1]] = secondSign;

        const facesForEdge = fixedAxes.map((axis, index) =>
          FACE_BY_AXIS_SIGN[axis][String(index === 0 ? firstSign : secondSign)]
        );
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('vector-effect', 'non-scaling-stroke');
        line.setAttribute('visibility', 'hidden');
        svg.append(line);
        edgeLines.push({ line, firstVertex, secondVertex, faces: facesForEdge });
      });
    });
  });

  scene.append(svg);
  wireframe = svg;
}

function rotateVector([x, y, z], rotX, rotY) {
  const angleX = rotX * Math.PI / 180;
  const angleY = rotY * Math.PI / 180;
  const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
  const cosY = Math.cos(angleY), sinY = Math.sin(angleY);

  // Matches `rotateX(rotX) rotateY(rotY)` on .cube (rightmost first).
  const turnedX = cosY * x + sinY * z;
  const turnedY = y;
  const turnedZ = -sinY * x + cosY * z;
  return [
    turnedX,
    cosX * turnedY - sinX * turnedZ,
    sinX * turnedY + cosX * turnedZ
  ];
}

function getRenderedRotation() {
  // Read the rendered matrix so the SVG follows the cube's existing CSS
  // transition smoothing as well as the rotX/rotY state driving it.
  const transform = getComputedStyle(cube).transform;
  if (!transform || transform === 'none') return [rotX, rotY];

  try {
    const matrix = new DOMMatrixReadOnly(transform);
    return [
      Math.atan2(matrix.m23, matrix.m22) * 180 / Math.PI,
      Math.atan2(matrix.m31, matrix.m11) * 180 / Math.PI
    ];
  } catch (_) {
    return [rotX, rotY];
  }
}

function projectVertex(vertex, half, rotX, rotY) {
  const [x, y, z] = rotateVector(
    [vertex.x * half, vertex.y * half, vertex.z * half], rotX, rotY
  );
  const scale = perspectiveDistance / (perspectiveDistance - z);
  return [wireframeWidth / 2 + x * scale, wireframeHeight / 2 + y * scale];
}

function updateWireframe(renderedRotX = null, renderedRotY = null) {
  if (!wireframe || !wireframeWidth || !wireframeHeight) return;

  if (renderedRotX === null || renderedRotY === null) {
    [renderedRotX, renderedRotY] = getRenderedRotation();
  }
  const half = Math.min(wireframeWidth, wireframeHeight) / 2;
  const visibleFaces = new Set(Object.entries(FACE_NORMALS)
    // Perspective places the camera at z = perspectiveDistance. A face is
    // visible only when its plane faces that finite camera position. Testing
    // normal.z > 0 treats the camera as infinitely far away and briefly shows
    // rear edges that the nearer face still occludes at shallow angles.
    .filter(([, normal]) => {
      const rotatedNormal = rotateVector(normal, renderedRotX, renderedRotY);
      return rotatedNormal[2] * perspectiveDistance > half + 1e-6;
    })
    .map(([name]) => name));
  const projectedVertices = new Map();

  const projected = (vertex) => {
    const key = `${vertex.x},${vertex.y},${vertex.z}`;
    if (!projectedVertices.has(key)) {
      projectedVertices.set(key, projectVertex(vertex, half, renderedRotX, renderedRotY));
    }
    return projectedVertices.get(key);
  };

  edgeLines.forEach(({ line, firstVertex, secondVertex, faces: adjacentFaces }) => {
    const visible = adjacentFaces.some((face) => visibleFaces.has(face));
    line.setAttribute('visibility', visible ? 'visible' : 'hidden');
    if (!visible) return;

    const [x1, y1] = projected(firstVertex);
    const [x2, y2] = projected(secondVertex);
    line.setAttribute('x1', x1.toFixed(3));
    line.setAttribute('y1', y1.toFixed(3));
    line.setAttribute('x2', x2.toFixed(3));
    line.setAttribute('y2', y2.toFixed(3));
  });
}

function initWireframe() {
  wireframeWidth = scene.clientWidth;
  wireframeHeight = scene.clientHeight;
  perspectiveDistance = Number.parseFloat(getComputedStyle(scene).perspective) || 1000;
  createWireframe();
  updateWireframe();

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(([entry]) => {
      wireframeWidth = entry.contentRect.width;
      wireframeHeight = entry.contentRect.height;
      wireframe.setAttribute('viewBox', `0 0 ${wireframeWidth} ${wireframeHeight}`);
      perspectiveDistance = Number.parseFloat(getComputedStyle(scene).perspective) || 1000;
      updateWireframe();
    });
    observer.observe(scene);
  } else {
    window.addEventListener('resize', () => {
      wireframeWidth = scene.clientWidth;
      wireframeHeight = scene.clientHeight;
      wireframe.setAttribute('viewBox', `0 0 ${wireframeWidth} ${wireframeHeight}`);
      updateWireframe();
    }, { passive: true });
  }
}

let rotX = 0, rotY = 0;
let velX = 0, velY = 0;
let dragState = 'idle'; // idle | dragging
let lastX = 0, lastY = 0;
let dragDistance = 0;
let recoilPending = false;
let autoSpin = false;

let targetRotX = 0, targetRotY = 0;
let isFocusingFace = false;
let isReturningFromFocus = false;
let isRecoiling = false;

let savedRotX = 0, savedRotY = 0;
let savedVelX = 0, savedVelY = 0;
let savedAutoSpin = false;

let pendingFaceScroll = null; // { target: string, isMobile: boolean }
let hoverIntentTimer = null;
let smoothingEnabled = true;

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

/** Hard safety limit, including the top and bottom face targets. */
function clampPitch(value) {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, value));
}

/** Remaining pitch mobility falls smoothly as the cube approaches either pole. */
function pitchMobility(pitch) {
  const progress = Math.max(0, Math.abs(pitch) - PITCH_RESISTANCE_START) /
    (PITCH_LIMIT - PITCH_RESISTANCE_START);
  return Math.max(0.015, Math.exp(-4.2 * progress * progress));
}

function movePitch(delta) {
  if (!delta) return rotX;

  // Integrate in small input steps so one fast mouse event cannot skip the
  // resistance ramp. Inward movement stays direct; only outward movement is
  // reduced. This is math only and performs no layout reads.
  const steps = Math.max(1, Math.ceil(Math.abs(delta)));
  const step = delta / steps;
  let pitch = rotX;
  for (let index = 0; index < steps; index += 1) {
    const next = pitch + step;
    const outward = Math.abs(next) > Math.abs(pitch);
    pitch = clampPitch(pitch + step * (outward ? pitchMobility(pitch) : 1));
  }
  return pitch;
}

function pitchInertiaRetention(pitchDelta) {
  if (!pitchDelta || Math.abs(rotX + pitchDelta) <= Math.abs(rotX)) return 1;
  // Outward pitch energy is absorbed progressively, while inward recovery and
  // yaw keep the existing inertia decay.
  return 0.65 + 0.35 * pitchMobility(rotX);
}

function startRecoil() {
  if (isFocusingFace || isReturningFromFocus || Math.abs(rotX) <= PITCH_RECOIL_START) {
    recoilPending = false;
    return;
  }
  isRecoiling = true;
  recoilPending = false;
  autoSpin = false;
  velX = 0;
  targetRotX = Math.sign(rotX) * Math.max(
    PITCH_RESISTANCE_START,
    Math.abs(rotX) - RECOIL_DISTANCE
  );
  setSmoothing(false);
  if (prefersReducedMotion) {
    rotX = targetRotX;
    isRecoiling = false;
    setSmoothing(true);
    render();
  }
}

/**
 * The CSS transition is what smooths the per-frame updates while the cube is
 * being pushed around. It has to be off while focus interpolation runs, or the two
 * easings compound and the motion turns to mush.
 */
function setSmoothing(on) {
  if (!cube) return;
  smoothingEnabled = on;
  cube.classList.toggle('no-cube-transition', !on);
}

function render() {
  if (!cube) return;
  cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  // Focus/recoil motion has no CSS transition, so the state angles are the
  // exact rendered pose. Reduced-motion mode has no animation loop either.
  if (!smoothingEnabled || prefersReducedMotion) updateWireframe(rotX, rotY);
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
  clearTimeout(hoverIntentTimer);
  clearDragState();
  isRecoiling = false;
  rotX = DEFAULT_ROT_X;
  rotY = DEFAULT_ROT_Y;
  velX = velY = 0;
  isFocusingFace = false;
  isReturningFromFocus = false;
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
  isRecoiling = false;

  if (!isFocusingFace && !isReturningFromFocus) {
    savedRotX = rotX;
    savedRotY = rotY;
    savedVelX = velX;
    savedVelY = velY;
    savedAutoSpin = autoSpin;

    autoSpin = false;
    velX = velY = 0;
    clearDragState();
    setSmoothing(false);
  }

  targetRotX = target.rotX;
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

  if (prefersReducedMotion) {
    rotX = targetRotX;
    rotY = targetRotY;
    render();
    onFocusArrived();
  }
}

/* -- Dragging --------------------------------------------------------------- */

function clearDragState({ preserveRecoil = false } = {}) {
  dragState = 'idle';
  if (!preserveRecoil) recoilPending = false;
  document.body.classList.remove('cube-mouse-dragging');
}

function startDrag(x, y, source = 'mouse') {
  clearTimeout(hoverIntentTimer);
  if (isFocusingFace || isReturningFromFocus || isRecoiling) {
    isRecoiling = false;
    isFocusingFace = false;
    isReturningFromFocus = false;
    setSmoothing(true);
  }
  pendingFaceScroll = null;
  autoSpin = false;
  dragState = 'dragging';
  recoilPending = false;
  if (source === 'mouse') document.body.classList.add('cube-mouse-dragging');
  lastX = x;
  lastY = y;
  dragDistance = 0;
}

function moveDrag(x, y) {
  if (dragState !== 'dragging') return;

  const dx = x - lastX;
  const dy = y - lastY;
  dragDistance += Math.abs(dx) + Math.abs(dy);

  const requestedPitchDelta = -dy * DRAG_SENSITIVITY;
  const previousPitch = rotX;
  velY = dx * DRAG_SENSITIVITY;
  rotY += velY;
  rotX = movePitch(requestedPitchDelta);
  velX = -(rotX - previousPitch);
  render();

  lastX = x;
  lastY = y;
}

function endDrag() {
  if (dragState === 'idle') return;

  if (dragState === 'dragging') {
    const pitchDelta = -velX;
    const movingInward = pitchDelta * Math.sign(rotX) < 0;
    recoilPending = Math.abs(rotX) >= PITCH_RECOIL_START && !movingInward;
    clearDragState({ preserveRecoil: true });
  }
}

/* -- The loop --------------------------------------------------------------- */

function step() {
  // Sample the cube's already-rendered CSS-transition pose once per display
  // frame, before assigning the next target below. This keeps the screen-space
  // SVG on the same animation timestamp as the composited 3D faces, including
  // while pointer events are driving the cube and this loop skips state work.
  if (smoothingEnabled) updateWireframe();

  if (dragState !== 'dragging') {
    if (isRecoiling) {
      rotX += (targetRotX - rotX) * RECOIL_LERP;
      velY *= INERTIA_DECAY;
      if (Math.abs(velY) < 0.01) velY = 0;
      if (velY) rotY += velY;
      if (Math.abs(targetRotX - rotX) < FOCUS_SETTLED) {
        rotX = targetRotX;
        isRecoiling = false;
        autoSpin = true;
        setSmoothing(true);
      }
      render();
    } else if (isFocusingFace || isReturningFromFocus) {
      const diffX = targetRotX - rotX;
      const diffY = targetRotY - rotY;
      if (Math.abs(diffX) < FOCUS_SETTLED && Math.abs(diffY) < FOCUS_SETTLED) {
        rotX = targetRotX;
        rotY = targetRotY;
        onFocusArrived();
      } else {
        rotX += diffX * FOCUS_LERP;
        rotY += diffY * FOCUS_LERP;
      }

      render();
    } else {
      if (autoSpin) {
        rotY += DRIFT_YAW;
        rotX = movePitch(DRIFT_PITCH);
      }

      velX *= INERTIA_DECAY * pitchInertiaRetention(-velX);
      velY *= INERTIA_DECAY;
      if (Math.abs(velX) < 0.01) velX = 0;
      if (Math.abs(velY) < 0.01) velY = 0;

      if (velX || velY) {
        rotY += velY;
        const pitchDelta = -velX;
        rotX = movePitch(pitchDelta);
        if (Math.abs(rotX) >= PITCH_RECOIL_START &&
            pitchDelta * Math.sign(rotX) > 0) {
          recoilPending = true;
        }
      }

      if (recoilPending && velX === 0) startRecoil();

      render();
    }
  }

  requestAnimationFrame(step);
}

/* -- Intro ------------------------------------------------------------------ */

function runIntroSequence(skipIntro = false, delay = INTRO_DELAY) {
  if (skipIntro) {
    rotX = DEFAULT_ROT_X;
    rotY = DEFAULT_ROT_Y;
    scene.classList.add('active', 'settled');
    document.body.classList.add('float-on');
    autoSpin = !prefersReducedMotion;
    render();
    return;
  }
  scene.classList.add('active');
  document.body.classList.add('cube-intro', 'intro-stroke-off');
  render();

  const finish = () => {
    try { sessionStorage.setItem('sayfit:intro-seen', '1'); } catch (_) {}
    // End the scene's intro blur and reveal effects. The screen-space SVG
    // overlay, rather than transformed face borders, supplies the crisp edges.
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
  }, delay);

  window.setTimeout(finish, delay + INTRO_ROTATE);
}

/* -- Wiring ----------------------------------------------------------------- */

function bindFace(face) {
  if (isDesktop) {
    face.addEventListener('mouseenter', () => {
      if (dragState !== 'idle') return;
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
    if (event.detail > 0 && dragDistance > DRAG_THRESHOLD) return;

    const subItem = event.target.closest('.submenu-item');
    if (subItem) {
      if (subItem.dataset.target) scrollToTarget(subItem.dataset.target);
      closeAllFaces();
      if (!isDesktop) unfocusCube();
      return;
    }

    pendingFaceScroll = null;
    closeAllFaces();
    face.classList.add('active');

    if (face.dataset.target) {
      pendingFaceScroll = { target: face.dataset.target, isMobile: !isDesktop };
    }

    // Set the selected colour before the turn begins. On touch screens this
    // gives the tap a visible response throughout the turn and scroll.
    focusFace(face);

    if (!face.dataset.target && !isDesktop) {
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

let cubeIntroStarted = false;

export function startCubeIntro() {
  if (!scene || !cube || cubeIntroStarted) return;
  cubeIntroStarted = true;
  runIntroSequence(false, 0);
}

export function initCube({ skipIntro = false, deferIntro = false } = {}) {
  scene = document.getElementById('scene');
  cube = document.getElementById('cube');
  landing = document.querySelector('.landing');
  faces = Array.from(document.querySelectorAll('.face'));

  if (!scene || !cube) return;

  initWireframe();

  if (skipIntro) {
    cubeIntroStarted = true;
    runIntroSequence(true);
  } else if (!deferIntro) {
    cubeIntroStarted = true;
    runIntroSequence(false);
  } else {
    // Prepare the scene under the loader without starting the rotation clock.
    scene.classList.add('active');
    document.body.classList.add('cube-intro', 'intro-stroke-off');
    render();
  }

  if (isDesktop) {
    window.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      if (!landing || !landing.contains(event.target)) return;
      if (event.target.closest('a, button, input, select, textarea')) {
        dragDistance = 0;
        return;
      }
      startDrag(event.clientX, event.clientY);
    });
    window.addEventListener('mousemove', (event) => {
      if (!(event.buttons & 1)) {
        endDrag();
        return;
      }
      if (dragState === 'dragging' && event.cancelable) event.preventDefault();
      moveDrag(event.clientX, event.clientY);
    });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('blur', endDrag);
    window.addEventListener('mouseleave', (event) => {
      // Keep a held drag alive as the pointer leaves the viewport. If the
      // button is already up, clean up in case mouseup happened off-window.
      if (!(event.buttons & 1)) endDrag();
    });

    cube.addEventListener('mouseleave', () => {
      clearTimeout(hoverIntentTimer);
      unfocusCube();
    });
  }

  cube.addEventListener('touchstart', (event) => {
    if (event.target.closest('a, button, input, select, textarea')) {
      dragDistance = 0;
      return;
    }
    const touch = event.touches[0];
    startDrag(touch.clientX, touch.clientY, 'touch');
  }, { passive: true });

  cube.addEventListener('touchmove', (event) => {
    if (dragState !== 'dragging') return;
    // Only claim the gesture once it is clearly a turn, so a vertical flick
    // that happens to start on the cube still scrolls the page.
    if (dragDistance > 5 && event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, { passive: false });

  cube.addEventListener('touchend', endDrag);
  cube.addEventListener('touchcancel', endDrag);
  window.addEventListener('dragstart', (event) => {
    if (dragState === 'dragging') event.preventDefault();
  }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) endDrag();
  });

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
