import { Ionicons } from '@expo/vector-icons';
import { memo, type FC, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface ReviewBottomActionsProps {
  onManageWord: () => void;
  hasCurrentWord: boolean;
}

const ReviewBottomActions: FC<ReviewBottomActionsProps> = memo(
  ({ onManageWord, hasCurrentWord }) => {
    const colors = useColors();

    // Performance: Memoize tint colors to prevent recalculation on every render
    const tintColors = useMemo(
      () => ({
        error: colors.error + '20', // 12.5% opacity
        success: colors.success + '20', // 12.5% opacity
        settings: colors.captionText + '20', // 12.5% opacity
      }),
      [colors.error, colors.success, colors.captionText]
    );

    // Memoized icon components for better performance
    const LeftIcon = useMemo(
      () => <Ionicons name="chevron-back" size={18} color={colors.error} />,
      [colors.error]
    );

    const RightIcon = useMemo(
      () => <Ionicons name="chevron-forward" size={18} color={colors.success} />,
      [colors.success]
    );

    const SettingsIcon = useMemo(
      () => <Ionicons name="settings-outline" size={18} color={colors.captionText} />,
      [colors.captionText]
    );

    return (
      <View style={styles.container}>
        {/* Left indicator - Don't know */}
        <View style={styles.indicatorContainer}>
          <View style={[styles.swipeIndicator, { backgroundColor: tintColors.error }]}>
            {LeftIcon}
          </View>
          <ThemedText style={[styles.indicatorText, { color: colors.error }]}>
            Don&apos;t know
          </ThemedText>
        </View>

        {/* Center - Manage word button */}
        <View style={styles.indicatorContainer}>
          <TouchableOpacity
            style={[
              styles.swipeIndicator,
              { backgroundColor: tintColors.settings },
              !hasCurrentWord && { opacity: LAYOUT.OPACITY.SUBTLE },
            ]}
            onPress={onManageWord}
            disabled={!hasCurrentWord}
            hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
            testID="manage-word-button"
          >
            {SettingsIcon}
          </TouchableOpacity>
          <View style={styles.emptyTextSpace} />
        </View>

        {/* Right indicator - Know */}
        <View style={styles.indicatorContainer}>
          <View style={[styles.swipeIndicator, { backgroundColor: tintColors.success }]}>
            {RightIcon}
          </View>
          <ThemedText style={[styles.indicatorText, { color: colors.success }]}>Know</ThemedText>
        </View>
      </View>
    );
  }
);

ReviewBottomActions.displayName = 'ReviewBottomActions';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
    height: 80,
  },
  indicatorContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: LAYOUT.OPACITY.MEDIUM,
    flex: 1,
    maxWidth: 90,
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
    lineHeight: 16,
  },
  emptyTextSpace: {
    height: 16, // Same height as indicatorText lineHeight to maintain alignment
  },
});

export default ReviewBottomActions;
