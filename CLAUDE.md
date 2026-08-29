# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Three static sites in one repo, all hand-ported from Claude Design components. No dependencies,
no build step.

| Site | Lives in | Ported from |
|---|---|---|
| MorSo hero | repo root | `MorSo.dc.html` — *Mortal Software Hero Design* (`2de61ac0-3005-458f-8617-0334a0c242c1`) |
| StepOne landing | `stepone/` | `StepOne Landing.dc.html` — (`f0e33850-b1c2-46c8-bcc8-bdd29e506a78`) |
| gzyjason portfolio | `gzyjason/` | `Portfolio Dark.dc.html` — *Ziye Gao Personal Website* (`4e14f17d-f39b-4fe2-8b98-b4d26eb9e8dc`) |

## Commands

```bash
npm start        # http://localhost:3000  (MorSo)
                 # http://stepone.localhost:3000  (StepOne)
                 # http://gzyjason.localhost:3000  (gzyjason)
```

`index.js` is a zero-dependency static server for local development only. It picks the site
from the `Host` header — any `stepone.*` host serves out of `stepone/`, any `gzyjason.*` host
serves out of `gzyjason/`, everything else serves the repo root. Browsers resolve `*.localhost`
to loopback, so no `/etc/hosts` entry is needed. `/stepone/` and `/gzyjason/` also work as plain
paths, which is the fallback when a host has no subdomain routing.

Deploying means serving the root as the apex site, `stepone/` as `stepone.<domain>`, and
`gzyjason/` as `gzyjason.<domain>`.

`npm test` is still the npm placeholder; there is no test suite.

## Cross-site links

The MorSo hero's StepOne and Ziye Gao buttons carry `class="js-stepone"` / `class="js-gzyjason"`
and static `/stepone/` / `/gzyjason/` hrefs. `subdomainUrl()` in `main.js` rewrites each at load
time to the matching subdomain of whatever host is serving the page, so the same build works on
localhost and in production without editing. The static hrefs are the no-JS fallback.

`bounceSubdomain()` in `main.js` is the other half of this: since StepOne and gzyjason deploy to
the same shared Firebase Hosting site (Hosting can't route on the Host header), landing on
`stepone.<domain>` or `gzyjason.<domain>` in production would otherwise render this MorSo hero
page. It redirects to `/stepone/` or `/gzyjason/` when the hostname says so. The local dev server
routes by Host itself (`index.js`'s `siteRoot()`), so this never fires there.

That bounce only covers the root of each subdomain, though — it works by loading this page's own
`index.html` (which is the only place the redirect script lives) and redirecting from there. A
deep link on a subdomain, e.g. `gzyjason.<domain>/portfolio/`, resolves against the shared file
tree with no `/gzyjason` prefix, finds nothing at literal `/portfolio/`, and 404s server-side
before any JS can run. `firebase.json`'s `redirects` cover the specific subpages this can happen
for (`/portfolio/`, `/contact/`, `/terms/`, `/privacy/`) by sending the browser on to the real
URL — add an entry there for any new subpage under `stepone/` or `gzyjason/` that should be
reachable as a bare path on its subdomain.

These are `redirects`, not `rewrites`, on purpose: a rewrite serves the target file's content
while leaving the browser's URL (and thus the base for the page's own relative `../` asset links)
at the original bare path, which breaks them. A redirect actually navigates the browser to the
real URL first, so the page's relative links resolve correctly — and it's why those pages use
relative asset paths rather than absolute `/gzyjason/...` ones, which would work in production but
break local dev (`index.js`'s `siteRoot()` already serves `gzyjason/` as that host's own root, so
an absolute `/gzyjason/...` path would double up).

That still leaves the `/stepone/` (or `/gzyjason/`) segment sitting in the address bar after the
redirect lands, which is undesirable for URLs meant to be shared or typed (StepOne's own Terms
text points people at `stepone.morso.one/terms`). Each of `stepone/index.html`,
`stepone/terms/index.html`, and `stepone/privacy/index.html` carries a small inline script, first
thing in `<head>`, that runs `history.replaceState()` after load to strip a leading `/stepone/`
from the visible path. It's cosmetic only — it fires after the page's relative assets have already
resolved against the pre-redirect URL, so it can't break them the way a rewrite would. It checks
`location.hostname.startsWith('stepone.')` and a `/stepone/`-prefixed path, so it's a no-op both in
local dev (no `/stepone/` prefix there) and when the page is reached via the bare `/stepone/...`
path on a host without subdomain routing (where showing that prefix is still correct).

## Architecture — StepOne (`stepone/`)

Static hero, then four selling-point sections generated in `main.js` from `SECTIONS` and
revealed by an `IntersectionObserver` (threshold 0.22, unobserved after first reveal). `CONFIG`
mirrors the design's prop panel (`appStoreUrl`, `tiltFrames`).

The phone mock layers two images inside `.phone`: `.phone-shot` (the screenshot) under
`.phone-frame` (`assets/phone-frame.png`, an official device render — bezel and dynamic island
are baked into the PNG, transparent everywhere else). The screenshot's inset (`left 5.2593%`,
`top 2.4638%`, `89.4074% × 95.0362%`) was measured directly from `phone-frame.png`'s alpha
channel so it sits flush under the screen cutout; `--phone-r` (on `.phone-shot`) only rounds the
screenshot's own corners as a fallback in case those insets are ever nudged. If the frame image
changes, re-derive the insets from its alpha channel rather than eyeballing them.

