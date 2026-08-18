/**
 * The App section.
 *
 * Renders one tile per entry in data/apps.json. Adding a second app is a JSON
 * edit and a cover file - there is nothing to change here or in index.html.
 *
 * Each entry carries its own `en` and `fa` blocks rather than pointing at
 * i18n keys, because an app's name and description belong with the app, not
 * with the site's UI strings. Adding an app should mean touching one file.
 */

import { APPS_DATA_URL } from './config.js';
import { getLanguage, t } from './i18n.js';

let container = null;
let apps = [];

/**
 * The cover is fetched and inlined rather than used as <img src>, so it
 * inherits currentColor and stays a single black line in both themes. If the
 * fetch fails - or the file is a raster - it falls back to a plain <img>.
 */
async function mountCover(link, app, copy) {
  const alt = copy.coverAlt || copy.name || '';

  if (app.cover && app.cover.endsWith('.svg')) {
    try {
      const response = await fetch(app.cover);
      if (response.ok) {
        const markup = await response.text();
        link.innerHTML = markup;
        const svg = link.querySelector('svg');
        if (svg) {
          svg.setAttribute('role', 'img');
          svg.setAttribute('aria-label', alt);
          return;
        }
      }
    } catch {
      /* fall through to <img> */
    }
  }

  const img = document.createElement('img');
  img.src = app.cover;
  img.alt = alt;
  img.loading = 'lazy';
  link.replaceChildren(img);
}

function buildTile(app) {
  const lang = getLanguage();
  const copy = app[lang] || app.en || {};

  const tile = document.createElement('li');
  tile.className = 'app-tile';
  tile.dataset.appId = app.id;

  const cover = document.createElement('a');
  cover.className = 'app-tile-cover';
  cover.href = app.url;
  // The cover repeats the link below it, so it is hidden from the tab order
  // and from screen readers rather than announced twice.
  cover.tabIndex = -1;
  cover.setAttribute('aria-hidden', 'true');
  if (app.external) {
    cover.target = '_blank';
    cover.rel = 'noopener noreferrer';
  }
  mountCover(cover, app, copy);

  const body = document.createElement('div');
  body.className = 'app-tile-body';

  const name = document.createElement('h3');
  name.className = 'app-tile-name';
  name.textContent = copy.name || app.id;

  const tagline = document.createElement('p');
  tagline.className = 'app-tile-tagline';
  tagline.textContent = copy.tagline || '';

  const description = document.createElement('p');
  description.className = 'app-tile-desc';
  description.textContent = copy.description || '';

  const link = document.createElement('a');
  link.className = 'app-tile-link';
  link.href = app.url;
  if (app.external) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  link.textContent = `${t('apps.openLabel') || 'Open'} ${copy.name || ''}`.trim();
  if (app.external) {
    link.title = `${copy.name || ''} — ${t('apps.opensInNewTab') || 'opens in a new tab'}`;
  }

  body.append(name, tagline, description, link);
  tile.append(cover, body);
  return tile;
}

function render() {
  if (!container) return;

  if (!apps.length) {
    container.replaceChildren();
    return;
  }

  container.replaceChildren(...apps.map(buildTile));
}

export async function initApps() {
  container = document.getElementById('appsGrid');
  if (!container) return;

  try {
    const response = await fetch(APPS_DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    apps = Array.isArray(data.apps) ? data.apps : [];
  } catch (error) {
    console.error('App list could not be loaded.', error);
    apps = [];
  }

  render();
}

/** Rebuild the tiles in the new language. */
export function refreshApps() {
  render();
}
