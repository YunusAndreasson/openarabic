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
  /** Style for BottomSheet handleIndicatorStyle prop */
  indicator: StyleProp<ViewStyle>;
}

/**
 * Shared hook for bottom sheet dynamic style computation.
 * Centralizes the memoized theme-aware styles used by SettingsPicker, TimePicker, etc.
 *
 * @returns Memoized dynamic styles for bottom sheet background and indicator
 *
 * @example
 * const { bottomSheet, indicator } = useBottomSheetDynamicStyles();
 *
 * <BottomSheet
 *   backgroundStyle={bottomSheet}
 *   handleIndicatorStyle={indicator}
 *   ...
 * />
 */
export function useBottomSheetDynamicStyles(): BottomSheetDynamicStyles {
  const colors = useColors();

  return useMemo(
    () => ({
      bottomSheet: [LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [LAYOUT.BOTTOM_SHEET.STYLES.indicator, { backgroundColor: colors.modalIndicator }],
    }),
    [colors.elevation1, colors.modalIndicator],
  );
}
