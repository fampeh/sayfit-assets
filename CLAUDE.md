# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

## Read the docs first

`docs/` is the real documentation and it is current. In particular:

- **`docs/DECISIONS.md`** — what was asked for and why it was answered that
  way, session by session. **Read this before changing behaviour.** At least
  one thing here looks like a bug and is deliberate.
- `docs/ARCHITECTURE.md` — where every file lives and the rules the structure
  follows.
- `docs/CHANGELOG.md`, `docs/I18N.md`, `docs/CONTENT.md`, `docs/APPS.md`,
  `docs/SEO.md`, `docs/CUBE.md`, `docs/MEDIA.md`, `docs/TESTING.md`.

**Do not create or update documentation unless the owner explicitly asks.**
Complete and refine implementation first; document the final result only when
the owner instructs you to do so. This includes decisions, changelogs, QA notes
and other documentation. Do not ask to document after every change.

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

**Category keys and labels are different concepts.** `logo-design` remains
the stable Visual identity key. The eyewear collection uses the public key and
URL `eyewear` / `/work/eyewear/`; its current media CDN paths may still carry
the legacy folder segment until the next media release. Photography is the
sixth collection. Visible labels live in `i18n/*.json`.

**Do not touch `image/`.** The owner manages that folder himself.

**`work/` is generated.** Every file under it is written by
`tools/generate_project_pages.py` from `data/projects.json`, and each one says
so at the top. Editing them by hand is wasted work. `sitemap.xml` is generated
by the same script.

**Four Work categories are currently empty.** Visual identity, Jewelry,
Painting and Photography render a written notice, not a bug. Sculpture and
Eyewear contain projects.

**The domain is `sayfit.ir`**, confirmed by the owner. See `docs/SEO.md` for
every file it appears in.

**Design is minimal.** Black line on white, no ornament. New artwork should be
SVG, drawn with `stroke="currentColor"` and no fills, so it can be redrawn.

## Git

The GitHub remote is primarily for `projects/`; `.gitignore` ignores site
source and generated files. If the owner explicitly requests a documentation
commit, stage only the requested `docs/` files with `git add -f`. Do not sweep
site source or generated data into that commit. Do not change `.gitignore`
unless the owner explicitly reverses the broader tracking policy.

The remote is `github.com/fampeh/sayfit-assets` and is primarily used for
project media. Explicitly requested docs-only commits are an exception; site
source and generated JSON are uploaded to the web host separately.

`update_projects.py` stages only `projects/` and commits without `-a`, so it
cannot sweep up site edits or force `data/projects.json` into GitHub.

## The asset pipeline

Photographs are served from jsDelivr against this repo's tags, not from the web
host. `update_projects.py` walks `projects/work/<category>/<project>/`, writes
`data/projects.json`, and can commit, push and tag. Full detail, including the
`@main` versus version-tag trade-off, is in `docs/MEDIA.md`.

After any of its modes, `data/projects.json` still has to be uploaded to the
web host separately. Pushing to GitHub updates the CDN, not the site.

## Deploying

When the owner says **"دیپلویی بگیر"**, run `tools/prepare-deploy.ps1` and
upload the resulting `deploy/` folder as the site root. The script regenerates
`work/` and `sitemap.xml`, copies only public server files, verifies file
hashes, and removes stale files only inside `deploy/`. It intentionally omits
`docs/`, `tools/`, `projects/`, `build/`, Customer and other development files.
