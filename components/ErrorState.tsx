import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { errorFeedback } from '@/utils/haptics';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

// Define ErrorStateProps inline
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * A component for displaying error messages
 */
const ErrorState = memo(({ message, onRetry }: ErrorStateProps) => {
  // Provide haptic feedback when error state is shown
  useEffect(() => {
    errorFeedback();
  }, []);

  return (
    <View accessibilityRole="alert" style={styles.container}>
      <View style={styles.textContainer}>
        <ThemedText
          accessibilityLabel={`Error: ${message}`}
          align="center"
          type="body"
          variant="error"
        >
          {message}
        </ThemedText>
      </View>
      {onRetry ? (
        <View style={styles.buttonContainer}>
          <ThemedButton
            accessibilityLabel="Attempt to reload content"
            title="Refresh"
            variant="filled"
            onPress={onRetry}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  buttonContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  textContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});

ErrorState.displayName = 'ErrorState';

export default ErrorState;
