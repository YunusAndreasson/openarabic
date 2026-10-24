import type { ReactNode } from 'react';
import { Stack } from 'expo-router';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetScreen } from '@/components/common/SheetScreen';
import { LAYOUT, SCROLLABLE_SHEET_DETENT } from '@/constants/layout';
import { useTextLayout } from '@/hooks/ui/useTextLayout';

/** Fit ordinary text; give large text a bounded native sheet with a scroll path. */
export function ResponsiveSheetScreen({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  const { crowded } = useTextLayout();
  const insets = useSafeAreaInsets();
  if (!crowded) return <SheetScreen>{children}</SheetScreen>;

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
  // The same grabber clearance as SheetScreen: this is the same sheet, and
  // Android draws no grabber to clear.
  content: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.BOTTOM_SHEET.GRABBER_CLEARANCE,
  },
});
