import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { JSX } from 'react';
import { Platform, Text } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import type { AppTab } from '@/types/enums';

interface TabHeaderOptions {
  readonly title: AppTab;
  readonly rightComponent?: () => JSX.Element;
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

  const baseOptions: NativeStackNavigationOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor,
    },
    headerTintColor: textColor,
    headerShadowVisible: false,
  };

  const textStyle = {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: '600' as const,
    color: textColor,
    minWidth: 100,
  };

  if (Platform.OS === 'ios') {
    return {
      ...baseOptions,
      headerTitle: '',
      headerLeft: () => (
        <Text style={textStyle} numberOfLines={1}>
          {title}
        </Text>
      ),
      headerRight: rightComponent,
    };
  }

  return {
    ...baseOptions,
    title,
    headerTitleStyle: { color: textColor },
    headerRight: rightComponent,
  };
}
