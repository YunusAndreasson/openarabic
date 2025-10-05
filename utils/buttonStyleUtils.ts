import type { TextStyle, ViewStyle } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';

/**
 * Shared header button container style
 * Used by DoneButton, EditModeButton, and similar header action buttons
 */
export const HEADER_BUTTON_STYLE: ViewStyle = {
  alignItems: 'center',
  borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  justifyContent: 'center',
  minHeight: MIN_TOUCH_TARGET.MEDIUM,
  minWidth: 70,
  paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  paddingVertical: LAYOUT.SPACING.SMALL,
};

/**
 * Shared header button text style
 * Used by DoneButton, EditModeButton, and similar header action buttons
 */
export const HEADER_BUTTON_TEXT_STYLE: TextStyle = {
  fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
  letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.TIGHT,
};
