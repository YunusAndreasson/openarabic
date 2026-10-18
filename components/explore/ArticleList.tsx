import { useTransition, type ReactElement } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';

import { ErrorState, LoadingState } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

interface ArticleListProps {
  onRefresh?: () => void;
  ListHeaderComponent?: ReactElement | null;
  contentContainerStyle?: ViewStyle;
  progressViewOffset?: number;
  isRefreshing?: boolean;
  /** The catalogue has not arrived yet: the feed is replaced by a loader. */
  isLoading?: boolean;
  /** The catalogue failed and nothing is cached: the feed is replaced by a retry. */
  isError?: boolean;
  onRetry?: () => void;
  /**
   * Scroll passthrough. Explore is a tab root, and the tab bar's hide-on-scroll
   * is driven from the direction of this scroll view — see `useTabBarAutoHide`.
   */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
}

/**
 * ArticleList component that renders featured articles and filter sections.
 * Uses ScrollView since there are no list items — all content is in the header.
 * Each horizontal section (featured, continue reading, discovery) renders its own
 * inner ScrollView; we don't need FlashList here.
 *
 * The loading and error states render INSIDE the scroll view rather than in
 * its place, so pull-to-refresh keeps working on a tab that has nothing else
 * to show.
 */
export function ArticleList({
  onRefresh,
  ListHeaderComponent,
  contentContainerStyle,
  progressViewOffset = LAYOUT.SPACING.XLARGE,
  isRefreshing = false,
  isLoading = false,
  isError = false,
  onRetry,
  onScroll,
  scrollEventThrottle,
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

  const hasStatus = isLoading || isError;

  const renderContent = () => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState message={STRINGS.FAILED_TO_LOAD_ARTICLES} onRetry={onRetry} />;
    return ListHeaderComponent;
  };

  return (
    <ScrollView
      testID="explore-feed"
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      // `flex: 1` makes the ScrollView fill the route's content view — required
      // so UIKit treats it as the screen's primary scrollable and runs the
      // large-title collapse on scroll. Background is set so we don't see the
      // route's underlying chrome through any gaps.
      style={[styles.flex, { backgroundColor: colors.background }]}
      // `flexGrow` gives a status state the full height to centre in
      contentContainerStyle={[contentContainerStyle, hasStatus && styles.fill]}
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
      {renderContent()}
    </ScrollView>
  );
}

ArticleList.displayName = 'ArticleList';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { flexGrow: 1 },
});
