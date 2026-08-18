/**
 * Shared constants and environment probes.
 *
 * Anything that more than one module needs to agree on lives here, so there
 * is exactly one place to change it.
 */

/* -- Where data comes from -------------------------------------------------- */

export const PROJECT_DATA_URL = 'data/projects.json';
export const APPS_DATA_URL = 'data/apps.json';
export const I18N_URL = (lang) => `i18n/${lang}.json`;

/**
 * Fallback only. The real base is the `cdnBase` field inside projects.json,
 * which update_projects.py rewrites on every release. This value is what gets
 * used if projects.json somehow arrives without one.
 */
export const DEFAULT_CDN_BASE = 'https://cdn.jsdelivr.net/gh/fampeh/sayfit-assets@v1.5/';

/* -- Languages -------------------------------------------------------------- */

export const LANGUAGES = ['en', 'fa'];
export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'sayfit:lang';

/* -- Environment ------------------------------------------------------------ */

/**
 * Read once at load. A visitor does not change this mid-session in practice,
 * and re-querying it per frame would be wasteful.
 */
export const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * "Desktop" here means a real cursor, not a screen size: it decides whether
 * hover behaviour is wired up at all. A large tablet is not desktop.
 */
export const isDesktop =
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** The width at which the header collapses into the hamburger. */
export const MOBILE_BREAKPOINT = 720;

export const isMobileViewport = () => window.innerWidth <= MOBILE_BREAKPOINT;
