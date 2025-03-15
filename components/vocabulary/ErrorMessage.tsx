import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedButton } from '../../components/ThemedButton';
import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from 'expo-router';

interface ErrorMessageProps {
  screenName?: string;
  customMessage?: string;
}

/**
 * Displays an error message with a retry button
 */
const ErrorMessage = React.memo(
  ({
    screenName = 'vocabulary',
    customMessage = 'Error loading your vocabulary data. Please try again later.',
  }: ErrorMessageProps) => {
    const colors = useColors();
    const navigation = useNavigation<BottomTabNavigationProp<any>>();

    return (
      <View style={[styles.messageContainer, { marginTop: LAYOUT.SPACING.XLARGE }]}>
        <ThemedText style={[styles.message, { color: colors.error }]}>{customMessage}</ThemedText>
        <ThemedButton
          title="Retry"
          onPress={() => navigation.navigate(screenName as never)}
          style={{ marginTop: LAYOUT.SPACING.LARGE }}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
  },
});

ErrorMessage.displayName = 'ErrorMessage';

export default ErrorMessage;
