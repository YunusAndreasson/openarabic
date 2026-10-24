import { useLayoutEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
import type { LayoutChangeEvent, View } from 'react-native';

interface MeasuredWidth {
  /** Attach to the view whose width the chart fills. */
  ref: RefObject<ComponentRef<typeof View> | null>;
  /** Attach to the same view, so a later resize is followed. */
  onLayout: (event: LayoutChangeEvent) => void;
  /** Its width in points; `null` until it has been laid out. */
  width: number | null;
}

/**
 * The width a chart actually has, read off the view it sits in.
 *
 * The charts used to work it out from the window — `windowWidth` less the
 * padding they assumed their container had — and the guess was wrong wherever
 * the container differed: the streak sheet insets its content 12pt a side, not
 * the 24 the chart subtracted, so its bars sat 12pt inside the text above them.
 *
 * Read before the first paint, the way the reader's sentences read theirs
 * (SkiaSentenceWords): Fabric has laid the view out by the time a layout effect
 * runs, and the state update re-renders before the frame, so a chart never
 * draws at a provisional width and then jumps. `onLayout` follows later
 * resizes. Until there is a width a caller draws nothing, at the height it will
 * have, so a sheet fitted to its content keeps its height.
 */
export function useMeasuredWidth(): MeasuredWidth {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (width !== null || !node || typeof node.getBoundingClientRect !== 'function') {
      return;
    }
    const measured = node.getBoundingClientRect().width;
    if (measured > 0) {
      setWidth(measured);
    }
  }, [width]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && next !== width) {
      setWidth(next);
    }
  };

  return { ref, onLayout, width };
}
