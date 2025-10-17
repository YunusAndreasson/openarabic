import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { ReviewAction } from '@/types/enums';

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

const createIconProps = (name: ComponentProps<typeof Ionicons>['name'], color: string) => ({
  name,
  size: BOTTOM_ACTIONS_CONSTANTS.ICON_SIZE,
  color,
});

export const ReviewBottomActions: FC = () => {
  const colors = useColors();

  const tintError = colors.error + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;
  const tintSuccess = colors.success + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;

  const leftIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintError }];
  const rightIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintSuccess }];

  const leftTextStyle = [STATIC_STYLES.indicatorText, { color: colors.error }];
  const rightTextStyle = [STATIC_STYLES.indicatorText, { color: colors.success }];

  return (
    <View style={STATIC_STYLES.container}>
      {/* Left indicator */}
      <View style={STATIC_STYLES.indicatorContainer}>
        <View style={leftIndicatorStyle}>
          <Ionicons {...createIconProps('chevron-back', colors.error)} />
        </View>
        <ThemedText style={leftTextStyle}>{ReviewAction.DONT_KNOW}</ThemedText>
      </View>

      {/* Right indicator */}
      <View style={STATIC_STYLES.indicatorContainer}>
        <View style={rightIndicatorStyle}>
          <Ionicons {...createIconProps('chevron-forward', colors.success)} />
        </View>
        <ThemedText style={rightTextStyle}>{ReviewAction.KNOW}</ThemedText>
      </View>
    </View>
  );
};

ReviewBottomActions.displayName = 'ReviewBottomActions';

