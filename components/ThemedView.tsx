import React, { useMemo } from 'react';
import { ScrollView, type ViewProps, type StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Extend ViewProps to add optional scrollable behavior and a content container style.
export interface ThemedViewProps extends ViewProps {
  /** Determines whether the view should be scrollable */
  scrollable?: boolean;
  /** Optional style for the ScrollView content container when scrollable */
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function ThemedViewComponent({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  ...otherProps
}: ThemedViewProps) {
  // Use useMemo to prevent unnecessary rerenders when props don't change
  const content = useMemo(() => {
    if (scrollable) {
      return (
        <SafeAreaView style={style} {...otherProps}>
          <ScrollView contentContainerStyle={contentContainerStyle}>{children}</ScrollView>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={style} {...otherProps}>
        {children}
      </SafeAreaView>
    );
  }, [children, contentContainerStyle, otherProps, scrollable, style]);

  return content;
}

// Memoize the component to prevent unnecessary rerenders
export const ThemedView = React.memo(ThemedViewComponent);
