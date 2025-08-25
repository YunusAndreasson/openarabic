import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, FC } from 'react';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

// ===== INTERFACES =====
interface BatchedBottomActionColors {
  error: string;
  success: string;
}

const BOTTOM_ACTIONS_CONSTANTS = {
  ICON_SIZE: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
  TINT_OPACITY: '20', // 12.5% opacity
  CONTAINER_HEIGHT: LAYOUT.REVIEW.BOTTOM_ACTIONS_HEIGHT,
  MAX_INDICATOR_WIDTH: LAYOUT.REVIEW.INDICATOR_MAX_WIDTH,
  TEXT_LINE_HEIGHT: LAYOUT.SPACING.LARGE,
} as const;

const STATIC_STYLES = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
    height: BOTTOM_ACTIONS_CONSTANTS.CONTAINER_HEIGHT,
  },
  indicatorContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: LAYOUT.OPACITY.MEDIUM,
    flex: 1,
    maxWidth: BOTTOM_ACTIONS_CONSTANTS.MAX_INDICATOR_WIDTH,
    height: '100%',
  },
  swipeIndicator: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  indicatorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    textAlign: 'center',
    lineHeight: BOTTOM_ACTIONS_CONSTANTS.TEXT_LINE_HEIGHT,
  },
});

const createTintColors = (colors: BatchedBottomActionColors) => ({
  error: colors.error + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY,
  success: colors.success + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY,
});

const createIconProps = (name: ComponentProps<typeof Ionicons>['name'], color: string) => ({
  name,
  size: BOTTOM_ACTIONS_CONSTANTS.ICON_SIZE,
  color,
});

const ReviewBottomActionsInternal: FC = memo(() => {
  const colors = useColors();

  const batchedColors = useMemo(
    () => ({
      error: colors.error,
      success: colors.success,
    }),
    [colors.error, colors.success]
  );

  const tintColors = useMemo(() => createTintColors(batchedColors), [batchedColors]);

  const iconComponents = useMemo(
    () => ({
      left: <Ionicons {...createIconProps('chevron-back', batchedColors.error)} />,
      right: <Ionicons {...createIconProps('chevron-forward', batchedColors.success)} />,
    }),
    [batchedColors]
  );

  const indicatorStyles = useMemo(
    () => ({
      leftIndicator: [STATIC_STYLES.swipeIndicator, { backgroundColor: tintColors.error }],
      rightIndicator: [STATIC_STYLES.swipeIndicator, { backgroundColor: tintColors.success }],
    }),
    [tintColors]
  );

  const textStyles = useMemo(
    () => ({
      leftText: [STATIC_STYLES.indicatorText, { color: batchedColors.error }],
      rightText: [STATIC_STYLES.indicatorText, { color: batchedColors.success }],
    }),
    [batchedColors]
  );

  return (
    <View style={STATIC_STYLES.container}>
      {/* Left indicator - Don't know */}
      <View style={STATIC_STYLES.indicatorContainer}>
        <View style={indicatorStyles.leftIndicator}>{iconComponents.left}</View>
        <ThemedText style={textStyles.leftText}>{STRINGS.DONT_KNOW}</ThemedText>
      </View>

      {/* Right indicator - Know */}
      <View style={STATIC_STYLES.indicatorContainer}>
        <View style={indicatorStyles.rightIndicator}>{iconComponents.right}</View>
        <ThemedText style={textStyles.rightText}>{STRINGS.KNOW}</ThemedText>
      </View>
    </View>
  );
});

const ReviewBottomActionsComparison = (_prevProps: unknown, _nextProps: unknown): boolean => {
  // No props to compare anymore
  return true;
};

export const ReviewBottomActions = memo(ReviewBottomActionsInternal, ReviewBottomActionsComparison);

ReviewBottomActions.displayName = 'ReviewBottomActions';

export default ReviewBottomActions;
