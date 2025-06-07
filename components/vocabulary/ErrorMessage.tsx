import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import type { RoutePath } from '@/types/navigation.types';
import type { ErrorMessageProps } from '@/types/ui/review.types';

import { ThemedButton } from '../../components/ThemedButton';
import { ThemedText } from '../../components/ThemedText';
import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/theme/useColors';

/**
 * Displays an error message with a retry button
 */
const ErrorMessage = memo(
  ({
    screenName = 'practice',
    customMessage = "Your progress isn't available right now.",
  }: ErrorMessageProps) => {
    const colors = useColors();
    const router = useRouter();

    const handleRetry = () => {
      // Map screenName to appropriate route
      let route: RoutePath = '/(tabs)';

      if (screenName === 'practice') {
        route = '/practice' as RoutePath;
      } else if (screenName === 'account') {
        route = '/(tabs)/read/account' as RoutePath;
      }

      router.replace(route);
    };

    return (
      <View accessibilityRole="alert" style={styles.messageContainer}>
        <ThemedText
          accessibilityLabel={`Error: ${customMessage}`}
          style={[styles.message, { color: colors.error }]}
        >
          {customMessage}
        </ThemedText>
        <ThemedButton
          accessibilityLabel="Reload this screen"
          style={styles.retryButton}
          title="Refresh"
          onPress={handleRetry}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  retryButton: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
});

ErrorMessage.displayName = 'ErrorMessage';

export default ErrorMessage;
