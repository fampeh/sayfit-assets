/**
 * Project URL slugs.
 *
 * The slug comes from the project's source FOLDER name, which is embedded in
 * every media path (projects/work/<category>/<folder>/...). The folder name is
 * what update_projects.py derives the title from, so it is the one thing
 * guaranteed to be stable - a title can be hand-edited in projects.json, a
 * folder name cannot be without also moving the files.
 *
 * tools/generate_project_pages.py implements exactly this rule in Python.
 * The two MUST agree, or the carousel will link to pages that do not exist.
 * If you change one, change the other.
 */

import { SITE_ROOT } from './config.js';

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Pull the source folder name out of a project's first media path. */
export function projectFolder(project) {
  for (const item of project?.media || []) {
    const match = /projects\/work\/[^/]+\/([^/]+)\//.exec(item.src || '');
    if (match) return match[1];
  }
  return project?.title || '';
}

/**
 * The site-relative URL of a project's own page, or null if it cannot be
 * worked out - in which case the caller should simply not show a link.
 */
export function projectPageUrl(project, categoryKey) {
  const slug = slugify(projectFolder(project));
  if (!slug || !categoryKey) return null;
  // Absolute, via SITE_ROOT, so a link built on a page nested under /work/
  // does not resolve relative to that page.
  return new URL(`work/${categoryKey}/${slug}/`, SITE_ROOT).href;
}
