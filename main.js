/**
 * MorSo hero.
 *
 * "Mortal" / "Software" are laid out edge-to-edge and sized to fit the viewport.
 * Scrolling drives a single `progress` value (0 → 1) that:
 *   - flies "Mor" and "So" to a centered "MorSo" lockup at 25vh,
 *   - fades "tal" and "ftware" out,
 *   - then floats the glass buttons up into place.
 *
 * The hero is position:fixed, so #spacer is what actually gives the document
 * its scroll range: spacer = viewport height + animation range.
 */

/* Design-time props, mirroring the component's prop panel. */
const CONFIG = {
  /** Headline colour. Palette: #a8461a, #c1440e, #b3401f, #c2410c */
  accentColor: '#c2410c',
  /** Button glass tint: 'white' | 'warm' */
  glassTint: 'white',
  /** Scroll fraction over which Mor+So combine. Range 0.35–0.85 */
  combineSpeed: 0.6,
};

const GLASS = {
  white: { bg: 'rgba(255,255,255,0.10)', border: 'rgba(255,255,255,0.22)' },
  warm: { bg: 'rgba(255,196,150,0.14)', border: 'rgba(255,196,150,0.28)' },
};

const el = (id) => document.getElementById(id);
const ui = {
  desktop: el('desktop'),
  mobile: el('mobile'),
  lines: el('lines'),
  line1Word: el('line1Word'),
  line2Word: el('line2Word'),
  mor: el('mor'),
  tal: el('tal'),
  so: el('so'),
  ftware: el('ftware'),
  buttons: el('buttons'),
  scrollHint: el('scrollHint'),
  spacer: el('spacer'),
};

const state = {
  mode: 'wide', // 'wide' | 'slim' | 'mobile'
  progress: 0,
  layout: null,
  animRange: 0,
};

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/* Offscreen span used to measure the *real* combined "MorSo" at its final size,
   so the two halves butt together with true kerning instead of an estimate. */
const measurer = document.createElement('span');
measurer.style.cssText =
  'position:fixed;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;' +
  'pointer-events:none;font-family:"Roboto Flex",sans-serif;font-weight:900;' +
  'font-variation-settings:"wght" 900;';

function applyTheme() {
  const glass = GLASS[CONFIG.glassTint] || GLASS.white;
  const root = document.documentElement.style;
  root.setProperty('--accent', CONFIG.accentColor);
  root.setProperty('--glass-bg', glass.bg);
  root.setProperty('--glass-border', glass.border);
}

/** Scale `childEls` until `wordEl` measures `targetWidthPx` wide. Returns the size in px. */
function fitLine(wordEl, childEls, targetWidthPx) {
  if (!wordEl) return 100;
  childEls.forEach((child) => { child.style.fontSize = '200px'; });
  const measured = wordEl.scrollWidth || 1;
  const size = Math.max(10, (200 * targetWidthPx) / measured);
  childEls.forEach((child) => { child.style.fontSize = size + 'px'; });
  return size;
}

function computeLayout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ratio = w / h;

  let mode = 'wide';
  if (ratio < 1) mode = 'mobile';
  else if (ratio < 1.6) mode = 'slim';

  state.mode = mode;
  ui.desktop.hidden = mode === 'mobile';
  ui.mobile.hidden = mode !== 'mobile';

  if (mode === 'mobile') {
    state.animRange = 0;
    state.layout = null;
    state.progress = 1;
    ui.spacer.style.height = h + 'px';
    return;
  }

  const edgeInset = Math.max(10, w * 0.015);
  const effectiveW = w - edgeInset * 2;
  const targetW1 = mode === 'wide' ? effectiveW * 0.54 : effectiveW * 0.5;
  const targetLeft2 = mode === 'wide' ? effectiveW * 0.46 : 0;
  const targetW2 = effectiveW - targetLeft2;

  ui.lines.style.paddingLeft = edgeInset + 'px';
  ui.lines.style.paddingRight = edgeInset + 'px';

  // Clear any transform left over from a previous frame before measuring, so
  // getBoundingClientRect() reflects plain flow layout at the new viewport size.
  [ui.mor, ui.tal, ui.so, ui.ftware].forEach((part) => { part.style.transform = 'none'; });
  ui.line2Word.style.marginLeft = (targetLeft2 / effectiveW) * 100 + '%';

  const fontSize1 = fitLine(ui.line1Word, [ui.mor, ui.tal], targetW1);
  const fontSize2 = fitLine(ui.line2Word, [ui.so, ui.ftware], targetW2);

  const fromMor = ui.mor.getBoundingClientRect();
  const fromSo = ui.so.getBoundingClientRect();

  const finalFontSize = Math.min(100, Math.max(44, w * 0.07));
  const scaleMor = finalFontSize / fontSize1;
  const scaleSo = finalFontSize / fontSize2;

  measurer.style.fontSize = finalFontSize + 'px';
  measurer.textContent = 'Mor';
  const morWidthTo = measurer.offsetWidth || fromMor.width * scaleMor;
  measurer.textContent = 'MorSo';
  const totalWidthTo = measurer.offsetWidth || morWidthTo + fromSo.width * scaleSo;
  const soWidthTo = totalWidthTo - morWidthTo;

  const morLeftTo = w / 2 - totalWidthTo / 2;
  const soLeftTo = morLeftTo + morWidthTo;
  const topTo = h * 0.25;

  const morCenterFromX = fromMor.left + fromMor.width / 2;
  const morCenterFromY = fromMor.top + fromMor.height / 2;
  const soCenterFromX = fromSo.left + fromSo.width / 2;
  const soCenterFromY = fromSo.top + fromSo.height / 2;

  state.layout = {
    dxMor: morLeftTo + morWidthTo / 2 - morCenterFromX,
    dyMor: topTo - morCenterFromY,
    scaleMor,
    dxSo: soLeftTo + soWidthTo / 2 - soCenterFromX,
    dySo: topTo - soCenterFromY,
    scaleSo,
  };

  state.animRange = h * 1.1;
  ui.spacer.style.height = h + state.animRange + 'px';
  state.progress = clamp01(window.scrollY / state.animRange);
}

