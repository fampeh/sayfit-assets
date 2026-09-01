/**
 * Scroll-driven page state: revealing the sticky header, and marking which
 * navigation item corresponds to the section currently under the reader.
 */

import { prefersReducedMotion } from './config.js';

/** Which nav item lights up for which section. */
const SECTION_TO_NAV = {
  sculpture: 'work',
  'tailor-made-glasses': 'work',
  'logo-design': 'work',
  archive: 'archive',
  about: 'about',
  contact: 'contact',
  apps: 'apps'
};

let sections = [];
let navItems = [];
let landing = null;

export function scrollToTarget(id) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start'
  });
}

function updateActiveNav() {
  // 160px down from the top of the viewport: roughly where the eye sits,
  // and clear of the sticky header.
  const marker = window.scrollY + 160;
  const firstSectionTop = sections[0] ? sections[0].offsetTop : 0;

  const active = sections.find(
    (section) =>
      marker >= section.offsetTop &&
      marker < section.offsetTop + section.offsetHeight
  );

  if (!active) {
    if (window.scrollY < Math.max(firstSectionTop - 160, 80)) {
      navItems.forEach((item) =>
        item.classList.toggle('active', item.dataset.nav === 'home')
      );
    }
    return;
  }

  const navKey = SECTION_TO_NAV[active.id] || 'home';
  navItems.forEach((item) =>
    item.classList.toggle('active', item.dataset.nav === navKey)
  );
}

export function handleScroll() {
  if (landing) {
    const triggerY = landing.offsetTop + landing.offsetHeight * 0.75;
    document.body.classList.toggle('at-content', window.scrollY >= triggerY);
  }

  updateActiveNav();
}

export function initScroll() {
  landing = document.querySelector('.landing');
  navItems = Array.from(document.querySelectorAll('[data-nav]'));
  sections = Object.keys(SECTION_TO_NAV)
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });
}
