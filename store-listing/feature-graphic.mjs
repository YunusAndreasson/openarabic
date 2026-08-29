#!/usr/bin/env node
/**
 * Play feature graphic — 1024x500, mandatory for a Play listing.
 *
 * Google overlays a play button in the dead centre when a preview video exists,
 * so the lockup sits left and the centre-right is deliberately quiet. Content is
 * kept well inside the edges because Play crops this asset in some surfaces.
 */
import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { PALETTE } from './slides.mjs';

const ROOT = import.meta.dirname;
const OUT = resolve(ROOT, 'dist/play/feature-graphic.png');
const CHROME = process.env.CHROMIUM_BIN ?? 'chromium';
const [W, H] = [1024, 500];

function fontFace(family, file, weight) {
  const b64 = readFileSync(resolve(ROOT, '../assets/fonts', file)).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};
    src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
}

// Rendered straight from brand/dist/ring/mark.svg. NOT from the built PNGs — brand/build.py
// still bakes in the stale #568066, whereas constants/colors.ts moved to #507A60 for WCAG AA.
const ring = readFileSync(resolve(ROOT, '../brand/dist/ring/mark.svg'), 'utf8').replace(
  'fill="currentColor"',
  `fill="${PALETTE.tint}"`,
);
const ringUri = `data:image/svg+xml;base64,${Buffer.from(ring).toString('base64')}`;

const html = `<!doctype html><meta charset="utf-8"><style>
${fontFace('Inter', 'Inter-Bold.ttf', 700)}${fontFace('Inter', 'Inter-Regular.ttf', 400)}
${fontFace('Amiri', 'Amiri.ttf', 400)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:${PALETTE.sage};font-family:'Inter',sans-serif;
  -webkit-font-smoothing:antialiased;display:flex;align-items:center;position:relative}
/* Balances the right half without crowding the centre, where Play overlays a play button. */
.arabic{position:absolute;right:96px;top:50%;transform:translateY(-50%);
  font-family:'Amiri',serif;font-size:150px;line-height:1;color:${PALETTE.tint};
  direction:rtl;opacity:0.92}
.lockup{padding-left:78px;max-width:600px}
.brand{display:flex;align-items:center;gap:22px;margin-bottom:24px}
.brand img{width:74px;height:74px;display:block}
.brand h1{font-weight:700;font-size:62px;letter-spacing:-0.028em;color:${PALETTE.ink}}
.tagline{font-weight:700;font-size:34px;line-height:1.24;letter-spacing:-0.02em;
  color:${PALETTE.ink};margin-bottom:20px}
.meta{font-weight:400;font-size:23px;letter-spacing:0.01em;color:${PALETTE.tint}}
</style>
<div class="lockup">
  <div class="brand"><img src="${ringUri}"><h1>OpenArabic</h1></div>
  <div class="tagline">Read classical Arabic,<br>even as a beginner</div>
  <div class="meta">Free · No ads · Works offline</div>
</div>
<div class="arabic">اقْرَأْ</div>`;

const work = mkdtempSync(resolve(tmpdir(), 'oa-fg-'));
try {
  const page = resolve(work, 'fg.html');
  writeFileSync(page, html);
  const raw = resolve(work, 'raw.png');
  execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${W},${H}`,
      `--screenshot=${raw}`,
      `file://${page}`,
    ],
    { stdio: 'pipe' },
  );
  execFileSync(
    'magick',
    [
      raw,
      '-background',
      PALETTE.sage,
      '-alpha',
      'remove',
      '-alpha',
      'off',
      '-depth',
      '8',
      '-colorspace',
      'sRGB',
      OUT,
    ],
    { stdio: 'pipe' },
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log(
  `feature-graphic.png  ${execFileSync('magick', ['identify', '-format', '%wx%h %[channels]', OUT])}`,
);
