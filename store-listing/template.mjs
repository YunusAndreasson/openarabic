import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PALETTE } from './slides.mjs';

const FONT_DIR = resolve(import.meta.dirname, '../assets/fonts');

/** Inline the font as a data URI — headless Chromium won't reliably load file:// fonts. */
function fontFace(family, file, weight) {
  const b64 = readFileSync(resolve(FONT_DIR, file)).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;
    src:url(data:font/ttf;base64,${b64}) format('truetype');}`;
}

const FONTS =
  fontFace('Inter', 'Inter-Bold.ttf', 700) + fontFace('Inter', 'Inter-SemiBold.ttf', 600);

/** The capture is inlined too, so the page has zero external requests. */
function dataUri(path) {
  return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

/**
 * One slide: caption above, the dark app UI floating frameless below with a soft
 * shadow. Corner radius and shadow match admin-dashboard/components/phone-mockup.tsx
 * so the store art and the website read as one system.
 */
export function slideHtml(slide, target, captureDir) {
  const t = target;
  // The device runs to the bottom edge of the canvas. Width is ALWAYS the full capture
  // width — phone UI is laid out edge to edge, so cropping horizontally cuts real content
  // (button labels, the gloss column). Vertical overflow is simply clipped at the bottom.
  const visibleH = t.height - t.deviceTop;
  const caption = slide.caption
    .split('\n')
    .map(l => `<span>${l}</span>`)
    .join('');

  return `<!doctype html><meta charset="utf-8"><style>
  ${FONTS}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${t.width}px;height:${t.height}px;overflow:hidden}
  body{background:${PALETTE.sage};font-family:'Inter',sans-serif;
       -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
  .caption{position:absolute;top:${t.captionTop}px;left:0;right:0;
    padding:0 ${Math.round(t.width * 0.067)}px;text-align:center;
    font-weight:700;font-size:${t.captionSize}px;line-height:1.12;
    letter-spacing:-0.022em;color:${PALETTE.ink}}
  .caption span{display:block}
  .device{position:absolute;top:${t.deviceTop}px;left:50%;
    transform:translateX(-50%);width:${t.deviceWidth}px;height:${visibleH}px;
    border-radius:${t.radius}px;overflow:hidden;background:${PALETTE.forest};
    box-shadow:0 ${Math.round(t.radius * 0.5)}px ${Math.round(t.radius * 1.3)}px
      ${-Math.round(t.radius * 0.32)}px rgb(4 13 7 / 0.42);}
  .device img{display:block;position:absolute;top:0;left:0;width:100%;height:auto}
  </style>
  <div class="caption">${caption}</div>
  <div class="device"><img src="${dataUri(resolve(captureDir, slide.capture))}"></div>`;
}
