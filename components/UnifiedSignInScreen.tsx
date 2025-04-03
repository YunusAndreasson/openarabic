import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedButton } from './ThemedButton';
import { ThemedView } from './ThemedView';
import { LAYOUT } from '../constants/layout';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import PageHeader from './PageHeader';
import { withOpacity } from '../utils/colorUtils';
import Auth from './Auth';

interface UnifiedSignInScreenProps {
  /**
   * Current screen title to display in the header
   */
  headerTitle: string;
  /**
   * Theme colors object
   */
  colors: any;
}

/**
 * A unified sign-in screen that displays app-wide benefits
 * and provides a streamlined auth flow in a two-step process:
 * 1. Shows benefits of signing in
 * 2. Provides the actual sign-in form with back navigation
 */
export const UnifiedSignInScreen = React.memo(
  ({ headerTitle, colors }: UnifiedSignInScreenProps) => {
    const [showSignInForm, setShowSignInForm] = useState(false);

    // If showing the sign-in form, render the Auth component
    if (showSignInForm) {
      return (
        <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
          <ThemedView style={styles.container} contentContainerStyle={styles.noPadding}>
            <PageHeader title={headerTitle} onBackPress={() => setShowSignInForm(false)} />
            <View style={styles.authContainer}>
              <Auth />
            </View>
          </ThemedView>
        </Animated.View>
      );
    }

    // Otherwise show the benefits screen
    return (
      <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
        <ThemedView style={styles.container} contentContainerStyle={styles.noPadding}>
          <PageHeader title={headerTitle} />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.emptyStateContainer}>
              <View
                style={[styles.iconContainer, { backgroundColor: withOpacity(colors.text, 0.1) }]}
              >
                <Ionicons name="log-in-outline" size={48} color={colors.text} />
              </View>

              <View style={styles.titleContainer}>
                <ThemedText type="heading2" weight="600" align="center">
                  Sign In Required
                </ThemedText>
              </View>

              <View style={styles.messageContainer}>
                <ThemedText type="body" align="center" variant="secondary">
                  Access features and personalize your experience
                </ThemedText>
              </View>

              <View style={[styles.benefitContainer, { borderColor: colors.cardBorder }]}>
                <View style={styles.benefitItem}>
                  <Ionicons
                    name="bookmark-outline"
                    size={24}
                    color={colors.tint}
                    style={styles.benefitIcon}
                  />
                  <View style={styles.benefitTextContainer}>
                    <ThemedText type="body" weight="600">
                      Bookmarks
                    </ThemedText>
                    <ThemedText type="caption" variant="secondary">
                      Read and listen to saved articles
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <Ionicons
                    name="book-outline"
                    size={24}
                    color={colors.tint}
                    style={styles.benefitIcon}
                  />
                  <View style={styles.benefitTextContainer}>
                    <ThemedText type="body" weight="600">
                      Vocabulary
                    </ThemedText>
                    <ThemedText type="caption" variant="secondary">
                      Create study sets and track progress
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.benefitItem}>
                  <Ionicons
                    name="sync-outline"
                    size={24}
                    color={colors.tint}
                    style={styles.benefitIcon}
                  />
                  <View style={styles.benefitTextContainer}>
                    <ThemedText type="body" weight="600">
                      Sync
                    </ThemedText>
                    <ThemedText type="caption" variant="secondary">
                      Access content on any device
                    </ThemedText>
                  </View>
                </View>
              </View>

              <ThemedButton
                title="Sign In"
                onPress={() => setShowSignInForm(true)}
                style={styles.signInButton}
              />
            </View>
          </ScrollView>
        </ThemedView>
      </Animated.View>
    );
  }
);

UnifiedSignInScreen.displayName = 'UnifiedSignInScreen';

const styles = StyleSheet.create({
  authContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  benefitContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    marginBottom: LAYOUT.SPACING.LARGE,
    padding: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  benefitIcon: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  benefitItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  benefitTextContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  emptyStateContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.XLARGE,
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
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  noPadding: {
    padding: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  signInButton: {
    minWidth: '80%',
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
});
