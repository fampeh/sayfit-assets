/**
 * The cube's outline, drawn as flat SVG instead of CSS borders.
 *
 * ---------------------------------------------------------------------------
 * Why
 * ---------------------------------------------------------------------------
 * A 1px CSS border on a 3D-transformed element is never a clean line. The
 * browser rasterises the element flat, at its untransformed size, and then the
 * GPU maps that bitmap onto the rotated quad with bilinear filtering. A
 * near-vertical edge lands across a column of pixels that were never sampled
 * for it, and you get the stepped, broken-up line. Removing the ancestor
 * `filter` (an earlier fix) helped, but it could not fix this: the resampling
 * is inherent to how a transformed layer is composited.
 *
 * So the linework stops being part of the 3D layer. This module computes where
 * the twelve cube edges land on screen and draws them as <line> elements in an
 * ordinary flat SVG sitting over the cube. SVG is rasterised by the main paint
 * with real geometric antialiasing, so every edge is a clean straight line at
 * any angle, at any zoom, on any screen density.
 *
 * The faces keep their text, their buttons and their links - they are still
 * DOM, still in the tab order, still readable by a screen reader and by
 * Google. Only the outline moved. That is the part of the "use canvas"
 * suggestion that was actually worth taking.
 *
 * ---------------------------------------------------------------------------
 * The projection has to match CSS exactly
 * ---------------------------------------------------------------------------
 * Otherwise the drawn outline drifts away from the faces it is supposed to
 * bound. CSS applies `perspective: 1000px` from the centre of .scene, and the
 * cube's transform is `rotateX(a) rotateY(b)` - which as a matrix is Rx·Ry, so
 * a point is rotated about Y first and about X second.
 *
 * Coordinates are CSS's: x right, y DOWN, z toward the viewer.
 */

/** Must match `perspective` in css/parts/cube.css. */
const PERSPECTIVE = 1000;

const SVG_NS = 'http://www.w3.org/2000/svg';

/* The eight corners of a unit cube, and the six faces as corner quads.
   Corner order within a face runs around its perimeter, so consecutive pairs
   (plus the wrap) are its four edges. */
const CORNERS = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // z = -1 (back)
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]      // z = +1 (front)
];

const FACES = [
  { corners: [4, 5, 6, 7], normal: [0, 0, 1] },   // front
  { corners: [1, 0, 3, 2], normal: [0, 0, -1] },  // back
  { corners: [5, 1, 2, 6], normal: [1, 0, 0] },   // right
  { corners: [0, 4, 7, 3], normal: [-1, 0, 0] },  // left
  { corners: [0, 1, 5, 4], normal: [0, -1, 0] },  // top    (y is down)
  { corners: [7, 6, 2, 3], normal: [0, 1, 0] }    // bottom
];

let svg = null;
let lines = [];
let half = 0;

/* -- Maths ------------------------------------------------------------------ */

function rotate(point, rotX, rotY) {
  const [x0, y0, z0] = point;

  // rotateY first, then rotateX - matching the order CSS composes them.
  const cy = Math.cos(rotY);
  const sy = Math.sin(rotY);
  const x = x0 * cy + z0 * sy;
  const z1 = -x0 * sy + z0 * cy;

  const cx = Math.cos(rotX);
  const sx = Math.sin(rotX);
  const y = y0 * cx - z1 * sx;
  const z = y0 * sx + z1 * cx;

  return [x, y, z];
}

function project(point) {
  // CSS perspective: everything nearer the viewer than the projection plane
  // is scaled up. At z = PERSPECTIVE it would be infinite, but a cube this
  // size never comes close.
  const scale = PERSPECTIVE / (PERSPECTIVE - point[2]);
  return [point[0] * scale, point[1] * scale];
}

/* -- Building --------------------------------------------------------------- */

/**
 * @param {HTMLElement} host  the element the SVG is appended to - it must be
 *                            the same box the cube is centred in.
 */
export function createOutline(host) {
  if (!host) return null;

  svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'cube-outline');
  // Hidden from assistive technology: it carries no information the faces do
  // not already carry as text.
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  // Twelve edges, allocated once and only ever repositioned. Rebuilding the
  // DOM every frame would be the one way to make this slower than borders.
  lines = Array.from({ length: 12 }, () => {
    const line = document.createElementNS(SVG_NS, 'line');
    svg.appendChild(line);
    return line;
  });

  host.appendChild(svg);
  resizeOutline(host);
  return svg;
}

/**
 * Re-read the cube's rendered size. The viewBox is centred on the cube's
 * centre, which means the projected coordinates can be written straight in
 * without any offset arithmetic.
 */
export function resizeOutline(host) {
  if (!svg || !host) return;
  const size = host.offsetWidth || 0;
  half = size / 2;
  svg.setAttribute('viewBox', `${-half} ${-half} ${size} ${size}`);
}

/* -- Drawing ---------------------------------------------------------------- */

/**
 * Redraw for the given rotation, in degrees. Called from cube.js on every
 * frame that moves the cube.
 */
export function drawOutline(rotXDeg, rotYDeg) {
  if (!svg || !half) return;

  const rotX = (rotXDeg * Math.PI) / 180;
  const rotY = (rotYDeg * Math.PI) / 180;

  const projected = CORNERS.map((corner) =>
    project(rotate([corner[0] * half, corner[1] * half, corner[2] * half], rotX, rotY))
  );

  // Only draw edges that belong to a face turned toward the viewer. This is
  // what makes the cube read as solid rather than as a wireframe, and it
  // matches `backface-visibility: hidden` on the faces themselves - the two
  // would otherwise disagree about what is visible.
  const visibleEdges = new Set();

  FACES.forEach((face) => {
    const normal = rotate(face.normal, rotX, rotY);
    if (normal[2] <= 0) return;

    for (let i = 0; i < 4; i += 1) {
      const a = face.corners[i];
      const b = face.corners[(i + 1) % 4];
      // Sorted so an edge shared by two visible faces is stored once.
      visibleEdges.add(a < b ? `${a},${b}` : `${b},${a}`);
    }
  });

  let index = 0;
  visibleEdges.forEach((key) => {
    const [a, b] = key.split(',').map(Number);
    const line = lines[index];
    index += 1;
    if (!line) return;

    line.setAttribute('x1', projected[a][0].toFixed(2));
    line.setAttribute('y1', projected[a][1].toFixed(2));
    line.setAttribute('x2', projected[b][0].toFixed(2));
    line.setAttribute('y2', projected[b][1].toFixed(2));
    line.style.display = '';
  });

  // A cube seen face-on shows fewer than the usual nine edges; park the rest.
  for (let i = index; i < lines.length; i += 1) {
    lines[i].style.display = 'none';
  }
}
