/**
 * The 3D project carousels - one per work category.
 *
 * ---------------------------------------------------------------------------
 * A note on rotation direction, so nobody "fixes" it again
 * ---------------------------------------------------------------------------
 * The slides sit at rotateY(index * theta), so mathematically the slide that
 * faces the camera is the one where currentRotation === -index * theta. The
 * polygon navigator and the drag gesture both follow that.
 *
 * The prev/next buttons deliberately do NOT. They turn the drum the way the
 * button points: press the left-hand button and the carousel rolls to the
 * left. That is the studio's intended feel, confirmed 2026-08-18. It is not a
 * sign error. See docs/DECISIONS.md.
 */

import { t } from './i18n.js';
import { openProjectModal } from './modal.js';
import { projectPageUrl } from './slug.js';

/** root element -> state */
const sliderStates = new Map();

/* -- The little polygon that shows how many projects there are -------------- */

function buildPolygonNav(state) {
  const { polygonNav, projects, activeIndex } = state;
  if (!polygonNav || !projects.length) return;

  const total = projects.length;
  const size = 70;
  const center = size / 2;
  const radius = 24;

  const vertices = Array.from({ length: total }, (_, i) => {
    const angle = (i * 2 * Math.PI) / total - Math.PI / 2;
    return {
      x: (center + radius * Math.cos(angle)).toFixed(2),
      y: (center + radius * Math.sin(angle)).toFixed(2)
    };
  });

  const edges = vertices
    .map((point, i) => {
      const next = vertices[(i + 1) % total];
      const active = i === activeIndex ? ' active' : '';
      return `<line class="nav-edge${active}" data-index="${i}" x1="${point.x}" y1="${point.y}" x2="${next.x}" y2="${next.y}" />`;
    })
    .join('');

  polygonNav.innerHTML =
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow: visible;" aria-hidden="true">${edges}</svg>`;

  polygonNav.querySelectorAll('.nav-edge').forEach((edge) => {
    edge.addEventListener('click', (event) => {
      event.stopPropagation();
      rotateSliderTo(state, Number.parseInt(edge.dataset.index, 10));
    });
  });
}

/* -- Caption ---------------------------------------------------------------- */

function setSliderInfo(state) {
  const { projects, activeIndex, projectInfo } = state;
  if (!projectInfo || !projects.length) return;

  clearTimeout(state.infoTimer);
  projectInfo.classList.add('changing');

  // The caption fades out, swaps, and fades back in; 220ms matches the CSS.
  state.infoTimer = window.setTimeout(() => {
    const project = projects[activeIndex];
    projectInfo.querySelector('.project-year').textContent = project.year || '';
    projectInfo.querySelector('.project-title').textContent = project.title || '';
    projectInfo.querySelector('.project-desc').textContent = project.desc || '';
    projectInfo.classList.remove('changing');
  }, 220);
}

function renderSlider(state) {
  if (!state.carousel) return;
  state.carousel.style.transform =
    `translateZ(-${state.radius}px) rotateY(${state.currentRotation}deg)`;
}

function rotateSliderTo(state, targetIndex) {
  const total = state.projects.length;
  let diff = targetIndex - state.activeIndex;

  // Always take the short way round the drum.
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;

  state.currentRotation -= diff * state.theta;
  state.activeIndex = targetIndex;

  buildPolygonNav(state);
  setSliderInfo(state);
  renderSlider(state);
}

/* -- The nudge that shows the carousel can be turned ------------------------ */

function autoRotateDemo(state) {
  if (state.autoPlayed) return;
  state.autoPlayed = true;

  const sweep = -20;
  const duration = 800;
  const startRotation = state.currentRotation;
  let phase = 0;
  let startTime = null;

  const frame = (now) => {
    if (!state.demoAnimationId) return;
    if (!startTime) startTime = now;

    const progress = Math.min((now - startTime) / duration, 1);
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    if (phase === 0) {
      state.currentRotation = startRotation + sweep * ease;
      if (progress >= 1) {
        phase = 1;
        startTime = now;
      }
    } else {
      state.currentRotation = startRotation + sweep - sweep * ease;
      if (progress >= 1) {
        state.currentRotation = startRotation;
        renderSlider(state);
        state.demoAnimationId = null;
        return;
      }
    }

    renderSlider(state);
    state.demoAnimationId = requestAnimationFrame(frame);
  };

  state.demoAnimationId = requestAnimationFrame(frame);
}

