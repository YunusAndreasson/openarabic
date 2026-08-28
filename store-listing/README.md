# Store listing assets

Generates the App Store and Google Play screenshot sets, the Play feature graphic,
and holds the store copy. Regenerating is a re-run, not a redesign.

```bash
node store-listing/build.mjs             # both screenshot sets
node store-listing/build.mjs app-store   # one set
node store-listing/feature-graphic.mjs   # 1024x500 Play feature graphic
node store-listing/verify.mjs            # assert store constraints (exits 1 on failure)
```

Requires only the system `chromium` and `magick` (ImageMagick 7) — no npm dependencies.
Override the browser with `CHROMIUM_BIN`.

## Layout

| file | role |
|---|---|
| `slides.mjs` | caption + capture per slide, palette, and the two canvas configs |
| `template.mjs` | HTML/CSS for one slide |
| `build.mjs` | renders, flattens, writes `dist/` |
| `feature-graphic.mjs` | the Play feature graphic |
| `verify.mjs` | dimensions, alpha, bit depth, Play aspect cap |
| `captures/ios/` | source screenshots, 8-bit sRGB, no alpha |
| `metadata/` | store copy with character limits noted |

## Constraints these scripts enforce

- **App Store**: 1320×2868 is the only required iPhone size — Apple scales it down to every
  smaller device. iPad is not needed while `supportsTablet: false`.
- **Play caps aspect ratio at 2:1.** The App Store canvas is 1:2.17, so it can *not* be
  rescaled for Play. The two sets are laid out independently; `verify.mjs` asserts the cap.
- **Both stores reject alpha.** Apple made this explicit on 8 Jul 2026 and it is the most
  likely automated-rejection cause, so every export is flattened and `verify.mjs` fails on
  any alpha channel. (The Play *icon* is the one asset that requires alpha — it is not
  produced here.)
- Play metadata policy bans ranking claims, award icons and price/promo text.

## Replacing a capture

Drop a new PNG into `captures/ios/` under the same name and re-run. Notes:

- Any modern full-screen iPhone works. The art sits ~1000px wide inside a 1320px canvas, so
  a 1206×2622 capture is downscaled, never upscaled.
- Capture in **dark theme** — the art direction depends on dark UI against light sage.
- **Never crop a capture horizontally.** Phone UI runs edge to edge; cropping the sides cuts
  real content (button labels, the gloss column). This was tried and reverted.

## Colour

Values come from the resolved output of `constants/colors.ts`. Do **not** read them from
`app.json`: its `primaryColor` and `expo-notifications.color`, plus `brand/build.py` and
`brand/DESIGN.md`, still hard-code the stale `#568066`. `constants/colors.ts` moved the
light tint to `#507A60` for WCAG AA. The feature graphic therefore renders the ring straight
from `brand/dist/ring/mark.svg` rather than using the pre-built PNGs.
