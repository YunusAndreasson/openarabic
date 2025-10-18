import type { ScrollView, StyleProp, ViewProps, ViewStyle } from 'react-native';
import type { RefObject } from 'react';

/**
 * ThemedView is a flexible container component that automatically applies theme colors
 * and provides options for scrollable content, safe area insets, and more.
 *
 * It serves as the foundation for most screens in the app, ensuring consistent
 * theming and behavior across the application.
 */
export interface ThemedViewProps extends ViewProps {
  /** Determines whether the view should be scrollable */
  scrollable?: boolean;
  /** Optional style for the ScrollView content container when scrollable */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Whether to use SafeAreaView (default: true) */
  useSafeArea?: boolean;
  /** Whether to include bottom insets in safe area (default: true) */
  includeBottomInset?: boolean;
  /** Specific edges to apply safe area insets to (overrides includeBottomInset) */
  safeAreaEdges?: ('bottom' | 'left' | 'right' | 'top')[];
  /** Optional ScrollView props */
  scrollViewProps?: Omit<React.ComponentProps<typeof ScrollView>, 'children'>;
  /** Optional ref to the ScrollView (only applies when scrollable=true) */
  scrollViewRef?: RefObject<ScrollView | null>;
  /** Children to render inside the view */
  children?: React.ReactNode;
}
