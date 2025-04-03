import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { ThemedButton } from './ThemedButton';
import { errorFeedback } from '../utils/haptics';
import { ErrorStateProps } from '@/types/ui/layout.types';

/**
 * A component for displaying error messages
 */
const ErrorState = React.memo(({ message, onRetry }: ErrorStateProps) => {
  // Provide haptic feedback when error state is shown
  useEffect(() => {
    errorFeedback();
  }, []);

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.textContainer}>
        <ThemedText
          type="body"
          variant="error"
          align="center"
          accessibilityLabel={`Error: ${message}`}
        >
          {message}
        </ThemedText>
      </View>
      {onRetry && (
        <View style={styles.buttonContainer}>
          <ThemedButton
            title="Try Again"
            onPress={onRetry}
            variant="filled"
            accessibilityLabel="Attempt to reload content"
          />
        </View>
      )}
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