/* -- Building slides -------------------------------------------------------- */

function buildSlides(state) {
  const { carousel, projects, sliderContainer } = state;

  state.radius = (sliderContainer.offsetWidth / 2) / Math.tan(Math.PI / projects.length);
  carousel.replaceChildren();

  projects.forEach((project, index) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.style.transform =
      `rotateY(${index * state.theta}deg) translateZ(${state.radius}px)`;

    const cover = project.media[0];
    const el = document.createElement(cover.type === 'video' ? 'video' : 'img');
    el.src = cover.src;

    if (cover.type === 'video') {
      el.muted = true;
      el.loop = true;
      el.autoplay = true;
      el.playsInline = true;
    } else {
      // Only the first cover is worth blocking on; the rest are off-screen
      // on the far side of the drum.
      el.loading = index === 0 ? 'eager' : 'lazy';
      el.alt = project.title || 'Project cover';
    }

    slide.appendChild(el);
    carousel.appendChild(slide);
  });

  buildPolygonNav(state);

  // Place the drum without animating from wherever it happened to be.
  carousel.style.transition = 'none';
  renderSlider(state);
  void carousel.offsetHeight; // force the style to flush before re-enabling
  carousel.style.transition = '';
}

/* -- Empty state ------------------------------------------------------------
   A category whose folder has no photographs yet used to render a silent
   blank box. Now it says so. */

function renderEmptyState(root) {
  const frame = root.querySelector('.slider-frame');
  if (frame) frame.hidden = true;

  let note = root.querySelector('.slider-empty');
  if (!note) {
    note = document.createElement('p');
    note.className = 'slider-empty';
    note.dataset.i18n = 'slider.empty';
    root.appendChild(note);
  }
  note.textContent = t('slider.empty') || '';
}

/* -- Initialising one slider ------------------------------------------------ */

