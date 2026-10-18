import type { BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

const PILL_WIDTH = 40;
const PILL_HEIGHT = 5;

/**
 * Drag handle for every app-owned BottomSheet: a plain pill in the theme's
 * `modalIndicator` ink.
 *
 * It used to be a Skia canvas painting the pill over a tint halo blurred with a
 * BlurMask — a glow on a grab handle, which has one job (be found) and does it
 * with shape and position alone. The pill keeps the old size; the padding is
 * now the pill's own, not the 14pt of transparent canvas the halo needed above
 * and below it.
 */
const BrandedBottomSheetHandleComponent = (_props: BottomSheetHandleProps) => {
  const colors = useColors();

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.pill, { backgroundColor: colors.modalIndicator }]} />
    </View>
  );
};

export const BrandedBottomSheetHandle = memo(BrandedBottomSheetHandleComponent);

BrandedBottomSheetHandle.displayName = 'BrandedBottomSheetHandle';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  pill: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
});
