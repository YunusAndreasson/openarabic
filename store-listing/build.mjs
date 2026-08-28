#!/usr/bin/env node
/**
 * Renders the App Store and Play screenshot sets.
 *
 * Renderer is the system Chromium in headless screenshot mode — no npm deps, no
 * Playwright. Captions are pure Latin (Inter) and the Arabic lives inside the
 * captured raster, so no text shaping is needed here (unlike social/lib/card.mjs).
 *
 *   node store-listing/build.mjs [app-store|play]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { SLIDES, TARGETS } from './slides.mjs';
import { slideHtml } from './template.mjs';

const ROOT = import.meta.dirname;
const CAPTURES = resolve(ROOT, 'captures/ios');
const CHROME = process.env.CHROMIUM_BIN ?? 'chromium';

function renderSlide(html, { width, height }, outPng) {
  const work = mkdtempSync(resolve(tmpdir(), 'oa-slide-'));
  try {
    const page = resolve(work, 'slide.html');
    writeFileSync(page, html);
    execFileSync(
      CHROME,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--default-background-color=00000000',
        `--window-size=${width},${height}`,
        `--screenshot=${outPng}`,
        `file://${page}`,
      ],
      { stdio: 'pipe' },
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/** Both stores REJECT alpha. Flatten every export — this is the rejection trap. */
function flatten(png, target, out) {
  const args = [png, '-background', '#F2F7F4', '-alpha', 'remove', '-alpha', 'off',
    '-depth', '8', '-colorspace', 'sRGB'];
  if (target.ext === 'jpg') args.push('-quality', '92');
  execFileSync('magick', [...args, out], { stdio: 'pipe' });
}

function build(name) {
  const target = TARGETS[name];
  const outDir = resolve(ROOT, 'dist', name);
  mkdirSync(outDir, { recursive: true });

  SLIDES.forEach((slide, i) => {
    const n = String(i + 1).padStart(2, '0');
    const raw = resolve(outDir, `.${n}.raw.png`);
    const out = resolve(outDir, `${n}.${target.ext}`);
    renderSlide(slideHtml(slide, target, CAPTURES), target, raw);
    flatten(raw, target, out);
    rmSync(raw, { force: true });
    console.log(`  ${name}/${n}.${target.ext}  ${slide.caption.replace(/\n/g, ' ')}`);
  });
}

const only = process.argv[2];
for (const name of Object.keys(TARGETS)) {
  if (only && only !== name) continue;
  console.log(`\n${name} (${TARGETS[name].width}x${TARGETS[name].height})`);
  build(name);
}
