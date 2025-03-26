import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedButton } from './ThemedButton';
import { ThemedView } from './ThemedView';
import { LAYOUT } from '../constants/layout';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import PageHeader from './PageHeader';
import { SignInRequiredProps } from '@/types/ui/layout.types';
import { withOpacity } from '@/utils/colorUtils';

export const SignInRequired = React.memo(
  ({
    title = 'Sign In Required',
    message = 'Sign in to access this feature',
    benefitTitle,
    benefitDescription,
    colors,
    headerTitle,
    onSignIn,
  }: SignInRequiredProps) => {
    return (
      <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
        <ThemedView style={styles.container} contentContainerStyle={styles.noPadding}>
          {headerTitle && <PageHeader title={headerTitle} />}
          <View style={styles.emptyStateContainer}>
            <View
              style={[styles.iconContainer, { backgroundColor: withOpacity(colors.text, 0.1) }]}
            >
              <Ionicons name="log-in-outline" size={48} color={colors.text} />
            </View>
            <View style={styles.titleContainer}>
              <ThemedText type="heading2" weight="600" align="center">
                {title}
              </ThemedText>
            </View>
            <View style={styles.messageContainer}>
              <ThemedText type="body" align="center" variant="secondary">
                {message}
              </ThemedText>
            </View>

            {(benefitTitle || benefitDescription) && (
              <View style={[styles.benefitContainer, { borderColor: colors.cardBorder }]}>
                {benefitTitle && (
                  <View style={styles.benefitTitleContainer}>
                    <ThemedText type="body" weight="600">
                      {benefitTitle}
                    </ThemedText>
                  </View>
                )}
                {benefitDescription && (
                  <View style={styles.benefitDescriptionContainer}>
                    <ThemedText type="caption" variant="secondary">
                      {benefitDescription}
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

            <ThemedButton
              title="Sign In"
              icon="log-in"
              onPress={() => (onSignIn ? onSignIn() : router.navigate('/(tabs)/settings'))}
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
    width: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  messageContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  benefitContainer: {
    width: '100%',
    padding: LAYOUT.SPACING.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  benefitTitleContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  benefitDescriptionContainer: {},
  signInButton: {
    minWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 3,
  },
  noPadding: {
    padding: 0,
  },
});
