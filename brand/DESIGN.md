# The OpenArabic mark

A geometric definition of the app mark, its proportions, and its colours.
Every asset in `dist/` is generated from this definition by `build.py` — nothing
is drawn by hand, so the artwork can be rebuilt at any size without drift.

**The mark is the ring**, built on golden proportions: `dist/ring/`.
The silhouette is unchanged from what ships today — existing users see the same
mark, drawn correctly. The alternative that merges an `a` into it is documented
in §4 and built into `dist/a/`, but is not the recommendation.

---

## 1. What was wrong with the current mark

Measured off the shipped `assets/images/oaLogo.png` (1024×1024), sampling the
outer edge, inner edge and stroke along 720 rays from the ink centroid.

|                 | measured                               | should be      |
| --------------- | -------------------------------------- | -------------- |
| Bounding box    | 778 × 761 px                           | square         |
| Outer radius    | 377.25 → 392.50 px (**3.96 %** spread) | constant       |
| Stroke width    | 72.50 → 85.25 px (**16.0 %** spread)   | constant       |
| Ink centroid    | (514.55, 497.26)                       | (511.5, 511.5) |
| Margins L/R/T/B | 125 / 121 / 119 / 144                  | equal          |

So it is not a circle — it is an ellipse 2.2 % wider than tall, drawn with a
stroke that varies by a sixth of its own width, sitting 14 px above centre.
None of this is visible at a glance, which is exactly why it is worth fixing:
it reads as _slightly_ wrong rather than wrong, and that is the difference
between artwork that feels drawn and artwork that feels drafted.

### It was also clipped on every Android launcher

`app.json` feeds the same 1024 px file to `android.adaptiveIcon.foregroundImage`.
Android maps it onto a 108 dp canvas of which only the middle **72 dp** survives
masking, with a **66 dp** safe zone. The ring lands at **82 dp** wide — an outer
radius of 41 dp against a 36 dp visible radius. The outer edge is cut off
entirely, and the mark renders as a solid green blob with a hole in it.

### And the colours were the wrong pair

`#568066` is real — it is `tint.primary` from `constants/colors.ts`. But that is
the **light**-theme tint, used on a dark background, which is the one pairing
the app's own colour system never makes. It yields 4.07:1. The background
`#111614` is not in the palette at all: its chroma is 0.009, where every colour
in the sage family sits between 0.020 and 0.026.

---

## 2. The construction

A ring has exactly one free proportion — how thick the stroke is relative to the
diameter — so that is where φ goes.

There are two distinct ways to put a golden ratio into an annulus, and they give
very different marks:

|        | relation                                       | r/R       | w/D       |                       |
| ------ | ---------------------------------------------- | --------- | --------- | --------------------- |
| **G1** | radii in golden ratio, `R : r = φ : 1`         | 0.6180340 | 0.1909830 | ink is φ× the counter |
| **G2** | areas in golden ratio, `ink : counter = 1 : φ` | 0.7861514 | 0.1069243 | `R² : r² = φ : 1`     |

**G2 is the mark.** Three reasons:

- **It is the more meaningful golden claim.** What the eye reads in a ring is the
  balance of stroke against the void it encloses, not the ratio of two radii it
  cannot see. G2 puts _those two areas_ in golden ratio.
- **It preserves the mark.** G2's stroke is `0.10692 D`; the shipped mark's is
  `0.10243 D`. That is a 4 % difference — imperceptible. The mark users already
  know is, near enough, already this shape. It was simply never drawn exactly.
- **It survives small sizes.** At 29 px G1's counter closes to a pinhole and the
  mark reads as a filled blob. G2 stays open.

So the ring is defined by:

```
r / R  = 1 / √φ   = 0.78615138          counter diameter = 0.78615 D
w / D  = (1 − 1/√φ) / 2 = 0.10692431    stroke
R² : r²  = φ : 1
ink area : counter area = 1 : φ
```

These are irrational by construction — that is what a golden proportion is — so
the SVG carries them to five decimals rather than snapping to an integer grid.

### The canvas

The same ratio sets the placement. With `D = C / φ`, the mark's diameter and the
total margin around it are themselves in golden ratio:

```
D            = C / φ        = 632.87 px on a 1024 canvas
margin, each = (C − D) / 2  = 195.57 px
D : (2 × margin) = φ : 1
```

No optical correction is applied or needed: a circle is symmetric about both
axes, so geometric and optical centre coincide. The mark sits at exactly
(511.5, 511.5).

### What is deliberately not done

The stroke modulation a type designer would put on a letter `O` — thinning the
top and bottom by 12–18 % — is **not** applied. This is a symbol, not a glyph.
Monolinear survives scaling, monochrome, embroidery and Android's themed-icon
tint; modulation would only pay off in a wordmark.

### Verification

Measured back off the rendered PNG along 900 rays:

|                  | measured         | target         |
| ---------------- | ---------------- | -------------- |
| Outer diameter   | 632.870 px       | 632.867        |
| `r / R`          | 0.786199         | 0.786151       |
| `R² / r²`        | 1.617837         | 1.618034 (φ)   |
| ink : counter    | 1 : 1.61855      | 1 : 1.61803    |
| Roundness spread | 1.40 px (0.44 %) | —              |
| Centre           | (511.5, 511.5)   | (511.5, 511.5) |

The residual 0.44 % roundness spread is the ±0.5 px quantisation of the
threshold-based edge finder, not a defect in the artwork. Compare the 3.96 %
and 16.0 % in §1, which are real.

---

## 3. Colour

No new colours. The icon is the app's own tint on the app's own background, per
appearance — the same pairing `constants/colors.ts` already makes in the UI.

| appearance           | mark      | background  | token                                | contrast |
| -------------------- | --------- | ----------- | ------------------------------------ | -------- |
| Light                | `#568066` | `#F2F7F4`   | `tint.primary` on `sage.lighter`     | 4.15:1   |
| Dark                 | `#80B88E` | `#040D07`   | `tint.primaryDark` on `sage.darkest` | 8.60:1   |
| Tinted (iOS)         | `#FFFFFF` | `#000000`   | greyscale; iOS supplies the colour   | —        |
| Monochrome (Android) | `#FFFFFF` | transparent | system supplies the colour           | —        |

The dark pairing more than doubles the contrast of what ships today
(4.07 → 8.60).

---

## 4. The `A` question, for the record

You asked whether an `A` could be merged in. It can — the construction below
works and is built into `dist/a/` — but the ring alone was chosen.

### What does not work

| approach                                         | why not                                                                                                                                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capital `A` inscribed in the ring                | It is the anarchy symbol. Unrecoverable.                                                                                                                                                                         |
| Capital `A` cutting up through the ring's bottom | Still the anarchy symbol; where the legs cross makes no difference.                                                                                                                                              |
| Alif centred in the counter, clear of the ring   | Reads as ⓘ, a battery, or a slider. No Latin `A` reading at all.                                                                                                                                                 |
| Alif spanning the counter, touching the ring     | Reads as θ / Ø / "prohibited".                                                                                                                                                                                   |
| Chevron `Λ` (an `A` with no crossbar)            | Reads as an up-arrow or a caret.                                                                                                                                                                                 |
| Stem descending below the bowl                   | Reads as `q`. A vertical stroke below the bowl on the right _is_ that letter — not an execution problem. The budget before it flips is about `0.2 w`, and at 30 px a tick that small reads as a misaligned edge. |
| Stem entering from below into the counter        | Also `q`.                                                                                                                                                                                                        |

### What does work: the single-storey `a`

A geometric lowercase `a` — the Futura construction — is _exactly_ a circle plus
a vertical stem at its right edge, so the ring need not change at all. Built on a
rational 8-unit grid (`u = D/8`): outer radius 4u, counter 3u, stroke 1u, stem
`x ∈ [7u, 8u]`. Formally **ring ∪ ([7u, 8u] × [0, 8u])** — the ring's own
right-hand stroke, extruded to full height, so the mark stays monolinear.

It carries three readings from one construction: **O** (the unchanged ring),
**ا** (alif, on the right where Arabic begins), **a** (Arabic). The Arabic ا and
the Latin A are the same letter historically, both descending from the
Phoenician _ʾālep_.