`assets/{home,types,swipe,journey}.png` are the real app screenshots (1206×2622, matching the
frame's screen cutout almost exactly).

## Architecture — MorSo (repo root)

The whole animation is driven by one number: `state.progress`, the fraction of the scroll range
that has been consumed (0 → 1). Everything else is derived from it.

- **`.hero` is `position: fixed`**, so it never scrolls. `#spacer` is what gives the document its
  height (`viewport + animRange`, where `animRange = viewport height × 1.1`). Scrolling therefore
  moves nothing visually — it only advances `progress`.
- **`computeLayout()`** (on load, resize, and once fonts settle) does all measurement:
  it fits "Mortal" and "Software" to target widths with `fitLine()`, then records the pixel
  deltas each of "Mor" and "So" must travel to land as a centered "MorSo" lockup at 25vh.
  Those deltas live in `state.layout`.
- **`applyFrame()`** is pure interpolation — it maps `progress` through `easeOutCubic` and writes
  transforms/opacities. It never measures. Keeping measurement and interpolation separate is what
  keeps the scroll handler cheap.
- **`fitLine()` measures at a fixed 200px** and scales the result, rather than iterating.
- The final lockup width comes from an **offscreen measurer span** rendering the real string
  "MorSo" at the final size, so the two halves butt together with true kerning instead of an
  estimated sum of two independently-scaled widths.

### Breakpoints

Chosen by aspect ratio (`innerWidth / innerHeight`), not by width:

| ratio    | mode     | behaviour                                                            |
|----------|----------|----------------------------------------------------------------------|
| `< 1`    | `mobile` | static "MorSo" lockup, stacked buttons, no scroll range, no animation |
| `< 1.6`  | `slim`   | line 1 at 50% width, line 2 full width from the left edge             |
| `>= 1.6` | `wide`   | line 1 at 54% width, line 2 indented 46%                              |

### Design props

`CONFIG` at the top of `main.js` mirrors the design component's prop panel — `accentColor`,
`glassTint` (`white` | `warm`), `combineSpeed` (0.35–0.85, the scroll fraction over which the two
halves combine). `applyTheme()` pushes them into CSS custom properties; keep colour changes
flowing through those variables rather than hardcoding them in `styles.css`.

## Architecture — gzyjason (`gzyjason/`)

Static, no JS: a fixed glass-pill nav, a page title with divider rules, glass cards, and a
footer, shared via plain CSS classes in `styles.css` (no templating — each page repeats the
nav/noise/footer markup, per this repo's no-build-step convention). Ported from the design
project's three pages (`Home Dark.dc.html`, `Portfolio Dark.dc.html`, `Contact Dark.dc.html`):

| Page | Lives in |
|---|---|
| Home | `gzyjason/index.html` (site root) |
| Portfolio | `gzyjason/portfolio/index.html` |
| Contact | `gzyjason/contact/index.html` |

`.glass` is the shared glassmorphism look (gradient background, blur, border, shadow) — `.card`,
`.skill-card`, and `.contact-link` compose it with `class="card glass"` etc. rather than
duplicating those properties.

`.noise` is the same fractalNoise-filter SVG data-URI texture technique as the design source,
overlaid at low opacity across the whole page.

Two of the five skill-grid icons on Home (`assets/javascript.svg`, `assets/linkedin.svg`) are
hand-authored replacements for the design's `JavaScript.webp` and `InBug-Black.png` — repeated
attempts to transcribe those binary files out of the design project produced silently-corrupted
image data (valid file headers, garbage past the first few KB), so clean equivalent SVGs were
substituted instead of shipping broken images. `assets/cpp.webp`, `assets/html.webp`,
`assets/java.svg`, and `assets/python.svg` are byte-exact from the design project and were
verified by fully decoding each image after transfer, not just checking file headers.

## Notes

- `assets/Roboto-Variable.woff2` is the Roboto Flex variable font (latin subset, wght 100–1000).
  Layout measurement depends on its real glyph widths, so `main.js` re-runs `computeLayout()`
  after `document.fonts.ready` — without that, the first fit can happen against the fallback face.
- The four StepOne app screenshots and `phone-frame.png` were too large for `DesignSync.get_file`
  (256 KiB truncation limit) to pull from the design project, so they were supplied directly and
  dropped into `stepone/assets/` by hand instead.
- Fonts are self-hosted latin subsets rather than the design's Google Fonts CDN link, matching
  the MorSo page's offline-capable approach. For gzyjason's Oxanium, Google serves the *same*
  variable-font woff2 file for weights 500/600/700 (only the `font-weight` descriptor differs
  per `@font-face` block), so there's a single `Oxanium-Variable.woff2` rather than one file per
  weight — same pattern as `assets/Roboto-Variable.woff2` at the repo root. Space Mono 400/700
  are genuinely distinct static files.
- When re-syncing from the design projects, `.dc.html` files are components (template with
  `{{ }}` bindings plus a `DCLogic` class) that run against the React-based `support.js` runtime.
  This repo is a hand-port to vanilla DOM, not a copy — changes have to be translated, not pasted.
