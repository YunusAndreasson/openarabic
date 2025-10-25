import { memo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { LAYOUT, STATUS_INDICATOR } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { SortDirection } from '@/hooks/vocabulary/useDictionaryModal';

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
        <HeaderIconButton
          iconName={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
          onPress={onToggleDirection}
          size="small"
          iconColor={colors.text}
          backgroundColor={colors.elevation1}
          withBorder
          borderColor={colors.border}
        />
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
    width: STATUS_INDICATOR.DOT_SIZE,
    height: STATUS_INDICATOR.DOT_SIZE,
    borderRadius: STATUS_INDICATOR.DOT_RADIUS,
  },
});

export const DictionarySortingHeader = memo(DictionarySortingHeaderComponent);

DictionarySortingHeader.displayName = 'DictionarySortingHeader';
