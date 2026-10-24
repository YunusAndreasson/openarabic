import { ComponentErrorBoundary } from '@/components/common';
import { memo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

const AudioErrorFallback = memo(function AudioErrorFallback() {
  return (
    <View style={styles.errorContainer}>
      <ThemedText colorName="secondary" type="caption" style={styles.errorText}>
        {STRINGS.AUDIO_UNAVAILABLE}
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
