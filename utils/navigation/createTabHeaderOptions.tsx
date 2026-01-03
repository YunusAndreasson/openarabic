import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { createNavigationOptions } from './navigationOptions';

interface TabHeaderOptions {
  readonly title: string;
  readonly rightComponent?: () => React.ReactElement;
  readonly colors: {
    background: string;
    headingText: string;
    shadow: string;
  };
}

/**
 * Creates consistent header options for tab screens
 * Thin wrapper around createNavigationOptions with isRegularScreen: true
 *
 * @example
 * <Stack.Screen
 *   name="index"
 *   options={createTabHeaderOptions({
 *     title: AppTab.PLAYLIST,
 *     rightComponent: () => <EditModeButton />,
 *     colors,
 *   })}
 * />
 */
export function createTabHeaderOptions({
  title,
  rightComponent,
  colors,
}: TabHeaderOptions): NativeStackNavigationOptions {
  return createNavigationOptions(colors, {
    isRegularScreen: true,
    title,
    headerRight: rightComponent,
  });
}
