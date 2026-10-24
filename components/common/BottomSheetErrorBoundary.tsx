import { memo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { toError } from '@/utils/toError';

import { ComponentErrorBoundary } from './ComponentErrorBoundary';

interface BottomSheetErrorFallbackProps {
  /** Whatever was thrown — not necessarily an `Error`. */
  readonly error: unknown;
}

const BottomSheetErrorFallback = memo(function BottomSheetErrorFallback({
  error,
}: BottomSheetErrorFallbackProps) {
  return (
    <View style={styles.errorContainer}>
      <ThemedText type="body" colorName="error" style={styles.errorText}>
        {STRINGS.SOMETHING_WENT_WRONG}
      </ThemedText>
      {__DEV__ && (
        <ThemedText colorName="textTertiary" type="caption" style={styles.errorDetail}>
          {toError(error).message}
        </ThemedText>
      )}
    </View>
  );
});

interface BottomSheetErrorBoundaryProps {
  readonly children: ReactNode;
  readonly sheetName: string;
}

export function BottomSheetErrorBoundary({
  children,
  sheetName,
}: BottomSheetErrorBoundaryProps): ReactNode {
  return (
    <ComponentErrorBoundary
      componentName={`BottomSheet:${sheetName}`}
      fallback={({ error }) => <BottomSheetErrorFallback error={error} />}
    >
      {children}
    </ComponentErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.BOTTOM_SHEET.ERROR_MIN_HEIGHT,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  errorDetail: {
    textAlign: 'center',
  },
});
