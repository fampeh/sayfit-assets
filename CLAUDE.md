# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal portfolio site for Sayfit Studio (sculptor Mehdi Seyfi) — plain HTML/CSS/JS, no build step, no package manager, no framework. There is no dev server, linter, or test suite in this repo; "running" the site means opening `index.html` in a browser or serving the directory statically.

## Critical: this git repo is NOT the website's source control

`.gitignore` ignores everything (`*`) except `projects/` and `data/projects.json`. `git remote -v` points at `github.com/fampeh/sayfit-assets`. That means:

- **Tracked by git**: `projects/` (raw media files) and `data/projects.json` (project metadata). This repo exists purely to version and publish media assets via jsDelivr's GitHub CDN.
- **Not tracked by git**: `index.html`, `css/`, `js/`, `image/`, `font/`, `customer/`, `Sayfit-Tuner/`, `build/`, and the `update_projects.*` tooling files. These live only on disk here and are deployed to the actual web host manually (via FileZilla, per the script's own instructions) — git has no history for them.

When asked to "commit" or "push" changes to site code (HTML/CSS/JS), be aware those files won't show up in `git status`/`git add` at all — only asset/data changes under `projects/` and `data/projects.json` do. Don't be surprised that editing `index.html` produces no git diff.

## The asset/CDN pipeline

Images and videos for portfolio projects are served from jsDelivr against this repo's tags (e.g. `https://cdn.jsdelivr.net/gh/fampeh/sayfit-assets@v1.11/...`), not from the local `projects/` folder directly in production. `js/script.js` fetches `data/projects.json`, reads `cdnBase`, and rewrites every relative `media[].src` to an absolute CDN URL (see `resolveMediaSrc`/`normalizeProjectData`).

`update_projects.py` is the tool that maintains this pipeline (also shipped as a compiled `update_projects.exe` via `update_projects.spec`/PyInstaller for non-technical use). It walks `projects/work/<category>/<project-name>/`, and for each project folder:
- Sorts images/videos with natural sort; a file named `cover.*` (case-insensitive) becomes the first media item.
- Preserves existing `year`/`desc`/`title` metadata for projects it already knows about (matched by humanized folder name), so hand-edited descriptions in `data/projects.json` survive re-runs.
- Writes the result to `data/projects.json`.

It has three modes (interactive menu):
1. **Full update** — rebuild JSON, bump `cdnBase` to the next `vMAJOR.MINOR` tag, commit `projects/` + the JSON, push, then create and push the new git tag. Use this after adding/removing/reordering media files.
2. **Quick push** — commit and push whatever's already in `projects/` without a new tag, then flips `cdnBase` back to `@main` (so changes are live immediately without waiting on a tag/CDN purge).
3. **Update JSON only** — regenerate `data/projects.json` locally with no git operations at all, for reviewing before committing by hand.

After any of these, `data/projects.json` still needs to be uploaded to the live web host separately (the script prints a reminder) — pushing to `origin/main` only updates the jsDelivr-backed asset repo, not the deployed site.

## Structure

- `index.html` / `css/style.css` / `js/script.js` — the main single-page site. Sections are anchored (`#top`, `#sculpture`, `#tailor-made-glasses`, `#logo-design`, `#archive`, `#app`, `#about`, `#contact`) and driven by a draggable 3D CSS cube (`#cube`) for navigation, plus a 3D carousel per work category and a lightbox-style modal for viewing a project's full media set. Slider state per category lives in the `sliderStates` Map in `script.js`; each carousel is built from `projectData[categoryKey]`, populated by `data/projects.json` after CDN URL resolution.
- `customer/index.html` — a separate, self-contained full-screen swipe slideshow ("Safit Slider"), linked from the Archive menu. It hardcodes CDN image URLs directly rather than reading `data/projects.json`.
- `Sayfit-Tuner/` — a standalone Persian-language (RTL) setar tuner web app (`index.html` + `css/style.css` + `js/tuner.js`), linked from the App menu. Unrelated in logic to the rest of the site.
- `projects/work/<category>/<project-name>/` — source-of-truth media folders that `update_projects.py` scans. Category folder names map to the slider `data-slider` keys used in `index.html` (`sculpture`, `tailor-made-glasses`, `logo-design`).
- `projects/asset/` — the flat `slide (N).jpg` sequence used by `customer/index.html`'s slideshow.
- `data/projects.json` — generated file; treat as build output of `update_projects.py`, not something to hand-edit for structure (hand-editing `year`/`title`/`desc` is fine and is explicitly preserved across regenerations).

## Working on this codebase

- Don't hand-edit `data/projects.json`'s `media` arrays or `cdnBase` — regenerate via `update_projects.py` instead, or the next run's "existing project" matching (by humanized title) may not line up.
- `update_projects.py` shells out to `git` directly (via `subprocess`) and can commit/push/tag on your behalf in modes 1 and 2 — be careful about which mode is being invoked, since mode 1 and 2 mutate git history and the remote.
- New project folders need a `year`/`desc` filled in manually after their first scan (the script leaves them blank and prints a reminder).
