import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedButton } from './ThemedButton';
import { LAYOUT } from '../constants/layout';
import { EmptyStateProps } from '@/types/ui/layout.types';

/**
 * A reusable empty state component that displays a title, message, and optional action button
 */
const EmptyState = React.memo(
  ({ title, message, buttonTitle, buttonIcon, onButtonPress }: EmptyStateProps) => {
    return (
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <ThemedText type="heading2" align="center">
            {title}
          </ThemedText>
        </View>
        <View style={styles.messageContainer}>
          <ThemedText type="body" variant="subtle" align="center">
            {message}
          </ThemedText>
        </View>

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
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  messageContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
