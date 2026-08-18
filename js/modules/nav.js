/**
 * The sticky header: the hamburger, and the Work / Archive / App dropdowns.
 *
 * On desktop the dropdowns open on hover, which is pure CSS. This module only
 * handles the tap-to-open behaviour below the mobile breakpoint, plus the
 * hamburger itself.
 */

import { isMobileViewport, MOBILE_BREAKPOINT } from './config.js';
import { scrollToTarget } from './scroll.js';

let stickyMenus = [];
let hamburger = null;
let navCenter = null;

export function closeStickyMenus() {
  stickyMenus.forEach((menu) => {
    menu.classList.remove('open');
    const button = menu.querySelector('.sticky-button');
    if (button) button.setAttribute('aria-expanded', 'false');
  });
}

export function closeMobileMenu() {
  if (!hamburger || !navCenter) return;
  if (!navCenter.classList.contains('open')) return;
  navCenter.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}

function toggleMobileMenu() {
  if (!hamburger || !navCenter) return;
  const isOpen = navCenter.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(isOpen));
}

export function initNav() {
  hamburger = document.getElementById('hamburgerBtn');
  navCenter = document.getElementById('navCenter');

  stickyMenus = ['stickyWork', 'stickyArchive', 'stickyApp']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  stickyMenus.forEach((menu) => {
    const button = menu.querySelector('.sticky-button');
    if (!button) return;

    button.addEventListener('click', (event) => {
      // Above the breakpoint the dropdown is a hover affordance and the
      // button itself does nothing.
      if (!isMobileViewport()) return;
      event.stopPropagation();

      const wasOpen = menu.classList.contains('open');
      closeStickyMenus();
      menu.classList.toggle('open', !wasOpen);
      button.setAttribute('aria-expanded', String(!wasOpen));
    });
  });

  // The Work submenu scrolls to a section rather than following a link.
  document
    .querySelectorAll('.sticky-submenu button[data-target]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        scrollToTarget(button.dataset.target);
        closeStickyMenus();
      });
    });

  if (hamburger && navCenter) {
    hamburger.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleMobileMenu();
    });

    navCenter
      .querySelectorAll('a, .sticky-submenu button')
      .forEach((link) => {
        link.addEventListener('click', () => {
          if (isMobileViewport()) closeMobileMenu();
        });
      });
  }

  document.addEventListener('click', (event) => {
    if (!isMobileViewport()) return;

    if (!event.target.closest('.sticky-menu')) closeStickyMenus();

    if (
      navCenter &&
      navCenter.classList.contains('open') &&
      !navCenter.contains(event.target) &&
      hamburger &&
      !hamburger.contains(event.target)
    ) {
      closeMobileMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > MOBILE_BREAKPOINT) closeMobileMenu();
  });
}
