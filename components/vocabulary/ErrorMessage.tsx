import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { RoutePath } from '@/types/navigation.types';
import type { ErrorMessageProps } from '@/types/ui/review.types';

/**
 * Displays an error message with a retry button
 */
const ErrorMessage = memo(
  ({
    screenName = 'practice',
    customMessage = STRINGS.PROGRESS_NOT_AVAILABLE,
  }: ErrorMessageProps) => {
    const colors = useColors();
    const router = useRouter();

    const handleRetry = useCallback(() => {
      // Map screenName to appropriate route
      let route: RoutePath = ROUTE_PATHS.TABS as RoutePath;

      if (screenName === 'practice') {
        route = ROUTE_PATHS.PRACTICE_TAB as RoutePath;
      } else if (screenName === 'account') {
        route = ROUTE_PATHS.ACCOUNT as RoutePath;
      }

      router.replace(route);
    }, [router, screenName]);

    return (
      <View style={styles.messageContainer}>
        <ThemedText style={[styles.message, { color: colors.error }]}>{customMessage}</ThemedText>
        <ThemedButton
          style={styles.retryButton}
          title={STRINGS.REFRESH}
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
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  retryButton: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});

ErrorMessage.displayName = 'ErrorMessage';

export default ErrorMessage;
