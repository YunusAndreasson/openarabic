import type { ReactNode } from 'react';
import { useState } from 'react';

import { isSkiaGpuMissing } from '@/hooks/theme/useSkiaGpuAvailable';

interface SkiaDrawingProps {
  /** The drawing: a canvas and whatever only labels it (axis captions, a legend). */
  children: ReactNode;
}

/**
 * A Skia drawing, or nothing on a device with no GPU for Skia
 * (`isSkiaGpuMissing`), where its canvas could only stay blank and its axis
 * labels would label nothing. Wrap the drawing alone: the numbers and the
 * sentence that a card or sheet says around it stay, and say what the drawing
 * showed. Read once per mount, since a missing GPU never comes back.
 *
 * The Arabic is not wrapped in this: it falls back to plain Text instead
 * (`useSkiaGpuAvailable`), because the words are the content.
 */
export function SkiaDrawing({ children }: SkiaDrawingProps): ReactNode {
  const [gpuMissing] = useState(isSkiaGpuMissing);
  return gpuMissing ? null : children;
}
