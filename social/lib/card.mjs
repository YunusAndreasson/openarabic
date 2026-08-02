// OpenArabic "word of the day" card renderer.
//
// A minimal, centered vocabulary card — big vocalized Arabic word, a Latin
// transliteration, the English meaning, and the OpenArabic wordmark — on the
// app's dark forest background with the current sage brand accent. Mirrors the
// reference card layout (publish/generate_arabic_word_images.py) re-skinned to
// the live brand and with a transliteration line added.
//
// Stack (ported from ../zuhd.news/scripts/lib/ig-image.js): hand-built SVG
// string → @resvg/resvg-js. Instagram's publish API rejects PNG, so we take
// resvg's RGBA pixel buffer and encode JPEG with jpeg-js. Fonts are loaded by
// PATH via `fontFiles` (NOT `fontBuffers`) — resvg-js 2.6.2 renders buffered
// fonts with broken uniform advances; file paths give correct proportional
// metrics and, crucially, correct Arabic shaping + tashkeel via HarfBuzz.

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { Resvg } from '@resvg/resvg-js'
import jpeg from 'jpeg-js'

const fontPath = (f) => fileURLToPath(new URL(`../assets/fonts/${f}`, import.meta.url))

// All weights of Inter (Latin) + the Arabic families we might use. resvg picks
// the right file per font-family + font-weight in the SVG.
const FONT_FILES = [
  'Inter-Regular.ttf',
  'Inter-SemiBold.ttf',
  'Inter-Bold.ttf',
  'Madina.otf',
  'Amiri.ttf',
  'Scheherazade.ttf',
].map(fontPath)

// Internal family names (from fc-scan) used in the SVG font-family attribute.
const ARABIC_FAMILY = 'DigitalKhatt New Madina' // Madina.otf — the brand Arabic face
const ARABIC_FALLBACK = 'Amiri' // if Madina renders poorly, swap ARABIC_FAMILY → ARABIC_FALLBACK
const LATIN_FAMILY = 'Inter'

// --- brand palette (current OpenArabic dark theme) ---
const COLORS = {
  bg: '#040D07', // sage.darkest — the app's dark background / icon bg
  sage: '#7dae8d', // brightened brand sage, legible on the dark bg (Arabic word)
  translit: '#8a9990', // muted sage-gray — transliteration
  meaning: '#e8f1ec', // soft white — English meaning
  kicker: '#6f827a', // dim sage-gray — "WORD OF THE DAY" label
  wordmark: '#b9c8c0', // soft sage — wordmark text
}

// Canonical output sizes.
export const SQUARE = { width: 1080, height: 1080 } // X + Instagram feed
export const STORY = { width: 1080, height: 1920 } // Instagram story (9:16)

// Per-size vertical anchors (fractions of height) + font sizes, so the square
// and story cards share one composer.
const LAYOUT = {
  1080: { kickerY: 0.12, arabicY: 0.46, translitY: 0.63, meaningY: 0.73, markY: 0.9, kicker: 28, translit: 52, meaning: 62, mark: 38 },
  1920: { kickerY: 0.2, arabicY: 0.44, translitY: 0.58, meaningY: 0.66, markY: 0.87, kicker: 30, translit: 56, meaning: 66, mark: 40 },
}

const HARAKAT = /[ً-ْٰـ]/g // tashkeel + superscript-alef + tatweel

const escXml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

// Size the Arabic word so a single dictionary lemma fits the card width. Base
// letters (harakat stripped) drive it; most lemmas are 3–7 letters → very large.
const arabicFontSize = (arabic) => {
  const base = String(arabic).replace(HARAKAT, '').replace(/\s/g, '').length
  if (base <= 4) return 260
  if (base <= 6) return 230
  if (base <= 8) return 195
  if (base <= 11) return 160
  return 130
}

// The OpenArabic wordmark: sage ring (the real logo PNG) + "OpenArabic",
// centered as a group. Widths are approximated from Inter's average advance —
// good enough for a footer lockup.
let _logoDataUri = null
const logoDataUri = () => {
  if (_logoDataUri) return _logoDataUri
  const b64 = readFileSync(fontPath('../oaLogo.png')).toString('base64')
  _logoDataUri = `data:image/png;base64,${b64}`
  return _logoDataUri
}