Note that this variant is built on the 8-unit grid, **not** on φ — a stem needs
a rational relationship to the ring or the join stops being exact. Choosing the
ring is also choosing the golden system; the two do not mix.

Two sub-variants were tested and are described but not built: moving the stem
inward by `0.5u` or `0.9u` while clipping the bowl at the stem, which gives a
tighter mark with a flat right side. Without that clip the bowl bulges past the
stem and leaves a lump.

---

## 5. Platform geometry

| target                      | canvas | D          | relation                  |
| --------------------------- | ------ | ---------- | ------------------------- |
| iOS icon                    | 1024   | **632.87** | `C / φ`                   |
| Android adaptive foreground | 1024   | **625.78** | 66 dp — the safe-zone cap |
| Splash / web / favicon      | 1024   | 632.87     | `C / φ`                   |

A ring has no corners, so unlike the `a` its furthest point from centre is just
`D/2`. The binding constraint is Android's **66 dp safe zone** (`D ≤ 625.78 px`),
which the golden `C/φ` exceeds by 0.75 dp — so the Android foreground is capped
at 66 dp exactly, 1.1 % under golden. The difference is imperceptible and the
mark stays visually identical across platforms.

### Stroke weight at real sizes

| icon                 | mark D | stroke |
| -------------------- | ------ | ------ |
| 1024 px              | 632.9  | 67.7   |
| 180 px (60 pt @3×)   | 111.2  | 11.9   |
| 120 px (60 pt @2×)   | 74.2   | 7.9    |
| 60 px                | 37.1   | 4.0    |
| 40 px                | 24.7   | 2.6    |
| 29 px (settings @1×) | 17.9   | 1.9    |

---

## 6. Usage rules

- **Clear space:** `D / 2φ` = `0.309 D` on all sides — which is exactly the
  margin the icon canvas uses, so the icon _is_ the clear-space diagram.
- **Minimum size:** 24 px. Below that the stroke drops under 1.6 px and the
  counter starts to fill.
- **Never** re-stroke, outline, add a gradient, or squash it. The mark is a
  filled path with one colour.
- **Never** place it on a background at less than 3:1 against it. On photography,
  use a solid plate.
- On the sepia theme, use the dark-appearance mark. The sepia tint (`#A0662F`)
  is an interface accent, not a brand colour.

---

## 7. Assets

`python3 brand/build.py` regenerates everything. Requires `rsvg-convert`.

```
brand/
  src/mark-ring.svg           the ring, fill="currentColor"   ← the mark
  src/mark-a.svg              the 'a' alternative
  dist/ring/                  ← use these
    icon.png                  1024  iOS light appearance
    icon-dark.png             1024  iOS dark appearance
    icon-tinted.png           1024  iOS tinted appearance (greyscale)
    adaptive-foreground.png   1024  Android, transparent
    adaptive-monochrome.png   1024  Android 13+ themed icons, transparent
    mark-light.png            1024  transparent, light tint  (web / social)
    mark-dark.png             1024  transparent, dark tint
    splash.png                1024  splash screen
    favicon.png               196
    mark.svg                  vector source
  dist/a/                     same set, 'a' silhouette
```

### Wiring — applied

`app.json` now points at the generated assets. What changed:

| key                                    | was                      | now                       |
| -------------------------------------- | ------------------------ | ------------------------- |
| `icon`                                 | `oaIcon.png`             | `icon.png`                |
| `backgroundColor`                      | `#111614`                | `#040D07`                 |
| `ios.icon`                             | _(absent)_               | `{ light, dark, tinted }` |
| `android.adaptiveIcon.backgroundColor` | `#111614`                | `#040D07`                 |
| `android.adaptiveIcon.foregroundImage` | `oaIcon.png`             | `adaptive-foreground.png` |
| `android.adaptiveIcon.monochromeImage` | _(absent)_               | `adaptive-monochrome.png` |
| `expo-splash-screen` image / bg        | `oaIcon.png` / `#111614` | `splash.png` / `#040D07`  |
| `expo-notifications.icon`              | `oaIcon.png`             | `notification-icon.png`   |

