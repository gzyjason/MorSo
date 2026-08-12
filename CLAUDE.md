# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page hero for "Mortal Software" (MorSo), ported from the Claude Design component
`MorSo.dc.html` in the project *Mortal Software Hero Design*
(`2de61ac0-3005-458f-8617-0334a0c242c1`). Static site, no dependencies, no build step.

## Commands

```bash
npm start        # serve the site at http://localhost:3000 (PORT env var to change)
```

`index.js` is a zero-dependency static file server used only for local development — it is not
part of the deployed site. Deploying means serving `index.html`, `styles.css`, `main.js`, and
`assets/` as static files.

`npm test` is still the npm placeholder; there is no test suite.

## Architecture

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

## Notes

- `assets/Roboto-Variable.woff2` is the Roboto Flex variable font (latin subset, wght 100–1000).
  Layout measurement depends on its real glyph widths, so `main.js` re-runs `computeLayout()`
  after `document.fonts.ready` — without that, the first fit can happen against the fallback face.
- When re-syncing from the design project, `MorSo.dc.html` is a `.dc` component (template with
  `{{ }}` bindings plus a `DCLogic` class) that runs against the React-based `support.js` runtime.
  This repo is a hand-port to vanilla DOM, not a copy — changes have to be translated, not pasted.
