import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { RoutePath } from '@/types/navigation.types';
import type { ErrorMessageProps } from '@/types/ui/review.types';

const ErrorMessage = memo(
  ({
    screenName = 'practice',
    customMessage = STRINGS.PROGRESS_NOT_AVAILABLE,
  }: ErrorMessageProps) => {
    const colors = useColors();
    const router = useRouter();

    const handleRetry = useCallback(() => {
      const route: RoutePath =
        screenName === 'practice'
          ? (ROUTE_PATHS.PRACTICE_TAB as RoutePath)
          : screenName === 'account'
          ? (ROUTE_PATHS.ACCOUNT as RoutePath)
          : (ROUTE_PATHS.READ_TAB as RoutePath);

      router.replace(route);
    }, [router, screenName]);

    return (
      <View style={styles.messageContainer} testID="error-message">
        <ThemedText style={[styles.message, { color: colors.error }]} testID="error-message-text">
          {customMessage}
        </ThemedText>
        <ThemedButton
          style={styles.retryButton}
          title={STRINGS.REFRESH}
          testID="error-retry-button"
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
