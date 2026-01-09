import type { ReactNode } from 'react';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface HeaderButtonGroupProps {
  /** Button components to render in the group */
  children: ReactNode;
  /** Gap between buttons (defaults to LAYOUT.SPACING.SMALL = 8px) */
  gap?: number;
}

/**
 * Container for grouping multiple header buttons.
 * Provides consistent row layout with proper spacing for iOS glass effect.
 *
 * @example
 * <HeaderButtonGroup>
 *   <DictionaryButton />
 *   <StartReviewButton />
 * </HeaderButtonGroup>
 */
export const HeaderButtonGroup = memo<HeaderButtonGroupProps>(
  ({ children, gap = LAYOUT.SPACING.SMALL }) => {
    return <View style={[styles.container, { gap }]}>{children}</View>;
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

HeaderButtonGroup.displayName = 'HeaderButtonGroup';
