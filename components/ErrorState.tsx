import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { ThemedButton } from './ThemedButton';
import { ErrorStateProps } from '@/types/ui.types';

/**
 * A component for displaying error messages
 */
const ErrorState = React.memo(({ message, onRetry }: ErrorStateProps) => (
  <View style={styles.container}>
    <ThemedText style={styles.text}>{message}</ThemedText>
    {onRetry && (
      <View style={styles.buttonContainer}>
        <ThemedButton title="Try Again" onPress={onRetry} variant="filled" icon="refresh" />
      </View>
    )}
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  text: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  buttonContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});

ErrorState.displayName = 'ErrorState';

export default ErrorState;
