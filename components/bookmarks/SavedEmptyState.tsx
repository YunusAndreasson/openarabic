import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { type EmptyStateButtonProps } from '@/components/study/PracticeEmptyState';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAddBeginnerArticles } from '@/hooks/bookmarks/useAddBeginnerArticles';
import { useColors } from '@/hooks/theme/useColors';

// Re-export for consumers importing from bookmarks
export type { EmptyStateButtonProps };

interface SavedEmptyStateProps {
  onButtonPropsChange?: (props: EmptyStateButtonProps) => void;
}

/**
 * Simplified empty state for the Playlist screen.
 * One-tap to add 10 beginner texts.
 */
export function SavedEmptyState({ onButtonPropsChange }: SavedEmptyStateProps) {
  const { addArticles, isLoading } = useAddBeginnerArticles();
  const colors = useColors();
  const router = useRouter();

  // Use ref to avoid recreating the handler and causing infinite loops
  const addArticlesRef = useRef(addArticles);
  addArticlesRef.current = addArticles;

  // Navigation to browse texts with hint param
  const handleBrowse = useCallback(() => {
    router.push(`${ROUTE_PATHS.EXPLORE_TAB}?from=playlist`);
  }, [router]);

  // Notify parent of button props - only depends on isLoading
  useEffect(() => {
    onButtonPropsChange?.({
      label: STRINGS.BOOKMARKS_EMPTY_CTA,
      onPress: () => addArticlesRef.current(),
      loading: isLoading,
      disabled: false,
      secondaryLabel: STRINGS.BOOKMARKS_EMPTY_CTA_SECONDARY,
      secondaryOnPress: handleBrowse,
    });
  }, [isLoading, onButtonPropsChange, handleBrowse]);

  return (
    <View style={styles.container}>
      {/* Empty state icon */}
      <Ionicons name="albums-outline" size={80} color={colors.textTertiary} />

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
  hint: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  title: {
    marginTop: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
});
