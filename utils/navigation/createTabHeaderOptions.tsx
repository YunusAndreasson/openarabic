import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FONT_WEIGHTS, LAYOUT } from '@/constants/layout';
import type { AppTab } from '@/types/enums';

interface TabHeaderOptions {
  readonly title: AppTab;
  readonly rightComponent?: () => React.ReactElement;
  readonly colors: {
    background: string;
    headingText: string;
    tint: string;
  };
}

/**
 * Creates consistent header options for tab screens
 * Uses native header with left-aligned title
 * Note: headerLargeTitle conflicts with NativeTabs - using custom title instead
 */
export function createTabHeaderOptions({
  title,
  rightComponent,
  colors,
}: TabHeaderOptions): NativeStackNavigationOptions {
  return {
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: Platform.select({
      android: {
        backgroundColor: colors.background,
        paddingTop: 24,
      },
      default: {
        backgroundColor: colors.background,
      },
    }),
    headerTintColor: colors.tint,
    headerTitleAlign: 'left',
    headerTitle: () => (
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.headingText }]}>{title}</Text>
      </View>
    ),
    headerRight: rightComponent,
  };
}

const styles = StyleSheet.create({
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: FONT_WEIGHTS.BOLD,
    backgroundColor: 'transparent',
  },
});
