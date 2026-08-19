import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

interface AppErrorFallbackProps {
  error: unknown;
  componentName?: string;
  showDetails?: boolean;
  centered?: boolean;
  roomy?: boolean;
}

/** Shared presentation for root and component error boundaries. */
export function AppErrorFallback({
  error,
  componentName,
  showDetails = false,
  centered = false,
  roomy = false,
}: AppErrorFallbackProps) {
  const errorMessage =
    error instanceof Error
      ? componentName
        ? error.message
        : error.toString()
      : STRINGS.UNKNOWN_ERROR_OCCURRED;

  return (
    <View style={[styles.container, centered && styles.centered]}>
      <ThemedText
        align={centered ? 'center' : undefined}
        type="heading3"
        colorName="error"
        style={styles.title}
      >
        {STRINGS.SOMETHING_WENT_WRONG}
      </ThemedText>
      <ThemedText
        align={centered ? 'center' : undefined}
        style={[styles.message, roomy && styles.roomyMessage]}
        type="body"
      >
        {STRINGS.PLEASE_TRY_AGAIN}
      </ThemedText>
      {showDetails && (
        <ThemedText align={centered ? 'center' : undefined} colorName="textTertiary" type="caption">
          {componentName ? `[${componentName}] ` : ''}
          {errorMessage}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  centered: {
    alignItems: 'center',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  message: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  roomyMessage: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
});
