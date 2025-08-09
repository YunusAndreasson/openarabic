import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { errorFeedback } from '@/utils/haptics';

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
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <ThemedText align="center" type="body" variant="error">
          {message}
        </ThemedText>
      </View>
      {onRetry ? (
        <View style={styles.buttonContainer}>
          <ThemedButton title={STRINGS.REFRESH} variant="filled" onPress={onRetry} />
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
