import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

/**
 * Return type for bottom sheet dynamic styles.
 */
interface BottomSheetDynamicStyles {
  /** Style for BottomSheet backgroundStyle prop */
  bottomSheet: StyleProp<ViewStyle>;
}

/**
 * Shared hook for bottom sheet dynamic style computation.
 * Returns the theme-aware background style. Sheets use BrandedBottomSheetHandle
 * via `handleComponent`, so a separate indicator style isn't needed here.
 */
export function useBottomSheetDynamicStyles(): BottomSheetDynamicStyles {
  const colors = useColors();

  return useMemo(
    () => ({
      bottomSheet: [LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet, { backgroundColor: colors.elevation1 }],
    }),
    [colors.elevation1],
  );
}
