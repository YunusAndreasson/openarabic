import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ContextualHelpType } from '@/constants/tutorials';
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
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    width: '100%',
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    height: BOTTOM_ACTIONS_CONSTANTS.CONTAINER_HEIGHT,
  },
  indicatorContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: LAYOUT.OPACITY.MEDIUM,
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
    fontFamily: FONTS.ENGLISH,
    textAlign: 'center',
    lineHeight: BOTTOM_ACTIONS_CONSTANTS.TEXT_LINE_HEIGHT,
  },
});

const createIconProps = (name: ComponentProps<typeof Ionicons>['name'], color: string) => ({
  name,
  size: BOTTOM_ACTIONS_CONSTANTS.ICON_SIZE,
  color,
});

interface ReviewBottomActionsProps {
  onShowContextualHelp?: (helpType: ContextualHelpType) => void;
}

export const ReviewBottomActions: FC<ReviewBottomActionsProps> = ({ onShowContextualHelp }) => {
  const colors = useColors();

  const tintError = colors.error + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;
  const tintSuccess = colors.success + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;

  const leftIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintError }];
  const rightIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintSuccess }];

  const leftTextStyle = [STATIC_STYLES.indicatorText, { color: colors.error }];
  const rightTextStyle = [STATIC_STYLES.indicatorText, { color: colors.success }];

  const handleLeftPress = () => {
    onShowContextualHelp?.(ContextualHelpType.SWIPE_LEFT);
  };

  const handleRightPress = () => {
    onShowContextualHelp?.(ContextualHelpType.SWIPE_RIGHT);
  };

  return (
    <View style={STATIC_STYLES.container}>
      {/* Left indicator - Unknown (tappable to show contextual help) */}
      <Pressable style={STATIC_STYLES.indicatorContainer} onPress={handleLeftPress}>
        <View style={leftIndicatorStyle}>
          <Ionicons {...createIconProps('chevron-back', colors.error)} />
        </View>
        <ThemedText style={leftTextStyle}>{ReviewAction.DONT_KNOW}</ThemedText>
      </Pressable>

      {/* Right indicator - Known (tappable to show contextual help) */}
      <Pressable style={STATIC_STYLES.indicatorContainer} onPress={handleRightPress}>
        <View style={rightIndicatorStyle}>
          <Ionicons {...createIconProps('chevron-forward', colors.success)} />
        </View>
        <ThemedText style={rightTextStyle}>{ReviewAction.KNOW}</ThemedText>
      </Pressable>
    </View>
  );
};

ReviewBottomActions.displayName = 'ReviewBottomActions';
