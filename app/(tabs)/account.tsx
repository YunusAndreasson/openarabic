import { StyleSheet, Alert, Linking, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CustomSlider } from '@/components/Slider';
import { Toggle } from '@/components/Toggle';
import { Avatar } from '@/components/Avatar';
import { supabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFontScale, setShowEnglish } from '@/store/settingsSlice';
import Auth from '@/components/Auth';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';

export default function AccountScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const colors = useColors();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  async function signOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('Error', error.message);
        },
      },
    ]);
  }

  const handleSupport = () => {
    Linking.openURL('mailto:yunus@edenmind.com');
  };

  const handleSocialLink = (url: string) => {
    Linking.openURL(url);
  };

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.authContainer}>
          <ThemedText type="title" style={styles.welcomeTitle}>
            Welcome
          </ThemedText>
          <ThemedText style={styles.subtitle}>Sign in to access your account</ThemedText>
          <Auth />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={styles.container}
      scrollable={true}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.avatarContainer}>
            <Avatar email={session.user.email} size="medium" />
            <View style={styles.profileInfo}>
              <ThemedText style={styles.email} numberOfLines={1} ellipsizeMode="tail">
                {session.user.email}
              </ThemedText>
              <ThemedText
                style={[styles.memberSince, { color: colors.tabIconDefault }]}
                skipDefaultColor
              >
                Member since {new Date(session.user.created_at).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Preferences</ThemedText>
          <View
            style={[
              styles.settingsContainer,
              {
                backgroundColor: colors.cardBackground,
                shadowColor: colors.text,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="moon" size={20} color={colors.tabIconDefault} />
                <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
              </View>
              <ThemeToggle />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="language" size={20} color={colors.tabIconDefault} />
                <ThemedText style={styles.settingLabel}>Show English</ThemedText>
              </View>
              <Toggle
                value={settings.showEnglish}
                onValueChange={value => dispatch(setShowEnglish(value))}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Ionicons name="text" size={20} color={colors.tabIconDefault} />
                <ThemedText style={styles.settingLabel}>Text Size</ThemedText>
              </View>
              <View style={styles.sliderContainer}>
                <ThemedText
                  style={[styles.scaleText, { color: colors.tabIconDefault }]}
                  skipDefaultColor
                >
                  {Math.round(settings.fontScale * 100)}%
                </ThemedText>
                <CustomSlider
                  value={settings.fontScale}
                  onValueChange={value => dispatch(setFontScale(value))}
                  minimumValue={0.8}
                  maximumValue={1.3}
                  step={0.1}
                  style={styles.slider}
                />
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.previewContainer}>
              <ThemedText style={styles.previewLabel}>Article Text Preview</ThemedText>
              <View style={[styles.previewScroller]}>
                <ThemedText
                  style={[
                    styles.arabicPreviewText,
                    {
                      fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * settings.fontScale,
                      lineHeight: Math.round(
                        LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
                          LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL *
                          settings.fontScale
                      ),
                      color: colors.arabicText,
                    },
                  ]}
                  skipDefaultColor
                >
                  مرحباً بك في اللغة العربية
                </ThemedText>
                {settings.showEnglish && (
                  <ThemedText
                    style={[
                      styles.englishPreviewText,
                      {
                        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale,
                        lineHeight: Math.round(
                          LAYOUT.TYPOGRAPHY.SCALE.MEDIUM *
                            LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL *
                            settings.fontScale
                        ),
                        color: colors.text,
                      },
                    ]}
                    skipDefaultColor
                  >
                    Welcome to the Arabic language
                  </ThemedText>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Connect Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Connect With Us</ThemedText>
          <View
            style={[
              styles.connectContainer,
              {
                backgroundColor: colors.cardBackground,
                shadowColor: colors.text,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <ThemedButton
              variant="outlined"
              title="Twitter"
              onPress={() => handleSocialLink('https://twitter.com/openarabicio')}
              icon="logo-twitter"
              style={styles.actionButton}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <ThemedButton
              variant="outlined"
              title="Instagram"
              onPress={() => handleSocialLink('https://instagram.com/openarabic.io')}
              icon="logo-instagram"
              style={styles.actionButton}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <ThemedButton
              variant="outlined"
              title="Facebook"
              onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
              icon="logo-facebook"
              style={styles.actionButton}
            />
          </View>
        </View>

        {/* Support & Account Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Support & Account</ThemedText>
          <View
            style={[
              styles.actionsContainer,
              {
                backgroundColor: colors.cardBackground,
                shadowColor: colors.text,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <ThemedButton
              variant="outlined"
              title="Contact Support"
              onPress={handleSupport}
              icon="mail"
              style={styles.actionButton}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <ThemedButton
              variant="outlined"
              title="Sign Out"
              onPress={signOut}
              icon="log-out"
              style={[styles.actionButton, styles.signOutButton]}
            />
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING,
  },
  scrollContent: {
    paddingRight: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.XXLARGE,
  },
  content: {
    flex: 1,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  section: {
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  sectionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  authContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SCREEN_EDGE_PADDING,
  },
  welcomeTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  subtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  profileInfo: {
    flex: 1,
    marginLeft: LAYOUT.SPACING.MEDIUM,
  },
  email: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  memberSince: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  settingsContainer: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    elevation: LAYOUT.Z_INDEX.CARD,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: LAYOUT.OPACITY.DIMMED,
    shadowRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: StyleSheet.hairlineWidth,
  },
  connectContainer: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    elevation: LAYOUT.Z_INDEX.CARD,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: LAYOUT.OPACITY.DIMMED,
    shadowRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionsContainer: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    elevation: LAYOUT.Z_INDEX.CARD,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: LAYOUT.OPACITY.DIMMED,
    shadowRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: StyleSheet.hairlineWidth,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.CARD.PADDING.LARGE,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
    flex: 1,
  },
  settingLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '500',
    flex: 1,
  },
  actionButton: {
    borderRadius: 0,
    borderWidth: 0,
    justifyContent: 'flex-start', // Left align the button content
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.CARD.PADDING.LARGE,
  },
  signOutButton: {
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  sliderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingLeft: LAYOUT.SPACING.MEDIUM,
  },
  slider: {
    flex: 1,
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM, // Match height with toggle
  },
  scaleText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    width: 44,
    textAlign: 'right',
  },
  previewContainer: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  previewLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  previewScroller: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    gap: LAYOUT.SPACING.MEDIUM,
    height: 140,
    justifyContent: 'center',
  },
  arabicPreviewText: {
    fontFamily: 'NotoNaskhArabic',
    textAlign: 'right',
  },
  englishPreviewText: {
    opacity: LAYOUT.OPACITY.DIMMED,
  },
});
