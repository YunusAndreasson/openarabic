#!/usr/bin/env python3
"""Regenerate every OpenArabic brand asset from the geometric definition.

The mark is defined once (see DESIGN.md). Nothing here is hand-drawn: every
coordinate is derived from the outer diameter D, so the artwork can be rebuilt
at any size without drift.

    python3 brand/build.py

Requires: rsvg-convert (librsvg).
"""

from __future__ import annotations

import math
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

PHI = (1 + 5 ** 0.5) / 2

# ---------------------------------------------------------------- palette
# Every value is taken from constants/colors.ts — no new colours are invented.
TINT_LIGHT = '#568066'   # tint.primary       — the app's light-theme tint
TINT_DARK = '#80B88E'    # tint.primaryDark   — the app's dark-theme tint
BG_LIGHT = '#F2F7F4'     # sage.lighter       — the app's light-theme background
BG_DARK = '#040D07'      # sage.darkest       — the app's dark-theme background

# ---------------------------------------------------------------- geometry
CANVAS = 1024

# The ring: ink area and counter area stand in golden ratio (1 : phi), which is
# the same as saying R^2 : r^2 = phi : 1.
RING_R_RATIO = 1 / math.sqrt(PHI)          # r / R  = 0.7861514
RING_W_RATIO = (1 - RING_R_RATIO) / 2      # w / D  = 0.1069243

# iOS: the mark and the total margin also stand in golden ratio, so D = C / phi.
D_IOS = CANVAS / PHI                       # 632.87 px
# Android: capped to the 66 dp safe zone, which a ring must not exceed.
D_ANDROID = CANVAS * 66 / 108              # 625.78 px = 66.00 dp
# Web/social: matches the old oaLogo.png's mean outer diameter so downstream
# consumers that size the whole canvas render the ring at the same size.
D_WEB = 770
# Favicons render at 16 px; fill more of the canvas so the stroke survives.
D_FAVICON = CANVAS * 0.88                  # 901.12 px


def ring_path(D: float, cx: float, cy: float) -> str:
    """Even-odd annulus: two concentric circles wound in opposite directions."""
    R = D / 2
    r = R * RING_R_RATIO

    def circ(rr: float, sweep: int) -> str:
        return (f'M {cx - rr:.5f} {cy:.5f} '
                f'A {rr:.5f} {rr:.5f} 0 1 {sweep} {cx + rr:.5f} {cy:.5f} '
                f'A {rr:.5f} {rr:.5f} 0 1 {sweep} {cx - rr:.5f} {cy:.5f} Z')

    return f'{circ(R, 1)} {circ(r, 0)}'


# The alternative mark, kept for reference: the ring plus a tangent stem, which
# reads as a single-storey 'a'. Built on a rational 8-unit grid, not on phi.
MARK_A = ('M 0 4 A 4 4 0 1 1 8 4 A 4 4 0 1 1 0 4 Z '
          'M 1 4 A 3 3 0 1 0 7 4 A 3 3 0 1 0 1 4 Z '
          'M 7 0 H 8 V 8 H 7 Z')
D_IOS_A, D_ANDROID_A = 640, 480            # 5/8 and 15/32 of the canvas
SHIFT_A = 3 / 80                           # optical shift, leftward


def source_svg(inner: str, viewbox: str) -> str:
    return ('<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="{viewbox}" width="512" height="512" fill="currentColor">\n'
            f'  {inner}\n</svg>\n')


def compose(variant: str, D: float, fg: str, bg: str | None,
            canvas: int = CANVAS) -> str:
    """Place the mark on a square canvas at outer diameter D."""
    rect = f'<rect width="{canvas}" height="{canvas}" fill="{bg}"/>' if bg else ''
    if variant == 'ring':
        c = canvas / 2   # a circle is symmetric; no optical shift is needed
        shape = f'<path d="{ring_path(D, c, c)}" fill="{fg}" fill-rule="evenodd"/>'
    else:
        s = D / 8.0
        dx = (canvas - D) / 2.0 - D * SHIFT_A
        dy = (canvas - D) / 2.0
        shape = (f'<g transform="translate({dx:.4f} {dy:.4f}) scale({s:.6f})">'
                 f'<path fill-rule="nonzero" fill="{fg}" d="{MARK_A}"/></g>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" '
            f'width="{canvas}" height="{canvas}" viewBox="0 0 {canvas} {canvas}">'
            f'{rect}{shape}</svg>')


