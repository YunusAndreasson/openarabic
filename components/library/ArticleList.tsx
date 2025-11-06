import { useHeaderHeight } from '@react-navigation/elements';
import {
  useImperativeHandle,
  useRef,
  useTransition,
  type ComponentType,
  type ReactElement,
  type Ref,
} from 'react';
import { RefreshControl, ScrollView, type StyleProp, type ViewStyle } from 'react-native';

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
  ref?: Ref<ScrollView>;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
}

/**
 * ArticleList component that renders featured articles and filter sections.
 * Uses ScrollView since there are no list items - all content is in header/footer.
 * Featured articles use their own horizontal FlashList for proper virtualization.
 */
export function ArticleList({
  onRefresh,
  ListHeaderComponent,
  ListFooterComponent,
  contentContainerStyle,
  progressViewOffset,
  isRefreshing = false,
  ref,
  onScroll,
}: ArticleListProps) {
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const headerHeight = useHeaderHeight();
  const [, startTransition] = useTransition();

  // Use ref to store stable header height and only update when significantly changed
  const stableHeaderHeightRef = useRef(headerHeight);

  // Update ref only when value changes significantly (reduce noise from small changes)
  if (Math.abs(stableHeaderHeightRef.current - headerHeight) > 5) {
    stableHeaderHeightRef.current = headerHeight;
  }

  useImperativeHandle(ref, () => scrollViewRef.current as ScrollView, []);

  // Refresh handler with transition
  const handleRefreshWithTransition = () => {
    if (onRefresh) {
      startTransition(() => {
        onRefresh();
      });
    }
  };

  // Refresh control
  const refreshControl = (
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
  );

  // Content container style - respect padding passed from parent
  const safeContentContainerStyle: ViewStyle =
    typeof contentContainerStyle === 'object' &&
    !Array.isArray(contentContainerStyle) &&
    contentContainerStyle !== null
      ? contentContainerStyle
      : {};

  // Render header component if provided
  const renderHeader = () => {
    if (!ListHeaderComponent) return null;
    if (typeof ListHeaderComponent === 'function') {
      const Component = ListHeaderComponent;
      return <Component />;
    }
    return ListHeaderComponent;
  };

  // Render footer component if provided
  const renderFooter = () => {
    if (!ListFooterComponent) return null;
    if (typeof ListFooterComponent === 'function') {
      const Component = ListFooterComponent;
      return <Component />;
    }
    return ListFooterComponent;
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={safeContentContainerStyle}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
    >
      {renderHeader()}
      {renderFooter()}
    </ScrollView>
  );
}

ArticleList.displayName = 'ArticleList';
