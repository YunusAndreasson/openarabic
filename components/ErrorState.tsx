import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';

interface ErrorStateProps {
  /**
   * Error message to display
   */
  message: string;
}

/**
 * A component for displaying error messages
 */
const ErrorState = React.memo(({ message }: ErrorStateProps) => (
  <View style={styles.container}>
    <ThemedText style={styles.text}>{message}</ThemedText>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});

ErrorState.displayName = 'ErrorState';

export default ErrorState;
