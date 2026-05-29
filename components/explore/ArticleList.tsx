import { useHeaderHeight } from "expo-router/react-navigation";
import { useState, useTransition, type ReactElement } from 'react';
import { RefreshControl, ScrollView, StyleSheet, type ViewStyle } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface ArticleListProps {
  onRefresh?: () => void;
  ListHeaderComponent?: ReactElement | null;
  ListFooterComponent?: ReactElement | null;
  contentContainerStyle?: ViewStyle;
  progressViewOffset?: number;
  isRefreshing?: boolean;
}

/**
 * ArticleList component that renders featured articles and filter sections.
 * Uses ScrollView since there are no list items — all content is in header/footer.
 * Each horizontal section (featured, continue reading, discovery) renders its own
 * inner ScrollView; we don't need FlashList here.
 */
export function ArticleList({
  onRefresh,
  ListHeaderComponent,
  ListFooterComponent,
  contentContainerStyle,
  progressViewOffset,
  isRefreshing = false,
}: ArticleListProps) {
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const [, startTransition] = useTransition();

  // Stable header height — only update when significantly changed to avoid layout jitter.
  // Uses the "adjust state during render" pattern so the new value is applied in the
  // same render that observes a >5px delta (React schedules a re-render with the new value).
  const [stableHeaderHeight, setStableHeaderHeight] = useState(headerHeight);
  if (Math.abs(stableHeaderHeight - headerHeight) > 5) {
    setStableHeaderHeight(headerHeight);
  }

  const handleRefreshWithTransition = () => {
    if (onRefresh) {
      startTransition(() => {
        onRefresh();
      });
    }
  };

  return (
    <ScrollView
      // `flex: 1` makes the ScrollView fill the route's content view — required
      // so UIKit treats it as the screen's primary scrollable and runs the
      // large-title collapse on scroll. Background is set so we don't see the
      // route's underlying chrome through any gaps.
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          colors={[colors.tint]}
          progressBackgroundColor={colors.background}
          refreshing={isRefreshing}
          tintColor={colors.tint}
          progressViewOffset={
            progressViewOffset !== undefined
              ? progressViewOffset
              : stableHeaderHeight + LAYOUT.SPACING.XXLARGE
          }
          onRefresh={handleRefreshWithTransition}
        />
      }
      keyboardShouldPersistTaps="handled"
      // Required for iOS native large title collapse on scroll
      contentInsetAdjustmentBehavior="automatic"
    >
      {ListHeaderComponent}
      {ListFooterComponent}
    </ScrollView>
  );
}

ArticleList.displayName = 'ArticleList';

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
