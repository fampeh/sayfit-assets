/**
 * Translation.
 *
 * How it works, in one paragraph: every translatable string in index.html is
 * marked with `data-i18n="some.key"`, and the English text is left in the HTML
 * as the fallback. On load this module fetches i18n/<lang>.json, walks those
 * marked elements, and swaps in the translation. Attributes (aria-label,
 * alt, title, content) are handled by `data-i18n-attr="aria-label:some.key"`.
 *
 * There is no build step and no translation library. Adding a string means
 * adding a key to BOTH i18n/en.json and i18n/fa.json. See docs/I18N.md.
 *
 * Language is chosen in this order: ?lang= in the URL, then the visitor's
 * previous choice in localStorage, then the browser's own language, then
 * English.
 */

import {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  I18N_URL
} from './config.js';

/** @type {Record<string, any>} the currently loaded dictionary */
let dictionary = {};
let currentLang = DEFAULT_LANGUAGE;

const listeners = new Set();

/* -- Reading ---------------------------------------------------------------- */

/**
 * Look up a dotted key, e.g. "sections.about.title".
 * Returns undefined rather than throwing so a missing key degrades to the
 * English text already sitting in the HTML.
 */
export function t(key) {
  return key.split('.').reduce(
    (node, part) => (node == null ? undefined : node[part]),
    dictionary
  );
}

export function getLanguage() {
  return currentLang;
}

export function isRTL() {
  return t('meta.dir') === 'rtl';
}

/** Register a callback to re-render JS-built DOM when the language changes. */
export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* -- Choosing the language -------------------------------------------------- */

function readStoredLanguage() {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // Private browsing modes can throw on localStorage access. Not fatal.
    return null;
  }
}

function storeLanguage(lang) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    /* ignore - the ?lang= parameter still works */
  }
}

export function detectLanguage() {
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (LANGUAGES.includes(fromUrl)) return fromUrl;

  const stored = readStoredLanguage();
  if (LANGUAGES.includes(stored)) return stored;

  const fromBrowser = (navigator.language || '').slice(0, 2).toLowerCase();
  if (LANGUAGES.includes(fromBrowser)) return fromBrowser;

  return DEFAULT_LANGUAGE;
}

/* -- Applying --------------------------------------------------------------- */

function applyTextNodes(root) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = t(el.dataset.i18n);
    if (typeof value === 'string') el.textContent = value;
  });
}

function applyAttributes(root) {
  // Format: data-i18n-attr="aria-label:nav.backToTop; title:nav.backToTop"
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s && s.trim());
      if (!attr || !key) return;
      const value = t(key);
      if (typeof value === 'string') el.setAttribute(attr, value);
    });
  });
}

/**
 * Set the document's language and reading direction. This is what flips the
 * whole layout right-to-left, so every page needs it.
 *
 * It deliberately does NOT touch <title> or the meta description.
 *
 * It used to, and that was a bug: it assumed every page was the home page and
 * overwrote each generated project page's carefully-built title with the site
 * title, so "Rostam & Sohrab (2018) - Sculpture by Mehdi Seyfi" became
 * "Sayfit Studio" the moment the translation pass ran. Pages that DO want
 * their title translated say so, by marking the <title> and the description
 * with data-i18n / data-i18n-attr like any other string - see index.html.
 */
function applyDocumentMeta() {
  document.documentElement.lang = t('meta.lang') || DEFAULT_LANGUAGE;
  document.documentElement.dir = t('meta.dir') || 'ltr';
}

export function applyTranslations(root = document) {
  applyTextNodes(root);
  applyAttributes(root);
  if (root === document) applyDocumentMeta();
}

/* -- Loading and switching -------------------------------------------------- */

export async function loadLanguage(lang) {
  const target = LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;

  try {
    const response = await fetch(I18N_URL(target), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    dictionary = await response.json();
    currentLang = target;
  } catch (error) {
    console.error(`Could not load the "${target}" translation.`, error);
    // Leave the English text that is already in the HTML rather than
    // blanking the page. The site stays usable.
    if (target !== DEFAULT_LANGUAGE) {
      return loadLanguage(DEFAULT_LANGUAGE);
    }
    dictionary = {};
  }

  applyTranslations();
  return currentLang;
}

export async function setLanguage(lang) {
  if (lang === currentLang) return;

  await loadLanguage(lang);
  storeLanguage(currentLang);

  // Keep the address bar honest, so the page can be shared in the language
  // it is being read in. replaceState avoids adding a history entry per click.
  const url = new URL(window.location.href);
  url.searchParams.set('lang', currentLang);
  window.history.replaceState({}, '', url);

  listeners.forEach((fn) => fn(currentLang));
}

/** Wire the header button that flips between the two languages. */
export function initLanguageSwitch(button) {
  if (!button) return;

  const sync = () => {
    const other = LANGUAGES.find((l) => l !== currentLang) || DEFAULT_LANGUAGE;
    button.dataset.targetLang = other;
  };

  sync();
  onLanguageChange(sync);

  button.addEventListener('click', () => {
    setLanguage(button.dataset.targetLang);
  });
}
