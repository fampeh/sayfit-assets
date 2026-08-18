/**
 * The project lightbox.
 *
 * Three things were added here on 2026-08-18 that a dialog needs and this one
 * did not have:
 *
 *   - the page behind it stops scrolling while it is open (body.modal-open),
 *   - keyboard focus is trapped inside it, so Tab cannot wander off into the
 *     page underneath,
 *   - focus returns to whatever opened it when it closes.
 *
 * Without those, a keyboard or screen-reader visitor could tab into content
 * they could not see, and a phone visitor scrolled the page out from under
 * the dialog while trying to swipe between photographs.
 */

import { t } from './i18n.js';

/** Set by the carousel so the lightbox can offer a link to the full page. */
let projectPageLink = null;

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

let modal = null;
let mainMedia = null;
let thumbnails = null;
let yearEl = null;
let titleEl = null;
let descEl = null;
let counterEl = null;

let project = null;
let mediaIndex = 0;
let lastFocused = null;

/* -- Rendering -------------------------------------------------------------- */

function setMainMedia(item, altText) {
  if (!item) return;
  mainMedia.replaceChildren();

  const el = document.createElement(item.type === 'video' ? 'video' : 'img');
  el.src = item.src;

  if (item.type === 'video') {
    el.controls = true;
    el.autoplay = true;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
  } else {
    el.loading = 'eager';
    el.alt = altText;
  }

  mainMedia.appendChild(el);
}

function updateActiveThumbnail() {
  Array.from(thumbnails.children).forEach((child, i) => {
    const active = i === mediaIndex;
    child.classList.toggle('active', active);
    child.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

function updateCounter() {
  if (!counterEl || !project) return;
  const total = project.media.length;
  counterEl.textContent = total > 1 ? `${mediaIndex + 1} / ${total}` : '';
}

function buildThumbnails() {
  thumbnails.replaceChildren();

  project.media.forEach((item, index) => {
    // A button, not a div: it is clickable, so it must be reachable by Tab
    // and operable with Enter and Space without any extra code.
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'thumb-wrapper';
    thumb.setAttribute('aria-label', `${index + 1} / ${project.media.length}`);

    const el = document.createElement(item.type === 'video' ? 'video' : 'img');
    el.src = item.src;
    if (item.type === 'video') {
      el.muted = true;
      el.playsInline = true;
    } else {
      el.loading = 'lazy';
      el.alt = '';
    }
    thumb.appendChild(el);

    thumb.addEventListener('click', () => {
      mediaIndex = index;
      updateActiveThumbnail();
      setMainMedia(item, project.title || '');
      updateCounter();
    });

    thumbnails.appendChild(thumb);
  });
}

/* -- Open / close ----------------------------------------------------------- */

export function openProjectModal(nextProject) {
  if (!modal || !nextProject || !nextProject.media?.length) return;

  lastFocused = document.activeElement;
  project = nextProject;
  // Gallery pages open the viewer on the photograph that was clicked; the
  // carousel always opens on the cover.
  mediaIndex = Number.isInteger(nextProject.startIndex)
    ? Math.min(Math.max(nextProject.startIndex, 0), nextProject.media.length - 1)
    : 0;

  yearEl.textContent = project.year || '';
  titleEl.textContent = project.title || '';
  descEl.textContent = project.desc || '';
  setProjectPageLink(nextProject.pageUrl);

  buildThumbnails();
  updateActiveThumbnail();
  setMainMedia(project.media[mediaIndex], project.title || '');
  updateCounter();

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  document.getElementById('closeModal')?.focus();
}

/**
 * Show or hide the "view project page" link. The carousel passes a URL; the
 * project pages themselves pass nothing, because you are already there.
 */
function setProjectPageLink(url) {
  if (!projectPageLink) return;
  if (!url) {
    projectPageLink.hidden = true;
    projectPageLink.removeAttribute('href');
    return;
  }
  projectPageLink.hidden = false;
  projectPageLink.href = url;
  projectPageLink.textContent = t('project.viewProject') || 'View project page';
}

export function closeModal() {
  if (!modal || !modal.classList.contains('open')) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  // Clearing the media stops any playing video and releases its buffer.
  mainMedia.replaceChildren();
  thumbnails.replaceChildren();
  project = null;

  if (lastFocused instanceof HTMLElement) lastFocused.focus();
  lastFocused = null;
}

export function isModalOpen() {
  return Boolean(modal && modal.classList.contains('open'));
}

/* -- Navigation ------------------------------------------------------------- */

function navigate(direction) {
  if (!project) return;
  const total = project.media.length;
  if (total <= 1) return;

  mediaIndex = (mediaIndex + direction + total) % total;

  setMainMedia(project.media[mediaIndex], project.title || '');
  updateActiveThumbnail();
  updateCounter();

  thumbnails.children[mediaIndex]?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center'
  });
}

/**
 * Keep Tab inside the dialog. Without this, tabbing past the last control
 * lands on the page behind, which is invisible and inert.
 */
function trapFocus(event) {
  const focusable = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null
  );
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* -- Wiring ----------------------------------------------------------------- */

export function initModal() {
  modal = document.getElementById('projectModal');
  if (!modal) return;

  mainMedia = document.getElementById('modalMainMedia');
  thumbnails = document.getElementById('modalThumbnails');
  yearEl = document.getElementById('modalYear');
  titleEl = document.getElementById('modalTitle');
  descEl = document.getElementById('modalDesc');
  counterEl = document.getElementById('modalCounter');
  projectPageLink = document.getElementById('modalProjectLink');

  document.getElementById('closeModal')?.addEventListener('click', closeModal);
  document.getElementById('modalPrev')?.addEventListener('click', () => navigate(-1));
  document.getElementById('modalNext')?.addEventListener('click', () => navigate(1));

  // Clicking the dark surround closes; clicking the panel does not.
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (!isModalOpen()) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        navigate(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        navigate(1);
        break;
      case 'Escape':
        closeModal();
        break;
      case 'Tab':
        trapFocus(event);
        break;
      default:
        break;
    }
  });

  // Swipe between photographs on touch.
  let touchStartX = 0;
  mainMedia.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });

  mainMedia.addEventListener('touchend', (event) => {
    const diff = touchStartX - event.changedTouches[0].screenX;
    if (Math.abs(diff) > 60) navigate(diff > 0 ? 1 : -1);
  });

  // Drag the thumbnail strip sideways with a mouse.
  let dragging = false;
  let dragStartX = 0;
  let dragStartScroll = 0;

  thumbnails.addEventListener('mousedown', (event) => {
    dragging = true;
    dragStartX = event.pageX - thumbnails.offsetLeft;
    dragStartScroll = thumbnails.scrollLeft;
  });

  const stopDrag = () => { dragging = false; };
  thumbnails.addEventListener('mouseleave', stopDrag);
  thumbnails.addEventListener('mouseup', stopDrag);

  thumbnails.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    event.preventDefault();
    const x = event.pageX - thumbnails.offsetLeft;
    thumbnails.scrollLeft = dragStartScroll - (x - dragStartX) * 2;
  });
}

/** Re-label the controls after a language switch. */
export function refreshModalLabels() {
  document.getElementById('closeModal')?.setAttribute('aria-label', t('modal.close') || 'Close');
  document.getElementById('modalPrev')?.setAttribute('aria-label', t('modal.prev') || 'Previous');
  document.getElementById('modalNext')?.setAttribute('aria-label', t('modal.next') || 'Next');
}
