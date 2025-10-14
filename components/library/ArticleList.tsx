import { useHeaderHeight } from '@react-navigation/elements';
import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useTransition,
  type ComponentType,
  type ReactElement,
} from 'react';
import { RefreshControl, ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

interface ArticleListProps {
  onRefresh?: () => void;
  ListHeaderComponent?: ComponentType<object> | ReactElement | null;
  ListFooterComponent?: ComponentType<object> | ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  progressViewOffset?: number;
  isRefreshing?: boolean;
}

/**
 * ArticleList component that renders featured articles and filter sections.
 * Uses ScrollView since there are no list items - all content is in header/footer.
 * Featured articles use their own horizontal FlashList for proper virtualization.
 */
const ArticleList = forwardRef<ScrollView, ArticleListProps>(
  (
    {
      onRefresh,
      ListHeaderComponent,
      ListFooterComponent,
      contentContainerStyle,
      progressViewOffset,
      isRefreshing = false,
    },
    ref
  ) => {
    const colors = useColors();
    const scrollViewRef = useRef<ScrollView | null>(null);
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const [, startTransition] = useTransition();

    // Use refs to store stable values and only update when significantly changed
    const stableHeaderHeightRef = useRef(headerHeight);
    const stableInsetsBottomRef = useRef(insets.bottom);

    // Update refs only when values change significantly (reduce noise from small changes)
    if (Math.abs(stableHeaderHeightRef.current - headerHeight) > 5) {
      stableHeaderHeightRef.current = headerHeight;
    }
    if (Math.abs(stableInsetsBottomRef.current - insets.bottom) > 5) {
      stableInsetsBottomRef.current = insets.bottom;
    }

    useImperativeHandle(ref, () => scrollViewRef.current as ScrollView, []);

    // Optimized refresh handler with transition
    const handleRefreshWithTransition = useCallback(() => {
      if (onRefresh) {
        startTransition(() => {
          onRefresh();
        });
      }
    }, [onRefresh]);

    // Memoized refresh control with optimized dependencies
    const refreshControl = useMemo(
      () => (
        <RefreshControl
          colors={[colors.tint]}
          progressBackgroundColor={colors.background}
          refreshing={isRefreshing}
          tintColor={colors.tint}
          title={STRINGS.ARTICLES_SELECTED_FOR_YOU}
          titleColor={colors.secondaryText}
          progressViewOffset={
            progressViewOffset !== undefined
              ? progressViewOffset
              : stableHeaderHeightRef.current + LAYOUT.SPACING.XXLARGE
          }
          onRefresh={handleRefreshWithTransition}
        />
      ),
      [
        isRefreshing,
        handleRefreshWithTransition,
        colors.tint,
        colors.background,
        colors.secondaryText,
        progressViewOffset,
      ]
    );

    // Optimized content container style
    const safeContentContainerStyle = useMemo(
      () => ({
        ...(contentContainerStyle as any),
        paddingBottom:
          stableInsetsBottomRef.current + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
      }),
      [contentContainerStyle, stableInsetsBottomRef.current]
    );

    // Render header component if provided
    const renderHeader = useCallback(() => {
      if (!ListHeaderComponent) return null;
      if (typeof ListHeaderComponent === 'function') {
        const Component = ListHeaderComponent;
        return <Component />;
      }
      return ListHeaderComponent;
    }, [ListHeaderComponent]);

    // Render footer component if provided
    const renderFooter = useCallback(() => {
      if (!ListFooterComponent) return null;
      if (typeof ListFooterComponent === 'function') {
        const Component = ListFooterComponent;
        return <Component />;
      }
      return ListFooterComponent;
    }, [ListFooterComponent]);

    return (
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={safeContentContainerStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {renderHeader()}
        {renderFooter()}
      </ScrollView>
    );
  }
);

ArticleList.displayName = 'ArticleList';

export default memo(ArticleList);
