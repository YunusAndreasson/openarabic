import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedButton } from '../../components/ThemedButton';
import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from 'expo-router';
import { ErrorMessageProps } from '@/types/ui/review.types';

type TabParamList = {
  index: undefined;
  vocabulary: undefined;
  bookmarks: undefined;
  settings: undefined;
};

/**
 * Displays an error message with a retry button
 */
const ErrorMessage = React.memo(
  ({
    screenName = 'words',
    customMessage = 'Unable to load data. Please try again.',
  }: ErrorMessageProps) => {
    const colors = useColors();
    const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();

    return (
      <View style={styles.messageContainer} accessibilityRole="alert">
        <ThemedText
          style={[styles.message, { color: colors.error }]}
          accessibilityLabel={`Error: ${customMessage}`}
        >
          {customMessage}
        </ThemedText>
        <ThemedButton
          title="Try Again"
          onPress={() => navigation.navigate(screenName as keyof TabParamList)}
          style={styles.retryButton}
          accessibilityLabel="Reload this screen"
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
