import type { ReactNode } from 'react';
import { Stack } from 'expo-router';
import { Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetScreen } from '@/components/common/SheetScreen';
import { INLINE_VALUE_MIN_WIDTH, LAYOUT, SCROLLABLE_SHEET_DETENT } from '@/constants/layout';

/** Fit ordinary text; give large text a bounded native sheet with a scroll path. */
export function ResponsiveSheetScreen({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (width / fontScale >= INLINE_VALUE_MIN_WIDTH) return <SheetScreen>{children}</SheetScreen>;

  // Native form sheets require the ScrollView directly under the screen.
  return (
    <>
      <Stack.Screen options={{ sheetAllowedDetents: [SCROLLABLE_SHEET_DETENT] }} />
      <ScrollView
        testID={testID}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: LAYOUT.SPACING.MEDIUM + (Platform.OS === 'android' ? insets.bottom : 0),
          },
        ]}
      >
        {children}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
});
