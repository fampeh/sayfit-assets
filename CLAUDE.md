# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Read the docs first

`docs/` is the real documentation and it is current. In particular:

- **`docs/DECISIONS.md`** — what was asked for and why it was answered that
  way, session by session. **Read this before changing behaviour.** At least
  one thing here looks like a bug and is deliberate.
- `docs/ARCHITECTURE.md` — where every file lives and the rules the structure
  follows.
- `docs/CHANGELOG.md`, `docs/I18N.md`, `docs/APPS.md`, `docs/SEO.md`,
  `docs/CUBE.md`, `docs/MEDIA.md`.

**Every session that changes anything must append to `docs/DECISIONS.md` and
`docs/CHANGELOG.md`.** This is a standing instruction from the owner: the
project is maintained through conversation, and without this the reasoning is
lost. Record what was asked, in his words where the wording matters, and what
was decided against as well as what was done.

## What this is

A static portfolio for Sayfit Studio (sculptor Mehdi Seyfi) — plain HTML, CSS
and ES modules. No build step, no package manager, no framework, no tests.
Bilingual English/Persian since 2026-08-18.

"Running it" means serving the folder over http and opening it:

```bash
python -m http.server 8000
```

**It must be served, not opened from disk** — the JavaScript is ES modules and
a browser will not load those from `file://`.

## Things that will trip you up

**The prev/next carousel buttons rotate the drum the "wrong" way on purpose.**
Press the left button, the drum rolls left, even though that means the caption
and the front-facing image disagree. The owner designed it that way and
confirmed it explicitly. It is commented as intentional in
`js/modules/slider.js` and `css/parts/slider.css`. Do not correct it.

**`logo-design` is a key, "Visual identity" is a label.** The section id, the
`data-slider` attribute and the `projects.json` key are all `logo-design`,
tied to the folder name `projects/work/logo-design/` and to the CDN path of
every image published under it. The visible label lives in `i18n/*.json`.

**Do not touch `image/`.** The owner manages that folder himself.

**`work/` is generated.** Every file under it is written by
`tools/generate_project_pages.py` from `data/projects.json`, and each one says
so at the top. Editing them by hand is wasted work. `sitemap.xml` is generated
by the same script.

**Two Work categories are intentionally empty.** Tailor made glasses and Visual
identity are waiting on photography. They render a written notice, not a bug.

**The domain is `sayfit.ir`**, confirmed by the owner. See `docs/SEO.md` for
every file it appears in.

**Design is minimal.** Black line on white, no ornament. New artwork should be
SVG, drawn with `stroke="currentColor"` and no fills, so it can be redrawn.

## Git

As of 2026-08-18 the site source **is** tracked. Before that, `.gitignore`
ignored everything except `projects/` and `data/projects.json`.

The remote is `github.com/fampeh/sayfit-assets` and is shared with the media
pipeline — so a push sends both the site code and the photographs. That is
untidy and deliberate; the reasoning and the alternatives considered are in
`docs/ARCHITECTURE.md#version-control`.

`update_projects.py` stages explicit paths and commits without `-a`, so it
cannot sweep up uncommitted site edits.

## The asset pipeline

Photographs are served from jsDelivr against this repo's tags, not from the web
host. `update_projects.py` walks `projects/work/<category>/<project>/`, writes
`data/projects.json`, and can commit, push and tag. Full detail, including the
`@main` versus version-tag trade-off, is in `docs/MEDIA.md`.

After any of its modes, `data/projects.json` still has to be uploaded to the
web host separately. Pushing to GitHub updates the CDN, not the site.

## Deploying

Manual FTP (FileZilla). Upload `index.html`, `.htaccess`, `robots.txt`,
`sitemap.xml`, `css/`, `js/`, `i18n/`, `data/`, `font/`, `image/`, `assets/`,
`work/`, `customer/`, `Sayfit-Tuner/`.

Do not upload `docs/`, `tools/`, `projects/`, `build/`, `update_projects.*` or
`*.cdr`.
