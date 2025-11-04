import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { ReviewAction } from '@/types/enums';
import { selectionFeedback } from '@/utils/haptics';

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

interface ReviewBottomActionsProps {
  onKnownPress?: () => void;
  onUnknownPress?: () => void;
  disabled?: boolean;
}

export const ReviewBottomActions: FC<ReviewBottomActionsProps> = ({
  onKnownPress,
  onUnknownPress,
  disabled = false,
}) => {
  const colors = useColors();

  // Press animations for both buttons
  const unknownPressAnimation = usePressAnimation({ type: 'button' });
  const knownPressAnimation = usePressAnimation({ type: 'button' });

  const tintError = colors.error + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;
  const tintSuccess = colors.success + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;

  const leftIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintError }];
  const rightIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintSuccess }];

  const leftTextStyle = [
    STATIC_STYLES.indicatorText,
    { color: colors.error },
    disabled && { opacity: LAYOUT.OPACITY.SUBTLE },
  ];
  const rightTextStyle = [
    STATIC_STYLES.indicatorText,
    { color: colors.success },
    disabled && { opacity: LAYOUT.OPACITY.SUBTLE },
  ];

  const handleUnknownPress = () => {
    if (!disabled && onUnknownPress) {
      selectionFeedback();
      onUnknownPress();
    }
  };

  const handleKnownPress = () => {
    if (!disabled && onKnownPress) {
      selectionFeedback();
      onKnownPress();
    }
  };

  return (
    <View style={STATIC_STYLES.container}>
      {/* Left indicator - Unknown */}
      <Pressable
        style={STATIC_STYLES.indicatorContainer}
        onPress={handleUnknownPress}
        onPressIn={unknownPressAnimation.handlePressIn}
        onPressOut={unknownPressAnimation.handlePressOut}
        disabled={disabled}
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      >
        <Animated.View style={[leftIndicatorStyle, unknownPressAnimation.animatedStyle]}>
          <Ionicons {...createIconProps('chevron-back', colors.error)} />
        </Animated.View>
        <ThemedText style={leftTextStyle}>{ReviewAction.DONT_KNOW}</ThemedText>
      </Pressable>

      {/* Right indicator - Known */}
      <Pressable
        style={STATIC_STYLES.indicatorContainer}
        onPress={handleKnownPress}
        onPressIn={knownPressAnimation.handlePressIn}
        onPressOut={knownPressAnimation.handlePressOut}
        disabled={disabled}
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      >
        <Animated.View style={[rightIndicatorStyle, knownPressAnimation.animatedStyle]}>
          <Ionicons {...createIconProps('chevron-forward', colors.success)} />
        </Animated.View>
        <ThemedText style={rightTextStyle}>{ReviewAction.KNOW}</ThemedText>
      </Pressable>
    </View>
  );
};

ReviewBottomActions.displayName = 'ReviewBottomActions';
