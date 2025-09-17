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

  const baseOptions: NativeStackNavigationOptions = {
    headerShown: true,
    headerStyle: {
      backgroundColor,
    },
    headerTintColor: textColor,
    headerShadowVisible: false,
  };

  return {
    ...baseOptions,
    headerTitle: () => (
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 0,
        }}
      >
        <Text
          style={{
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
            fontWeight: '600',
            color: textColor,
            textAlign: 'left',
            flex: 1,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {rightComponent && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {rightComponent()}
          </View>
        )}
      </View>
    ),
  };
}
