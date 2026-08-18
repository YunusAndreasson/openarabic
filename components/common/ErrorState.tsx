import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

// Define ErrorStateProps inline
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * A component for displaying error messages
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <ThemedText align="center" type="body" colorName="error">
          {message}
        </ThemedText>
      </View>
      {onRetry ? (
        <View style={styles.buttonContainer}>
          <ThemedButton title={STRINGS.REFRESH} onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

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