function initSlider(root, projectData) {
  const key = root.dataset.slider;
  const projects = projectData[key] || [];

  const carousel = root.querySelector('.carousel');
  const sliderContainer = root.querySelector('.slider-container');
  const projectInfo = root.querySelector('.project-info');
  const polygonNav = root.querySelector('.polygon-nav');
  const prevBtn = root.querySelector('.prev-btn');
  const nextBtn = root.querySelector('.next-btn');

  if (!carousel || !sliderContainer || !projectInfo || !polygonNav) return;

  if (!projects.length) {
    renderEmptyState(root);
    return;
  }

  const state = {
    root, projects, carousel, sliderContainer, projectInfo, polygonNav,
    activeIndex: 0,
    currentRotation: 0,
    radius: 0,
    theta: 360 / projects.length,
    isDragging: false,
    startX: 0,
    startY: 0,
    dragDeltaX: 0,
    isScrollingVertically: false,
    clickedIdx: -1,
    infoTimer: null,
    autoPlayed: false,
    demoAnimationId: null
  };

  sliderStates.set(root, state);

  buildSlides(state);
  setSliderInfo(state);

  /* --- Buttons. The sign here is intentional; see the header comment. --- */

  prevBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    state.currentRotation -= state.theta;
    state.activeIndex = (state.activeIndex - 1 + projects.length) % projects.length;
    buildPolygonNav(state);
    setSliderInfo(state);
    renderSlider(state);
  });

  nextBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    state.currentRotation += state.theta;
    state.activeIndex = (state.activeIndex + 1) % projects.length;
    buildPolygonNav(state);
    setSliderInfo(state);
    renderSlider(state);
  });

  /* --- Drag --- */

  sliderContainer.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.nav-btn')) return;

    if (state.demoAnimationId) {
      cancelAnimationFrame(state.demoAnimationId);
      state.demoAnimationId = null;
      state.currentRotation = -state.activeIndex * state.theta;
      renderSlider(state);
    }

    state.isDragging = true;
    state.isScrollingVertically = false;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.dragDeltaX = 0;
    carousel.classList.add('dragging');

    const clickedSlide = event.target.closest('.slide');
    state.clickedIdx = clickedSlide
      ? Array.from(carousel.querySelectorAll('.slide')).indexOf(clickedSlide)
      : -1;

    try {
      sliderContainer.setPointerCapture(event.pointerId);
    } catch {
      /* Safari can refuse capture on an already-released pointer. Harmless. */
    }
  });

  sliderContainer.addEventListener('pointermove', (event) => {
    if (!state.isDragging) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    // A mostly-vertical gesture is the visitor scrolling the page, not
    // turning the carousel. Hand it back.
    if (!state.isScrollingVertically &&
        Math.abs(deltaY) > Math.abs(deltaX) &&
        Math.abs(deltaY) > 6) {
      state.isScrollingVertically = true;
      state.isDragging = false;
      carousel.classList.remove('dragging');
      renderSlider(state);
      return;
    }

    if (state.isScrollingVertically) return;
    if (event.cancelable) event.preventDefault();

    state.dragDeltaX = deltaX;
    const moveRotation = (deltaX / sliderContainer.offsetWidth) * state.theta;
    carousel.style.transform =
      `translateZ(-${state.radius}px) rotateY(${state.currentRotation + moveRotation}deg)`;
  });

  const finishPointer = () => {
    if (state.isScrollingVertically) {
      state.isScrollingVertically = false;
      return;
    }
    if (!state.isDragging) return;

    state.isDragging = false;
    carousel.classList.remove('dragging');

    // Barely moved: treat it as a tap.
    if (Math.abs(state.dragDeltaX) < 7) {
      if (state.clickedIdx !== -1 && state.clickedIdx !== state.activeIndex) {
        rotateSliderTo(state, state.clickedIdx);
      } else {
        const project = projects[state.activeIndex];
        // The lightbox stays the primary way to look at a project - the
        // carousel is the point of this page. The link just means the
        // project's own page is one click away rather than unreachable.
        openProjectModal({ ...project, pageUrl: projectPageUrl(project, key) });
      }
      renderSlider(state);
      return;
    }

    if (state.dragDeltaX > 50) {
      state.currentRotation += state.theta;
      state.activeIndex = (state.activeIndex - 1 + projects.length) % projects.length;
    } else if (state.dragDeltaX < -50) {
      state.currentRotation -= state.theta;
      state.activeIndex = (state.activeIndex + 1) % projects.length;
    }

    buildPolygonNav(state);
    setSliderInfo(state);
    renderSlider(state);
  };

  sliderContainer.addEventListener('pointerup', finishPointer);
  sliderContainer.addEventListener('pointercancel', finishPointer);

  if (root.dataset.autoDemo === 'true') {
    root.dataset.autoDemo = '';
    autoRotateDemo(state);
  }
}

/* -- Public API ------------------------------------------------------------- */

export function initSliders(projectData) {
  // Build a slider only once it is nearly on screen: each one loads several
  // full-size photographs from the CDN.
  const sliderObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      initSlider(entry.target, projectData);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '400px 0px' });

  document.querySelectorAll('.project-slider')
    .forEach((slider) => sliderObserver.observe(slider));

  // Give the drum a small nudge when its section comes into view, so it reads
  // as something that turns rather than a still image.
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const slider = entry.target.querySelector('.project-slider');
      if (!slider) return;

      const state = sliderStates.get(slider);
      if (state) {
        state.autoPlayed = false;
        autoRotateDemo(state);
      } else {
        slider.dataset.autoDemo = 'true';
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('.work-section')
    .forEach((section) => sectionObserver.observe(section));
}

/** Re-measure every built slider. Called (debounced) on resize. */
export function rebuildSliders() {
  sliderStates.forEach((state) => buildSlides(state));
}

/** Re-translate the empty-state notes after a language switch. */
export function refreshSliderText() {
  document.querySelectorAll('.slider-empty').forEach((note) => {
    note.textContent = t('slider.empty') || '';
  });
}
