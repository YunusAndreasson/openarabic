/**
 * Atlas sprites bake on the CPU, on the JS thread. `useTexture` baked them into
 * a GPU surface on the UI runtime, which threw where Skia found no GPU adapter
 * and took the app down on the practice screen (OPENARABIC-T7).
 */

import { beforeEach, describe, expect, test } from '@jest/globals';
import { Circle, Skia } from 'react-native-skia';
import * as SkiaModule from 'react-native-skia';

import { bakeRasterSprite } from '@/components/common/charts/rasterSprite';

const calls: string[] = [];
const surfaces = Skia.Surface as { MakeRaster: (width: number, height: number) => unknown };
const makeRaster = surfaces.MakeRaster;
const skia = SkiaModule as { drawAsPicture: typeof SkiaModule.drawAsPicture };
const drawAsPicture = skia.drawAsPicture;

beforeEach(() => {
  calls.length = 0;
  surfaces.MakeRaster = makeRaster;
  skia.drawAsPicture = drawAsPicture;
});

describe('bakeRasterSprite', () => {
  test('records the element, rasterizes it at its size, and frees both', async () => {
    skia.drawAsPicture = async (_element, bounds) => {
      calls.push(`picture ${JSON.stringify(bounds)}`);
      return { dispose: () => calls.push('dispose picture') } as never;
    };
    surfaces.MakeRaster = (width, height) => {
      calls.push(`raster ${width}x${height}`);
      return {
        getCanvas: () => ({ drawPicture: () => calls.push('draw') }),
        makeImageSnapshot: () => {
          calls.push('snapshot');
          return { kind: 'raster image' };
        },
        dispose: () => calls.push('dispose surface'),
      };
    };

    const image = await bakeRasterSprite(<Circle cx={3} cy={3} r={3} />, { width: 6, height: 6 });

    expect(image).toEqual({ kind: 'raster image' });
    expect(calls).toEqual([
      'picture {"x":0,"y":0,"width":6,"height":6}',
      'raster 6x6',
      'draw',
      'snapshot',
      'dispose surface',
      'dispose picture',
    ]);
  });

  test('is a missing sprite, not a throw, when no surface can be made', async () => {
    surfaces.MakeRaster = () => null;

    await expect(
      bakeRasterSprite(<Circle cx={3} cy={3} r={3} />, { width: 6, height: 6 }),
    ).resolves.toBeNull();
  });

  test('is a missing sprite, not a rejection, when the element cannot be recorded', async () => {
    skia.drawAsPicture = async () => {
      throw new Error('reconciler');
    };

    await expect(
      bakeRasterSprite(<Circle cx={3} cy={3} r={3} />, { width: 6, height: 6 }),
    ).resolves.toBeNull();
  });
});
