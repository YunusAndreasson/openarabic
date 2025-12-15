import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

/**
 * Empty state for the Playlist screen.
 */
export function SavedEmptyState() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Empty state icon - fixed height container to prevent layout shifts */}
      <View style={styles.iconContainer}>
        <Ionicons name="albums-outline" size={80} color={colors.textTertiary} />
      </View>

      {/* Title */}
      <ThemedText type="heading3" style={styles.title}>
        {STRINGS.BOOKMARKS_EMPTY_TITLE}
      </ThemedText>

      {/* Hint */}
      <ThemedText style={styles.hint} type="caption" variant="secondary">
        {STRINGS.BOOKMARKS_EMPTY_HINT}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
  },
  iconContainer: {
    height: 80,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
  title: {
    marginTop: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
});
