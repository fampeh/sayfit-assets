/**
 * Entry point for the generated project and category pages.
 *
 * Much smaller than main.js: these pages have no cube and no carousel. They
 * need the translation pass, the header, and the lightbox - so that clicking a
 * photograph on a project page opens the same viewer it does on the home page,
 * rather than being a different experience for no reason.
 *
 * The pages themselves are written by tools/generate_project_pages.py.
 */

import { detectLanguage, loadLanguage, initLanguageSwitch } from './modules/i18n.js';
import { initNav } from './modules/nav.js';
import { initModal, openProjectModal, refreshModalLabels } from './modules/modal.js';

/**
 * Read the gallery back out of the DOM instead of re-fetching projects.json.
 *
 * The page already contains every image, with its src and its order, written
 * there by the generator - so it is the authoritative copy, it is already
 * loaded, and using it means a project page works even if projects.json is
 * momentarily missing from the server after a partial upload.
 */
function collectMedia() {
  return Array.from(document.querySelectorAll('.project-page-shot')).map((button) => {
    const el = button.querySelector('img, video');
    return {
      type: el && el.tagName === 'VIDEO' ? 'video' : 'image',
      src: el ? el.getAttribute('src') : ''
    };
  }).filter((item) => item.src);
}

function initGallery() {
  const shots = Array.from(document.querySelectorAll('.project-page-shot'));
  if (!shots.length) return;

  const media = collectMedia();
  const project = {
    title: document.querySelector('.project-page-title')?.textContent.trim() || '',
    year: document.querySelector('.project-page-year')?.textContent.trim() || '',
    desc: document.querySelector('.project-page-desc')?.textContent.trim() || '',
    media
  };

  shots.forEach((button, index) => {
    button.addEventListener('click', () => {
      // Open the lightbox already showing the photograph that was clicked,
      // not always the first one.
      openProjectModal({ ...project, startIndex: index });
    });
  });
}

async function boot() {
  await loadLanguage(detectLanguage());
  document.body.removeAttribute('data-i18n-pending');

  initNav();
  initModal();
  refreshModalLabels();
  initLanguageSwitch(document.getElementById('langSwitch'));
  initGallery();
}

boot();
