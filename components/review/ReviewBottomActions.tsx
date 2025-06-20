import { Ionicons } from '@expo/vector-icons';
import { memo, type FC } from 'react';
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

    // Create subtle color versions for indicators
    const errorTint = colors.error + '20'; // 12.5% opacity
    const successTint = colors.success + '20'; // 12.5% opacity
    const settingsTint = colors.captionText + '20'; // 12.5% opacity

    return (
      <View style={styles.container}>
        {/* Left indicator - Don't know */}
        <View style={styles.indicatorContainer}>
          <View style={[styles.swipeIndicator, { backgroundColor: errorTint }]}>
            <Ionicons name="chevron-back" size={18} color={colors.error} />
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
              { backgroundColor: settingsTint },
              !hasCurrentWord && { opacity: LAYOUT.OPACITY.SUBTLE },
            ]}
            onPress={onManageWord}
            disabled={!hasCurrentWord}
            hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
            testID="manage-word-button"
          >
            <Ionicons name="settings-outline" size={18} color={colors.captionText} />
          </TouchableOpacity>
          <View style={styles.emptyTextSpace} />
        </View>

        {/* Right indicator - Know */}
        <View style={styles.indicatorContainer}>
          <View style={[styles.swipeIndicator, { backgroundColor: successTint }]}>
            <Ionicons name="chevron-forward" size={18} color={colors.success} />
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
    marginTop: 'auto',
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
