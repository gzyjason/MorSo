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

## Cross-site link

The MorSo hero's StepOne button carries `class="js-stepone"` and a static `/stepone/` href.
`steponeUrl()` in `main.js` rewrites it at load time to the `stepone.` subdomain of whatever
host is serving the page, so the same build works on localhost and in production without
editing. The static href is the no-JS fallback.

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

Static, no JS: a fixed glass-pill nav, a "Portfolio" title with divider rules, glass project
cards, and a footer. The `Portfolio Dark.dc.html` source is one page out of a multi-page design
project (Home Dark, Portfolio Dark, Contact Dark); only Portfolio was ported, since that's the
only page requested. The nav's Home and Contact links point back to `/` rather than to
not-yet-built pages — update them if/when those pages are added.

`.noise` is the same fractalNoise-filter SVG data-URI texture technique as the design source,
overlaid at low opacity across the whole page.

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
