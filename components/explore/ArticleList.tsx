import { useTransition, type ReactElement } from 'react';
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
  progressViewOffset = LAYOUT.SPACING.XLARGE,
  isRefreshing = false,
}: ArticleListProps) {
  const colors = useColors();
  const [, startTransition] = useTransition();

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
          progressViewOffset={progressViewOffset}
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
