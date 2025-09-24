import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import type { AppTab } from '@/types/enums';

interface TabHeaderOptions {
  readonly title: AppTab;
  readonly rightComponent?: () => React.ReactElement;
  readonly colors: {
    background: string;
    headingText: string;
  };
}

/**
 * Creates consistent header options for tab screens
 * Handles iOS/Android platform differences automatically
 */
export function createTabHeaderOptions({
  title,
  rightComponent,
  colors,
}: TabHeaderOptions): NativeStackNavigationOptions {
  const backgroundColor = colors?.background || '#FFFFFF';
  const textColor = colors?.headingText || '#000000';

  // Pre-computed styles for better performance
  const headerStyles = {
    headerContainer: {
      backgroundColor,
      height: 56, // Increased for more breathing room around streak and profile elements
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 16,
      paddingVertical: 4, // Small vertical padding for better spacing
    },
    titleText: {
      fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
      fontWeight: '600' as const,
      color: textColor,
      textAlign: 'left' as const,
      flex: 1,
    },
    rightContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
    },
  };

  return {
    headerShown: true,
    headerShadowVisible: false,
    // Remove redundant properties since we're using custom header
    headerStyle: undefined,
    headerTintColor: undefined,
    headerTitle: undefined,
    header: () => (
      <View style={headerStyles.headerContainer}>
        <Text style={headerStyles.titleText} numberOfLines={1}>
          {title}
        </Text>
        {rightComponent && <View style={headerStyles.rightContainer}>{rightComponent()}</View>}
      </View>
    ),
  };
}
