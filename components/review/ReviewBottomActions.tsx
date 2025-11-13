import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ToastType } from '@/types/enums';
import { useColors } from '@/hooks/theme/useColors';
import { ReviewAction } from '@/types/enums';
import { lightFeedback } from '@/utils/haptics';
import { useReviewToast } from '@/hooks/review/useReviewToast';

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
  onVague?: () => void; // Handler for explicit Vague button press
}

export const ReviewBottomActions: FC<ReviewBottomActionsProps> = ({ onVague }) => {
  const colors = useColors();
  const { showToast } = useReviewToast();

  const tintError = colors.error + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;
  const tintSuccess = colors.success + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;
  const tintWarning = colors.warning + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY;

  const leftIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintError }];
  const centerIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintWarning }];
  const rightIndicatorStyle = [STATIC_STYLES.swipeIndicator, { backgroundColor: tintSuccess }];

  const leftTextStyle = [STATIC_STYLES.indicatorText, { color: colors.error }];
  const centerTextStyle = [STATIC_STYLES.indicatorText, { color: colors.warning }];
  const rightTextStyle = [STATIC_STYLES.indicatorText, { color: colors.success }];

  const handleIndicatorPress = () => {
    lightFeedback();
    showToast(
      "Tap screen (or center button) for hint. After hint: swipe right = vague, left = unknown. Tap word = replay audio.",
      8000,
      ToastType.INFO,
    );
  };

  const handleVaguePress = () => {
    if (onVague) {
      lightFeedback();
      onVague();
    }
  };

  return (
    <View style={STATIC_STYLES.container}>
      {/* Left indicator - Unknown (tappable for educational toast) */}
      <Pressable style={STATIC_STYLES.indicatorContainer} onPress={handleIndicatorPress}>
        <View style={leftIndicatorStyle}>
          <Ionicons {...createIconProps('chevron-back', colors.error)} />
        </View>
        <ThemedText style={leftTextStyle}>{ReviewAction.DONT_KNOW}</ThemedText>
      </Pressable>

      {/* Center button - Vague (tappable to record response) */}
      <Pressable style={STATIC_STYLES.indicatorContainer} onPress={handleVaguePress}>
        <View style={centerIndicatorStyle}>
          <Ionicons {...createIconProps('help-circle', colors.warning)} />
        </View>
        <ThemedText style={centerTextStyle}>Vague</ThemedText>
      </Pressable>

      {/* Right indicator - Known (tappable for educational toast) */}
      <Pressable style={STATIC_STYLES.indicatorContainer} onPress={handleIndicatorPress}>
        <View style={rightIndicatorStyle}>
          <Ionicons {...createIconProps('chevron-forward', colors.success)} />
        </View>
        <ThemedText style={rightTextStyle}>{ReviewAction.KNOW}</ThemedText>
      </Pressable>
    </View>
  );
};

ReviewBottomActions.displayName = 'ReviewBottomActions';
