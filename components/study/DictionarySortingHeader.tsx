import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { SortDirection } from '@/hooks/vocabulary/useDictionaryModal';
import { selectionFeedback } from '@/utils/haptics';

interface DictionarySortingHeaderProps {
  sortDirection: SortDirection;
  onToggleDirection: () => void;
}

/**
 * Header component that displays status legend and sort direction toggle
 * Legend explains the colored left borders on dictionary cards
 */
const DictionarySortingHeaderComponent: FC<DictionarySortingHeaderProps> = ({
  sortDirection,
  onToggleDirection,
}) => {
  const colors = useColors();

  const handleTogglePress = useCallback(() => {
    selectionFeedback();
    onToggleDirection();
  }, [onToggleDirection]);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Status legend on the left */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.error }]} />
            <ThemedText type="caption" colorName="textTertiary">
              Due
            </ThemedText>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.warning }]} />
            <ThemedText type="caption" colorName="textTertiary">
              Learned
            </ThemedText>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.success }]} />
            <ThemedText type="caption" colorName="textTertiary">
              Mastered
            </ThemedText>
          </View>
        </View>

        {/* Sort direction toggle on the right */}
        <Pressable
          style={[
            styles.toggleButton,
            {
              backgroundColor: colors.elevation1,
              borderColor: colors.border,
            },
          ]}
          onPress={handleTogglePress}
          android_ripple={{
            color: colors.tint,
            radius: MIN_TOUCH_TARGET.SMALL / 2,
          }}
        >
          <Ionicons
            name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.SPACING.SMALL, // 8px top/bottom
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING, // 12px left/right
    marginBottom: LAYOUT.SPACING.TINY, // 4px bottom margin
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Legend left, toggle right
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM, // 12px gap between legend items
    flex: 1, // Take up available space
    marginLeft: LAYOUT.SPACING.MEDIUM, // 12px - aligns with card content padding
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL, // 8px gap between dot and text (matches card dot marginRight)
  },
  colorDot: {
    width: 6, // Match card dot size
    height: 6,
    borderRadius: 3, // Perfect circle
  },
  toggleButton: {
    width: MIN_TOUCH_TARGET.SMALL, // 32px
    height: MIN_TOUCH_TARGET.SMALL, // 32px
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL, // 8px
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL, // 1px
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const DictionarySortingHeader = memo(DictionarySortingHeaderComponent);

DictionarySortingHeader.displayName = 'DictionarySortingHeader';

