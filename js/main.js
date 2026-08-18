/**
 * Entry point.
 *
 * This file does no work of its own. It decides the order things start in,
 * and wires the few places where one module has to tell another something.
 * Everything else lives in js/modules/, one concern per file.
 *
 * Loaded as <script type="module">, which means it is deferred automatically
 * and runs after the document has been parsed. It also means the site must be
 * served over http:// - opening index.html straight off the disk will fail
 * on the module imports. Use start-server.bat.
 */

import { prefersReducedMotion } from './modules/config.js';
import {
  detectLanguage,
  loadLanguage,
  initLanguageSwitch,
  onLanguageChange,
  t
} from './modules/i18n.js';
import { initScroll, handleScroll } from './modules/scroll.js';
import { initNav, closeStickyMenus, closeMobileMenu } from './modules/nav.js';
import { initCube, bindHomeCube, closeAllFaces } from './modules/cube.js';
import { loadProjectData } from './modules/project-data.js';
import { initSliders, rebuildSliders, refreshSliderText } from './modules/slider.js';
import { initModal, closeModal, refreshModalLabels } from './modules/modal.js';
import { initApps, refreshApps } from './modules/apps.js';
import { showToast } from './modules/toast.js';

/* -- Page state ------------------------------------------------------------- */

// Reloading the page should put you back at the cube, not halfway down the
// page where the browser last saw you.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const navigationEntry = performance.getEntriesByType('navigation')[0];
if (navigationEntry?.type === 'reload' && !window.location.hash) {
  window.scrollTo(0, 0);
}

/* -- Boot ------------------------------------------------------------------- */

async function boot() {
  // Prime the logo's draw-on animation: each stroke is dashed to its own
  // length so the CSS keyframes can walk the dash offset back to zero.
  document.querySelectorAll('.stroke').forEach((path) => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
  });

  // Language first: everything built afterwards is built in the right one.
  await loadLanguage(detectLanguage());
  document.body.removeAttribute('data-i18n-pending');

  initScroll();
  initNav();
  initCube();
  initModal();
  refreshModalLabels();

  bindHomeCube(document.getElementById('homeCube'));
  initLanguageSwitch(document.getElementById('langSwitch'));

  initApps();

  try {
    const projectData = await loadProjectData();
    initSliders(projectData);
  } catch (error) {
    console.error('Project data could not be loaded.', error);
    showToast(t('slider.loadError') || 'Projects could not be loaded.');
  }

  handleScroll();
}

/* -- Cross-module wiring ---------------------------------------------------- */

onLanguageChange(() => {
  refreshApps();
  refreshSliderText();
  refreshModalLabels();
});

// One Escape closes whatever is open, outermost first.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeModal();
  closeAllFaces();
  closeStickyMenus();
  closeMobileMenu();
});

// The carousel radius is derived from its rendered width, so it has to be
// recomputed when that width changes. Debounced: resize fires continuously
// while a window is being dragged, and each rebuild re-creates every slide.
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(rebuildSliders, 250);
});

if (prefersReducedMotion) {
  document.documentElement.classList.add('reduced-motion');
}

boot();
