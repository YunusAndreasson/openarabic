import { memo, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { SortDirection } from '@/hooks/vocabulary/useDictionaryModal';

interface DictionarySortingHeaderProps {
  sortDirection: SortDirection;
  onToggleDirection: () => void;
}

/**
 * Simple sort button following modern app patterns (Gmail, Spotify, etc.)
 * Shows what you're sorting by + direction indicator
 */
const DictionarySortingHeaderComponent: FC<DictionarySortingHeaderProps> = ({
  sortDirection,
  onToggleDirection,
}) => {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.sortButton,
          { backgroundColor: colors.elevation1, borderColor: colors.border },
          pressed && { opacity: 0.7 },
        ]}
        onPress={onToggleDirection}
      >
        <ThemedText type="caption" style={styles.sortText}>
          Memory strength
        </ThemedText>
        <Ionicons
          name={sortDirection === 'desc' ? 'chevron-down' : 'chevron-up'}
          size={14}
          color={colors.text}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.SPACING.SMALL, // 8px top/bottom
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING, // 12px left/right
    marginBottom: LAYOUT.SPACING.TINY, // 4px bottom margin
    alignItems: 'flex-end', // Right-align sort button
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY, // 4px between text and icon
    paddingHorizontal: LAYOUT.SPACING.MEDIUM, // 12px horizontal padding
    paddingVertical: LAYOUT.SPACING.SMALL, // 8px vertical padding
    borderRadius: LAYOUT.SPACING.MEDIUM, // 12px rounded corners
    borderWidth: 1,
  },
  sortText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
  },
});

export const DictionarySortingHeader = memo(DictionarySortingHeaderComponent);

DictionarySortingHeader.displayName = 'DictionarySortingHeader';