Three of those are new capability rather than repair:

- **`ios.icon` as an object** gives iOS 18+ its light / dark / tinted appearances.
- **`monochromeImage`** gives Android 13+ a real themed icon. Previously the
  `<monochrome>` layer was absent from `ic_launcher.xml` entirely.
- **`notification-icon.png`** fixes a live bug. Android draws the notification
  small icon from the **alpha channel alone** and tints it; `oaIcon.png` was
  fully opaque (alpha 255 everywhere), so the notification icon rendered as a
  solid filled square. The replacement is a white ring on transparent.

`oaIcon.png` and the unreferenced `assets/icon.png` symlink were removed.
`assets/images/oaLogo.png` and its copies in `admin-dashboard/public/` and
`social/assets/` were replaced with `mark-light.png` — same colour (`#568066`)
and same transparency as before, so those surfaces are unaffected apart from the
corrected geometry.

### Verified after `expo prebuild --platform android`

| check                                                 | result            |
| ----------------------------------------------------- | ----------------- |
| `<monochrome>` layer present in `ic_launcher.xml`     | yes               |
| `iconBackground` colour                               | `#040D07`         |
| foreground has transparency                           | yes (alpha min 0) |
| ring outer radius                                     | 32.997 dp         |
| ink outside the 72 dp mask circle                     | **0 px**          |
| ink outside the 66 dp safe zone                       | **0 px**          |
| `notification_icon.png` alpha-based, white silhouette | yes               |

### Web and social surfaces

The mark is also consumed outside the app, and those surfaces size the whole
PNG canvas rather than the ring inside it — so the **framing matters as much as
the geometry**. `logo-web.png` is therefore built at `D = 770 px`, matching the
old `oaLogo.png`'s mean outer diameter (770.2 px), which makes it a true
drop-in: every downstream consumer renders the ring at the same size it did
before. Using the icon framing (`C/φ = 632.87`) instead would have shrunk it by
19 % everywhere.

| file                                 | source                  | notes                                                                                                            |
| ------------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `admin-dashboard/public/oaLogo.png`  | `logo-web.png`          | light tint, site is light-themed                                                                                 |
| `admin-dashboard/app/icon.png`       | `favicon.png`           | `D = 0.88 C` — a favicon renders at 16 px, so the mark fills more of the canvas to keep the stroke above a pixel |
| `admin-dashboard/app/apple-icon.png` | `apple-icon.png`        | **opaque** — iOS puts no background behind an apple-touch-icon, so transparency would render black               |
| `social/assets/oaLogo.png`           | `logo-web-**dark**.png` | the cards are dark, so this takes `tint.primaryDark`                                                             |
| `assets/images/oaLogo.png`           | `logo-web.png`          | the source copy the other two are cut from                                                                       |

`social/lib/card.mjs` composes the footer lockup from that PNG. Two fixes there:

- It was given the **light** tint on a dark card — the same wrong pairing as the
  old app icon. The ring read as dim next to the near-white wordmark text. It
  now takes `#80B88E`.
- `COLORS.bg` was `#111614`, commented "app dark background / icon bg", which
  was true of neither. Now `#040D07` (`sage.darkest`), so a card and the app
  icon side by side are the same surface.

`card.mjs`'s other colours are hand-tuned for feed legibility (`sage: #7dae8d`
for the Arabic word is deliberately brighter than the palette) and were left
alone. Verified by running `npm run card:sample` and looking at the output.

**Not regenerated:** `admin-dashboard/public/og.png` is a 1200×630 hand-composed
graphic with the old ring baked into its wordmark. There is no generator for it
in the repo. At the size the ring appears there the difference is not visible,
but it will drift further if the mark changes again.

### Still to do

The icon is **native**, so it ships in a binary — an OTA (`yarn ota*`) will not
change it. It needs `yarn release`. `runtimeVersion` does not need bumping: no
native module surface changed, so existing OTA compatibility is unaffected.

The iOS dark and tinted appearances are composited by iOS itself and have not
been seen on a device — worth eyeballing on the first TestFlight build.
