import type { ReactElement } from 'react';
import { drawAsPicture, rect, Skia, type SkImage } from 'react-native-skia';

interface SpriteSize {
  width: number;
  height: number;
}

/**
 * A sprite for an `Atlas`, drawn into a raster surface on the JS thread: a CPU
 * image, made without the GPU. Null when it could not be made; a sprite that
 * did not bake is a layer that does not draw, never a throw.
 *
 * Not `useTexture`. That hook draws its picture into a GPU surface and flushes
 * it on the UI runtime (`scheduleOnUI`), and a throw there takes the app down:
 * a device where Skia found no GPU adapter crashed on the practice screen
 * (OPENARABIC-T7). On iOS the UI runtime is the main thread, so the same flush
 * also holds the app while Metal compiles the pipelines it needs.
 *
 * Graphite draws GPU images only and hands any other image to react-native-
 * skia's image provider, which uploads it once from the canvas's render thread
 * and keeps the texture for every canvas that draws it, and again after a lost
 * GPU device has been replaced.
 */
export async function bakeRasterSprite(
  element: ReactElement,
  size: SpriteSize,
): Promise<SkImage | null> {
  try {
    const picture = await drawAsPicture(element, rect(0, 0, size.width, size.height));
    const surface = Skia.Surface.MakeRaster(size.width, size.height);
    if (!surface) {
      picture.dispose();
      return null;
    }
    surface.getCanvas().drawPicture(picture);
    const image = surface.makeImageSnapshot();
    surface.dispose();
    picture.dispose();
    return image;
  } catch {
    return null;
  }
}
