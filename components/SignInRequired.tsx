import React, { useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedButton } from './ThemedButton';
import { ThemedView } from './ThemedView';
import { LAYOUT } from '../constants/layout';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../hooks/animations/useFadeInAnimation';
import PageHeader from './PageHeader';

interface SignInRequiredProps {
  title?: string;
  message?: string;
  benefitTitle?: string;
  benefitDescription?: string;
  colors: any;
  headerTitle?: string;
}

export const SignInRequired = React.memo(
  ({
    title = 'Sign In Required',
    message = 'Please sign in to access this feature',
    benefitTitle,
    benefitDescription,
    colors,
    headerTitle,
  }: SignInRequiredProps) => {
    // Use our custom animation hook instead of direct Reanimated FadeIn
    const { animatedStyle, startAnimation } = useFadeInAnimation(0, 300);

    useEffect(() => {
      startAnimation();
    }, [startAnimation]);

    return (
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
          {headerTitle && <PageHeader title={headerTitle} />}
          <View style={styles.emptyStateContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.text + '10' }]}>
              <Ionicons name="log-in-outline" size={48} color={colors.text} />
            </View>
            <ThemedText style={styles.emptyStateTitle}>{title}</ThemedText>
            <ThemedText style={styles.emptyStateMessage}>{message}</ThemedText>

            {(benefitTitle || benefitDescription) && (
              <View style={[styles.benefitContainer, { borderColor: colors.cardBorder }]}>
                {benefitTitle && (
                  <ThemedText style={styles.benefitTitle}>{benefitTitle}</ThemedText>
                )}
                {benefitDescription && (
                  <ThemedText style={styles.benefitDescription}>{benefitDescription}</ThemedText>
                )}
              </View>
            )}

            <ThemedButton
              title="Sign In"
              icon="log-in"
              onPress={() => router.push('/account')}
              style={styles.signInButton}
            />
          </View>
        </ThemedView>
      </Animated.View>
    );
  }
);

SignInRequired.displayName = 'SignInRequired';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  emptyStateTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  emptyStateMessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  benefitContainer: {
    width: '100%',
    padding: LAYOUT.SPACING.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  benefitTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  benefitDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  signInButton: {
    minWidth: 150,
  },
});
