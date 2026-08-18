/**
 * Shared constants and environment probes.
 *
 * Anything that more than one module needs to agree on lives here, so there
 * is exactly one place to change it.
 */

/* -- Where data comes from --------------------------------------------------
   These have to be absolute, not relative.

   The home page sits at /, but a generated project page sits at
   /work/sculpture/rostam-and-sohrab/ - and a relative "i18n/en.json" from
   there resolves to /work/sculpture/rostam-and-sohrab/i18n/en.json, which is
   a 404 and an untranslated page.

   The root is derived from this module's own URL rather than hard-coded as
   "/", so the site still works if it is ever served from a subfolder.
   config.js lives at <root>/js/modules/, hence '../../'. */

export const SITE_ROOT = new URL('../../', import.meta.url).href;

const fromRoot = (path) => new URL(path, SITE_ROOT).href;

export const PROJECT_DATA_URL = fromRoot('data/projects.json');
export const APPS_DATA_URL = fromRoot('data/apps.json');
export const I18N_URL = (lang) => fromRoot(`i18n/${lang}.json`);

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
