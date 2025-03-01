import { StyleSheet, Alert, Linking, View, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

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
import { Colors } from '@/constants/Colors';
import { LoadingScreen } from '@/components/Loader';

export default function AccountScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const colors = useColors();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const loadingStartTime = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  // Optimize shadow handling with memoized values
  const isDarkMode = useMemo(
    () => colors.background === Colors.dark.background,
    [colors.background]
  );
  const shadowStyles = useMemo(
    () => ({
      secondary: {
        shadowColor: colors.shadow,
        shadowOpacity: isDarkMode ? 0 : 0.1,
      },
    }),
    [colors.shadow, isDarkMode]
  );

  // Custom button styles to ensure left alignment
  const buttonStyles = useMemo(
    () => ({
      innerContainer: {
        justifyContent: 'flex-start' as const,
        alignItems: 'flex-start' as const,
      },
      contentContainer: {
        justifyContent: 'flex-start' as const,
        alignItems: 'flex-start' as const,
      },
    }),
    []
  );

  useEffect(() => {
    async function loadSession() {
      // Clear any existing timeouts to prevent potential issues
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }

      setIsLoading(true);
      loadingStartTime.current = Date.now();
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        // Ensure loader shows for at least 500ms
        const timeElapsed = Date.now() - (loadingStartTime.current || 0);
        if (timeElapsed < 500) {
          loadingTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
            loadingStartTime.current = null;
          }, 500 - timeElapsed);
        } else {
          setIsLoading(false);
          loadingStartTime.current = null;
        }
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
      // Clean up any pending timeouts
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }
      // Reset loading state
      loadingStartTime.current = null;
    };
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
          // Clear any existing timeouts
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = undefined;
          }

          setIsLoading(true);
          loadingStartTime.current = Date.now();
          try {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert('Error', error.message);
          } finally {
            // Ensure loader shows for at least 500ms
            const timeElapsed = Date.now() - (loadingStartTime.current || 0);
            if (timeElapsed < 500) {
              loadingTimeoutRef.current = setTimeout(() => {
                setIsLoading(false);
                loadingStartTime.current = null;
              }, 500 - timeElapsed);
            } else {
              setIsLoading(false);
              loadingStartTime.current = null;
            }
          }
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

  // Show loading screen while session is being fetched
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Account</ThemedText>
        </View>
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
    <ThemedView style={styles.container} useSafeArea={true} includeBottomInset={false}>
      {/* Fixed header */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Account</ThemedText>
      </View>

      {/* Scrollable content */}
      <ThemedView
        scrollable={true}
        useSafeArea={false}
        includeBottomInset={false}
        contentContainerStyle={{
          paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
          paddingTop: LAYOUT.SPACING.MEDIUM,
          paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
        }}
      >
        <View style={styles.content}>
          {/* Preferences Section */}
          <View
            style={[
              styles.settingsContainer,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
                ...shadowStyles.secondary,
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

          {/* Connect Section */}
          <View
            style={[
              styles.connectContainer,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
                ...shadowStyles.secondary,
                marginTop: LAYOUT.SPACING.MEDIUM,
              },
            ]}
          >
            <ThemedButton
              variant="outlined"
              title="Twitter"
              onPress={() => handleSocialLink('https://twitter.com/openarabicio')}
              icon="logo-twitter"
              style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
              innerContainerStyle={buttonStyles.innerContainer}
              contentContainerStyle={buttonStyles.contentContainer}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <ThemedButton
              variant="outlined"
              title="Instagram"
              onPress={() => handleSocialLink('https://instagram.com/openarabic.io')}
              icon="logo-instagram"
              style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
              innerContainerStyle={buttonStyles.innerContainer}
              contentContainerStyle={buttonStyles.contentContainer}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <ThemedButton
              variant="outlined"
              title="Facebook"
              onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
              icon="logo-facebook"
              style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
              innerContainerStyle={buttonStyles.innerContainer}
              contentContainerStyle={buttonStyles.contentContainer}
            />
          </View>

          {/* Support & Account Section */}
          <View
            style={[
              styles.actionsContainer,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
                ...shadowStyles.secondary,
                marginTop: LAYOUT.SPACING.MEDIUM,
              },
            ]}
          >
            <ThemedButton
              variant="outlined"
              title="Contact Support"
              onPress={handleSupport}
              icon="mail"
              style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
              innerContainerStyle={buttonStyles.innerContainer}
              contentContainerStyle={buttonStyles.contentContainer}
            />
            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.signOutContainer}>
              <ThemedButton
                variant="outlined"
                title="Sign Out"
                onPress={signOut}
                icon="log-out"
                style={[
                  styles.actionButton,
                  styles.signOutButton,
                  { backgroundColor: colors.cardBackground },
                ]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <ThemedText style={styles.signedInLabel}>Signed in as:</ThemedText>
              <ThemedText style={styles.signedInEmail} numberOfLines={1} ellipsizeMode="tail">
                {session.user.email}
              </ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>
    </ThemedView>
  );
}

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
  headerIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
  },
  section: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sectionTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: 0,
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
    display: 'none',
  },
  settingsContainer: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    elevation: LAYOUT.Z_INDEX.CARD,
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
    shadowRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: StyleSheet.hairlineWidth,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
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
    justifyContent: 'flex-start',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.CARD.PADDING.LARGE,
    minHeight: 48,
    alignItems: 'flex-start',
  },
  signOutContainer: {
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.CARD.PADDING.LARGE,
  },
  signOutButton: {
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingVertical: 0,
    paddingLeft: 0,
  },
  signedInLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  signedInEmail: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DIMMED,
    marginTop: LAYOUT.SPACING.TINY,
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
  },
  arabicPreviewText: {
    fontFamily: 'NotoNaskhArabic',
    textAlign: 'right',
  },
  englishPreviewText: {
    opacity: LAYOUT.OPACITY.DIMMED,
  },
});
