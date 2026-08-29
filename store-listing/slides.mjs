/**
 * Store listing slide definitions.
 *
 * Captions are 3-6 words, sentence case, benefit-led — one line of thought per
 * slide, no subheads. The small grey second line on the old listing is exactly
 * what disappears at search-thumbnail size.
 *
 * Slot order matters: 1 and 2 carry most of the impact, so they lead with the
 * promise and the most differentiated interaction.
 */

/** Resolved from constants/colors.ts — NOT from app.json, whose primaryColor is stale. */
export const PALETTE = {
  sage: '#F2F7F4', // background — sage.lighter
  ink: '#1A2B23', // caption — forest.darkest
  tint: '#507A60', // light tint (WCAG AA corrected; app.json still says #568066)
  tintDark: '#80B88E',
  forest: '#040D07', // sage.darkest — the app's own background
};

export const SLIDES = [
  { capture: '01-read.png', caption: 'Read classical Arabic,\neven as a beginner' },
  { capture: '02-tap-word.png', caption: 'Tap any word\nyou don’t know' },
  { capture: '03-library.png', caption: 'Real books\nby real scholars' },
  { capture: '04-listen.png', caption: 'Hear every line\nread aloud' },
  { capture: '05-speak.png', caption: 'Answer out loud' },
  { capture: '06-remember.png', caption: 'Words return before\nyou forget them' },
  { capture: '07-vocabulary.png', caption: 'Watch your\nvocabulary grow' },
];

/**
 * Two independently laid-out canvases. Play caps aspect ratio at 2:1, so the
 * App Store canvas (1:2.17) can NOT be rescaled for Play — it would be rejected.
 */
/**
 * Layout expressed as fractions of the canvas width, so a new canvas size can be added
 * without re-tuning by hand. App Store Connect validates the upload against the display
 * size slot you picked, so each accepted size gets its own build.
 */
function tallCanvas(width, height, ext) {
  const f = n => Math.round(width * n);
  return {
    width,
    height,
    ext,
    captionTop: f(0.144),
    captionSize: f(0.0788),
    deviceWidth: f(0.7576),
    deviceTop: f(0.5227),
    radius: f(0.0576),
  };
}

export const TARGETS = {
  // 6.9" — the size Apple prefers; it scales down to every smaller iPhone.
  'app-store': tallCanvas(1320, 2868, 'png'),
  // 6.5" — the older slot. Upload here only if App Store Connect asks for these dimensions.
  'app-store-6.5': tallCanvas(1284, 2778, 'png'),
  play: {
    width: 1080,
    height: 1920,
    captionTop: 130,
    captionSize: 78,
    deviceWidth: 660,
    deviceTop: 470,
    radius: 50,
    ext: 'jpg',
  },
};