function applyFrame() {
  const { progress, layout } = state;

  const eased = easeOutCubic(clamp01(progress / CONFIG.combineSpeed));
  const buttonStart = CONFIG.combineSpeed * 0.65;
  const easedButton = easeOutCubic(clamp01((progress - buttonStart) / (1 - buttonStart || 1)));

  if (layout) {
    ui.mor.style.transform =
      `translate(${layout.dxMor * eased}px, ${layout.dyMor * eased}px) ` +
      `scale(${1 + (layout.scaleMor - 1) * eased})`;
    ui.so.style.transform =
      `translate(${layout.dxSo * eased}px, ${layout.dySo * eased}px) ` +
      `scale(${1 + (layout.scaleSo - 1) * eased})`;

    // The dropped halves drift slightly down-right and fade as they shrink.
    const tail = `translate(${18 * eased}px, ${24 * eased}px) scale(${1 - 0.15 * eased})`;
    ui.tal.style.transform = tail;
    ui.ftware.style.transform = tail;
    ui.tal.style.opacity = 1 - eased;
    ui.ftware.style.opacity = 1 - eased;
  }

  ui.buttons.style.transform = `translate(-50%, calc(-50% + ${(1 - easedButton) * 36}px))`;
  ui.buttons.style.opacity = easedButton;
  ui.scrollHint.style.opacity = Math.max(0, 1 - progress * 4);
}

let rafId = null;
function onScroll() {
  if (state.mode === 'mobile' || !state.animRange || rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    state.progress = clamp01(window.scrollY / state.animRange);
    applyFrame();
  });
}

function relayout() {
  computeLayout();
  applyFrame();
}

/**
 * Both sites deploy to a single Firebase Hosting site, and Hosting cannot route
 * on the Host header — every domain attached to a site serves the same files. So
 * when stepone.<domain> lands on this page, bounce it to the StepOne page.
 * The local dev server routes by Host itself, so this never fires there.
 */
if (window.location.hostname.startsWith('stepone.') &&
    !window.location.pathname.startsWith('/stepone')) {
  window.location.replace('/stepone/');
}

/**
 * StepOne lives on the `stepone.` subdomain of whatever host serves this page —
 * stepone.localhost:3000 in development, stepone.<domain> in production. The
 * markup's `/stepone/` href stays as the fallback if this never runs.
 */
function steponeUrl() {
  const { protocol, hostname, port } = window.location;
  if (!hostname) return './stepone/'; // opened straight off the filesystem
  if (hostname.startsWith('stepone.')) return './';
  // Firebase's own *.web.app / *.firebaseapp.com hosts (the default Hosting URL
  // and preview channels) have no stepone subdomain, so stay on the path.
  if (/\.(web\.app|firebaseapp\.com)$/.test(hostname)) return '/stepone/';
  return `${protocol}//stepone.${hostname.replace(/^www\./, '')}${port ? ':' + port : ''}/`;
}

document.querySelectorAll('.js-stepone').forEach((link) => { link.href = steponeUrl(); });

document.body.appendChild(measurer);
applyTheme();
relayout();

// Measurement depends on the real glyph widths; with font-display:swap the first
// pass can run against the fallback face, so re-fit once Roboto Flex is ready.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

window.addEventListener('resize', relayout);
window.addEventListener('scroll', onScroll, { passive: true });
