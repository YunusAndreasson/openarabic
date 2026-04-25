import { useHeaderHeight } from '@react-navigation/elements';
import { useRef, useTransition, type ReactElement } from 'react';
import { RefreshControl, ScrollView, type ViewStyle } from 'react-native';

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

  // Use ref to store stable header height and only update when significantly changed
  const stableHeaderHeightRef = useRef(headerHeight);

  if (Math.abs(stableHeaderHeightRef.current - headerHeight) > 5) {
    stableHeaderHeightRef.current = headerHeight;
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
              : stableHeaderHeightRef.current + LAYOUT.SPACING.XXLARGE
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
