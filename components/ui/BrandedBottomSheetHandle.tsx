import type { BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { BlurMask, Canvas, RoundedRect } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { withOpacity } from '@/utils/colorUtils';

const PILL_WIDTH = 40;
const PILL_HEIGHT = 5;
const PILL_RADIUS = PILL_HEIGHT / 2;
const GLOW_PADDING = 6;
const GLOW_EXTRA_WIDTH = 8;
const CANVAS_PADDING = 8; // room for both glow + pill rest
const CANVAS_WIDTH = PILL_WIDTH + GLOW_EXTRA_WIDTH + CANVAS_PADDING * 2;
const CANVAS_HEIGHT = PILL_HEIGHT + GLOW_PADDING * 2 + CANVAS_PADDING * 2;

const PILL_X = (CANVAS_WIDTH - PILL_WIDTH) / 2;
const PILL_Y = (CANVAS_HEIGHT - PILL_HEIGHT) / 2;
const GLOW_X = PILL_X - GLOW_EXTRA_WIDTH / 2;
const GLOW_Y = PILL_Y - GLOW_PADDING / 2;
const GLOW_WIDTH = PILL_WIDTH + GLOW_EXTRA_WIDTH;
const GLOW_HEIGHT = PILL_HEIGHT + GLOW_PADDING;
const GLOW_RADIUS = GLOW_HEIGHT / 2;

/**
 * Branded drag handle for BottomSheet/BottomSheetModal — Skia rounded pill
 * sitting on a soft tinted glow halo. Replaces the library default 36×4
 * indicator and keeps a single visual language across every sheet.
 */
const BrandedBottomSheetHandleComponent = (_props: BottomSheetHandleProps) => {
  const colors = useColors();
  const pillColor = colors.modalIndicator;
  const glowColor = withOpacity(colors.tint, 0.25);

  return (
    <View style={styles.container} pointerEvents="none">
      <Canvas style={styles.canvas}>
        {/* Tinted halo behind the pill */}
        <RoundedRect
          x={GLOW_X}
          y={GLOW_Y}
          width={GLOW_WIDTH}
          height={GLOW_HEIGHT}
          r={GLOW_RADIUS}
          color={glowColor}
        >
          <BlurMask blur={5} style="normal" />
        </RoundedRect>
        {/* Solid pill on top */}
        <RoundedRect
          x={PILL_X}
          y={PILL_Y}
          width={PILL_WIDTH}
          height={PILL_HEIGHT}
          r={PILL_RADIUS}
          color={pillColor}
        />
      </Canvas>
    </View>
  );
};

export const BrandedBottomSheetHandle = memo(BrandedBottomSheetHandleComponent);

BrandedBottomSheetHandle.displayName = 'BrandedBottomSheetHandle';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },
});
