import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, type FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

// ===== STATIC CONSTANTS EXTRACTION (CRITICAL FOR PERFORMANCE) =====
const BOTTOM_ACTIONS_CONSTANTS = {
  ICON_SIZE: 18,
  TINT_OPACITY: '20', // 12.5% opacity
  CONTAINER_HEIGHT: 80,
  MAX_INDICATOR_WIDTH: 90,
  TEXT_LINE_HEIGHT: 16,
} as const;

// ===== STATIC STYLES USING STYLESHEET.CREATE =====
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  indicatorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: BOTTOM_ACTIONS_CONSTANTS.TEXT_LINE_HEIGHT,
  },
  emptyTextSpace: {
    height: BOTTOM_ACTIONS_CONSTANTS.TEXT_LINE_HEIGHT,
  },
});

interface ReviewBottomActionsProps {
  onManageWord: () => void;
  hasCurrentWord: boolean;
}

// ===== HELPER FUNCTIONS EXTRACTED (PURE FUNCTIONS OUTSIDE COMPONENT) =====
const createTintColors = (colors: any) => ({
  error: colors.error + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY,
  success: colors.success + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY,
  settings: colors.captionText + BOTTOM_ACTIONS_CONSTANTS.TINT_OPACITY,
});

const createIconProps = (name: any, color: string) => ({
  name,
  size: BOTTOM_ACTIONS_CONSTANTS.ICON_SIZE,
  color,
});

// ===== COMPONENT WITH ADVANCED OPTIMIZATION =====
const ReviewBottomActionsInternal: FC<ReviewBottomActionsProps> = memo(
  ({ onManageWord, hasCurrentWord }) => {
    const colors = useColors();

    // ===== COLOR BATCHING (PREVENTS MULTIPLE COLOR CALCULATIONS) =====
    const batchedColors = useMemo(
      () => ({
        error: colors.error,
        success: colors.success,
        captionText: colors.captionText,
      }),
      [colors.error, colors.success, colors.captionText]
    );

    // ===== ADVANCED MEMOIZATION =====
    const tintColors = useMemo(() => createTintColors(batchedColors), [batchedColors]);

    // ===== MEMOIZED ICON COMPONENTS (PREVENT RECREATION) =====
    const iconComponents = useMemo(
      () => ({
        left: <Ionicons {...createIconProps('chevron-back', batchedColors.error)} />,
        right: <Ionicons {...createIconProps('chevron-forward', batchedColors.success)} />,
        settings: <Ionicons {...createIconProps('settings-outline', batchedColors.captionText)} />,
      }),
      [batchedColors]
    );

    // ===== MEMOIZED STYLE OBJECTS (PREVENT CHILD RE-RENDERS) =====
    const indicatorStyles = useMemo(
      () => ({
        leftIndicator: [STATIC_STYLES.swipeIndicator, { backgroundColor: tintColors.error }],
        rightIndicator: [STATIC_STYLES.swipeIndicator, { backgroundColor: tintColors.success }],
        settingsIndicator: [
          STATIC_STYLES.swipeIndicator,
          { backgroundColor: tintColors.settings },
          !hasCurrentWord && { opacity: LAYOUT.OPACITY.SUBTLE },
        ],
      }),
      [tintColors, hasCurrentWord]
    );

    const textStyles = useMemo(
      () => ({
        leftText: [STATIC_STYLES.indicatorText, { color: batchedColors.error }],
        rightText: [STATIC_STYLES.indicatorText, { color: batchedColors.success }],
      }),
      [batchedColors]
    );

    // ===== MEMOIZED CHILD PROPS =====
    const touchableProps = useMemo(
      () => ({
        style: indicatorStyles.settingsIndicator,
        onPress: onManageWord,
        disabled: !hasCurrentWord,
        hitSlop: LAYOUT.HIT_SLOP.MEDIUM,
        testID: 'manage-word-button',
      }),
      [indicatorStyles.settingsIndicator, onManageWord, hasCurrentWord]
    );

    return (
      <View style={STATIC_STYLES.container}>
        {/* Left indicator - Don't know */}
        <View style={STATIC_STYLES.indicatorContainer}>
          <View style={indicatorStyles.leftIndicator}>{iconComponents.left}</View>
          <ThemedText style={textStyles.leftText}>Don&apos;t know</ThemedText>
        </View>

        {/* Center - Manage word button */}
        <View style={STATIC_STYLES.indicatorContainer}>
          <TouchableOpacity {...touchableProps}>{iconComponents.settings}</TouchableOpacity>
          <View style={STATIC_STYLES.emptyTextSpace} />
        </View>

        {/* Right indicator - Know */}
        <View style={STATIC_STYLES.indicatorContainer}>
          <View style={indicatorStyles.rightIndicator}>{iconComponents.right}</View>
          <ThemedText style={textStyles.rightText}>Know</ThemedText>
        </View>
      </View>
    );
  }
);

// ===== CUSTOM MEMO COMPARISON FUNCTION (PREVENTS UNNECESSARY RE-RENDERS) =====
const ReviewBottomActionsComparison = (
  prevProps: ReviewBottomActionsProps,
  nextProps: ReviewBottomActionsProps
): boolean => {
  // Compare primitive values first (fastest)
  if (prevProps.hasCurrentWord !== nextProps.hasCurrentWord) return false;

  // Function reference comparison
  if (prevProps.onManageWord !== nextProps.onManageWord) return false;

  return true;
};

export const ReviewBottomActions = memo(ReviewBottomActionsInternal, ReviewBottomActionsComparison);

ReviewBottomActions.displayName = 'ReviewBottomActions';

export default ReviewBottomActions;
