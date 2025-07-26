import type { ViewabilityConfig } from 'react-native';

/**
 * Create viewability configuration for FlashList
 */
export function createViewabilityConfig(): ViewabilityConfig {
  return {
    itemVisiblePercentThreshold: 50, // Consider item visible when 50% is visible
    minimumViewTime: 100, // Minimum time item must be visible before triggering
  };
}

/**
 * Create content container style for FlashList
 */
export function createContentContainerStyle(bottomInset: number): {
  paddingTop: number;
  paddingBottom: number;
} {
  return {
    paddingTop: 0,
    paddingBottom: bottomInset + 48, // Safe area + comfortable reading space
  };
}

/**
 * Create list container style for FlashList
 */
export function createListContainerStyle(backgroundColor: string): {
  flex: number;
  height: number;
  backgroundColor: string;
} {
  return {
    flex: 1,
    height: 100,
    backgroundColor,
  };
}

/**
 * Create override item layout function for FlashList
 */
export function createOverrideItemLayout(itemHeight: number) {
  return (layout: { span?: number; size?: number }) => {
    layout.size = itemHeight;
  };
}

/**
 * Create FlashList configuration object
 */
export function createFlashListConfig<T>({
  data,
  renderItem,
  keyExtractor,
  estimatedItemSize,
  contentContainerStyle,
  ListHeaderComponent,
  ListFooterComponent,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  overrideItemLayout,
  drawDistance,
  scrollEventThrottle = 16,
  showsVerticalScrollIndicator = false,
  removeClippedSubviews = true,
  alwaysBounceVertical = false,
  bounces = true,
  overScrollMode = 'auto',
  persistentScrollbar = false,
  extraData,
  initialScrollIndex = 0,
}: {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  estimatedItemSize: number;
  contentContainerStyle?: any;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  onScroll?: (event: any) => void;
  onViewableItemsChanged?: (info: { viewableItems: any[] }) => void;
  viewabilityConfig?: ViewabilityConfig;
  overrideItemLayout?: (layout: { span?: number; size?: number }) => void;
  drawDistance?: number;
  scrollEventThrottle?: number;
  showsVerticalScrollIndicator?: boolean;
  removeClippedSubviews?: boolean;
  alwaysBounceVertical?: boolean;
  bounces?: boolean;
  overScrollMode?: 'auto' | 'always' | 'never';
  persistentScrollbar?: boolean;
  extraData?: any;
  initialScrollIndex?: number;
}) {
  return {
    data,
    renderItem,
    keyExtractor,
    estimatedItemSize,
    contentContainerStyle,
    ListHeaderComponent,
    ListFooterComponent,
    onScroll,
    onViewableItemsChanged,
    viewabilityConfig,
    overrideItemLayout,
    drawDistance,
    scrollEventThrottle,
    showsVerticalScrollIndicator,
    removeClippedSubviews,
    alwaysBounceVertical,
    bounces,
    overScrollMode,
    persistentScrollbar,
    extraData,
    initialScrollIndex,
  };
}