const wordmark = (W, cy, fontSize) => {
  const label = 'OpenArabic'
  const ringBox = fontSize * 1.5 // logo PNG has internal padding; oversize slightly
  const gap = fontSize * 0.32
  const textW = label.length * fontSize * 0.54 // ~0.54em average for Inter SemiBold
  const total = ringBox + gap + textW
  const startX = (W - total) / 2
  const ringX = startX
  const ringY = cy - ringBox / 2
  const textX = startX + ringBox + gap
  const textBaseline = cy + fontSize * 0.34
  return `
  <image href="${logoDataUri()}" x="${ringX.toFixed(1)}" y="${ringY.toFixed(1)}" width="${ringBox.toFixed(1)}" height="${ringBox.toFixed(1)}"/>
  <text x="${textX.toFixed(1)}" y="${textBaseline.toFixed(1)}" font-family="${LATIN_FAMILY}" font-size="${fontSize}" font-weight="600" fill="${COLORS.wordmark}" letter-spacing="-0.01em">${escXml(label)}</text>`
}

/**
 * Build the card SVG.
 * @param {{arabic:string, translit:string, english:string}} entry
 * @param {{width:number,height:number}} [size=SQUARE]
 */
export const buildCardSvg = (entry, size = SQUARE) => {
  const { width: W, height: H } = size
  const L = LAYOUT[H] || LAYOUT[1080]
  const cx = W / 2

  const arabic = String(entry.arabic || '').trim()
  const translit = String(entry.translit || '').trim()
  const english = String(entry.english || '').trim()
  const arSize = arabicFontSize(arabic)

  const kicker = 'WORD OF THE DAY'

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.bg}"/>

  <text x="${cx}" y="${(H * L.kickerY).toFixed(0)}" text-anchor="middle" font-family="${LATIN_FAMILY}" font-size="${L.kicker}" font-weight="600" fill="${COLORS.kicker}" letter-spacing="6">${escXml(kicker)}</text>

  <text x="${cx}" y="${(H * L.arabicY).toFixed(0)}" text-anchor="middle" direction="rtl" font-family="${ARABIC_FAMILY}, ${ARABIC_FALLBACK}" font-size="${arSize}" fill="${COLORS.sage}">${escXml(arabic)}</text>

  <text x="${cx}" y="${(H * L.translitY).toFixed(0)}" text-anchor="middle" font-family="${LATIN_FAMILY}" font-size="${L.translit}" font-weight="400" font-style="italic" fill="${COLORS.translit}">${escXml(translit)}</text>

  <text x="${cx}" y="${(H * L.meaningY).toFixed(0)}" text-anchor="middle" font-family="${LATIN_FAMILY}" font-size="${L.meaning}" font-weight="600" fill="${COLORS.meaning}">${escXml(english)}</text>

  ${wordmark(W, H * L.markY, L.mark)}
</svg>`
}

const renderPixels = (svg, size) => {
  const resvg = new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: LATIN_FAMILY },
    fitTo: { mode: 'width', value: size.width },
    background: COLORS.bg,
  })
  return resvg.render()
}

/** Rasterize a card to a PNG Buffer (for local preview / X media upload). */
export const renderCardPng = (entry, size = SQUARE) => renderPixels(buildCardSvg(entry, size), size).asPng()

/** Rasterize a card to a JPEG Buffer (Instagram requires JPEG). */
export const renderCardJpeg = (entry, size = SQUARE, quality = 92) => {
  const r = renderPixels(buildCardSvg(entry, size), size)
  return jpeg.encode({ data: r.pixels, width: r.width, height: r.height }, quality).data
}

// --- CLI: `node lib/card.mjs --sample` renders preview PNGs to social/preview/ ---
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--sample')) {
    const { mkdirSync, writeFileSync } = await import('fs')
    const outDir = fileURLToPath(new URL('../preview/', import.meta.url))
    mkdirSync(outDir, { recursive: true })
    const samples = [
      { arabic: 'مِلَّة', translit: 'milla', english: 'religion' },
      { arabic: 'كِتَاب', translit: 'kitāb', english: 'book' },
      { arabic: 'اِسْتِغْفَار', translit: 'istighfār', english: 'seeking forgiveness' },
      { arabic: 'صَلَاة', translit: 'ṣalāh', english: 'prayer' },
    ]
    for (const s of samples) {
      writeFileSync(`${outDir}${s.english.replace(/\s+/g, '-')}-square.png`, renderCardPng(s, SQUARE))
      writeFileSync(`${outDir}${s.english.replace(/\s+/g, '-')}-story.png`, renderCardPng(s, STORY))
      console.log(`rendered ${s.arabic} (${s.translit}) — ${s.english}`)
    }
    console.log(`\npreviews → ${outDir}`)
  } else {
    console.log('usage: node lib/card.mjs --sample')
  }
}
