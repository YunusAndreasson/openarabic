import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedButton } from './ThemedButton';
import { LAYOUT } from '../constants/layout';

interface EmptyStateProps {
  /**
   * Title text for the empty state
   */
  title: string;

  /**
   * Message text for the empty state
   */
  message: string;

  /**
   * Button title (optional)
   */
  buttonTitle?: string;

  /**
   * Button icon name (optional)
   */
  buttonIcon?: string;

  /**
   * Button press handler (optional)
   */
  onButtonPress?: () => void;
}

/**
 * A reusable empty state component that displays a title, message, and optional action button
 */
const EmptyState = React.memo(
  ({ title, message, buttonTitle, buttonIcon, onButtonPress }: EmptyStateProps) => {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.message}>{message}</ThemedText>

        {buttonTitle && onButtonPress && (
          <ThemedButton title={buttonTitle} icon={buttonIcon} onPress={onButtonPress} />
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
