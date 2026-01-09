import { memo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ComponentErrorBoundary } from '@/components/common/ComponentErrorBoundary';
import { LAYOUT } from '@/constants/layout';

const AudioErrorFallback = memo(function AudioErrorFallback() {
  return (
    <View style={styles.errorContainer}>
      <ThemedText colorName="secondary" type="caption" style={styles.errorText}>
        Audio unavailable
      </ThemedText>
    </View>
  );
});

interface AudioErrorBoundaryProps {
  readonly children: ReactNode;
}

export function AudioErrorBoundary({ children }: AudioErrorBoundaryProps): ReactNode {
  return (
    <ComponentErrorBoundary componentName="AudioPlayer" fallback={<AudioErrorFallback />}>
      {children}
    </ComponentErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
});
