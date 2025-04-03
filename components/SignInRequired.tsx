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
  benefitContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    marginBottom: LAYOUT.SPACING.LARGE,
    padding: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  benefitDescriptionContainer: {},
  benefitTitleContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  container: {
    flex: 1,
  },
  emptyStateContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  headerContainer: {
    alignItems: 'center',
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
    flexDirection: 'row',
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
    width: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
  },
  messageContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  noPadding: {
    padding: 0,
  },
  signInButton: {
    minWidth: LAYOUT.BUTTON.HEIGHT.LARGE * 3,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});