def write(path: str, text: str) -> str:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(text)
    return path


def png(svg_text: str, out: str, size: int = CANVAS) -> str:
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + '.tmp.svg'
    write(tmp, svg_text)
    subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), '-o', out, tmp],
                   check=True)
    os.remove(tmp)
    return out


def build(variant: str) -> None:
    out = os.path.join(ROOT, 'dist', variant)
    d_ios = D_IOS if variant == 'ring' else D_IOS_A
    d_and = D_ANDROID if variant == 'ring' else D_ANDROID_A

    # colour-agnostic vector source, normalised to its own box
    if variant == 'ring':
        src = source_svg(f'<path d="{ring_path(1000, 500, 500)}" fill-rule="evenodd"/>',
                         '0 0 1000 1000')
    else:
        src = source_svg(f'<path fill-rule="nonzero" d="{MARK_A}"/>', '0 0 8 8')
    write(os.path.join(SRC, f'mark-{variant}.svg'), src)
    write(f'{out}/mark.svg', src)

    # --- iOS: one appearance-matched pair, using the app's own tokens --------
    png(compose(variant, d_ios, TINT_LIGHT, BG_LIGHT), f'{out}/icon.png')
    png(compose(variant, d_ios, TINT_DARK, BG_DARK), f'{out}/icon-dark.png')
    # Tinted: iOS supplies the colour, so the artwork is greyscale.
    png(compose(variant, d_ios, '#FFFFFF', '#000000'), f'{out}/icon-tinted.png')

    # --- Android: transparent, so the adaptive background layer shows through -
    png(compose(variant, d_and, TINT_DARK, None), f'{out}/adaptive-foreground.png')
    png(compose(variant, d_and, '#FFFFFF', None), f'{out}/adaptive-monochrome.png')

    # --- Android notification small icon ------------------------------------
    # Android draws this from the alpha channel alone and tints it, so it must
    # be a white silhouette on transparent. It also renders at 24 dp, so the
    # mark is set larger here than in the launcher icon to keep any presence.
    png(compose(variant, CANVAS * 0.80, '#FFFFFF', None), f'{out}/notification.png')

    # --- web / social / splash ----------------------------------------------
    png(compose(variant, d_ios, TINT_LIGHT, None), f'{out}/mark-light.png')
    png(compose(variant, d_ios, TINT_DARK, None), f'{out}/mark-dark.png')
    png(compose(variant, d_ios, TINT_DARK, BG_DARK), f'{out}/splash.png')

    # logo-web is framed to match the *old* oaLogo.png (mean outer diameter
    # 770 px on a 1024 canvas) so it is a true drop-in for the website
    # components and social/lib/card.mjs, which both size it by the whole
    # canvas and compensate for its internal padding.
    png(compose(variant, D_WEB, TINT_LIGHT, None), f'{out}/logo-web.png')
    # ...and the dark-appearance twin, for the social cards, which are dark.
    png(compose(variant, D_WEB, TINT_DARK, None), f'{out}/logo-web-dark.png')
    # A favicon renders at 16 px, so the mark is set larger to keep the stroke
    # above a pixel.
    png(compose(variant, D_FAVICON, TINT_LIGHT, None), f'{out}/favicon.png', size=512)
    # apple-touch-icon: iOS puts no background behind it, so it must be opaque.
    png(compose(variant, d_ios, TINT_LIGHT, BG_LIGHT), f'{out}/apple-icon.png')

    print(f'  {variant:5s} D_ios={d_ios:7.2f}  D_android={d_and:7.2f}  -> brand/dist/{variant}/')


def main() -> int:
    if subprocess.run(['which', 'rsvg-convert'], capture_output=True).returncode != 0:
        print('error: rsvg-convert not found (install librsvg)', file=sys.stderr)
        return 1
    print('Building OpenArabic brand assets')
    print(f'  ring: w/D = {RING_W_RATIO:.7f}   r/R = {RING_R_RATIO:.7f}   '
          f'ink:counter = 1:{PHI:.6f}')
    for variant in ('ring', 'a'):
        build(variant)
    print('done.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
