import { StyleSheet, Alert, Linking, View, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { ThemedButton } from '../../components/ThemedButton';
import { ThemeToggle } from '../../components/ThemeToggle';
import { CustomSlider } from '../../components/Slider';
import { Toggle } from '../../components/Toggle';
import { supabase } from '../../services/supabase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFontScale, setShowEnglish } from '../../store/settingsSlice';
import Auth from '../../components/Auth';
import { useColors } from '../../hooks/useColors';
import { LAYOUT } from '../../constants/layout';
import { LoadingScreen } from '../../components/Loader';
import { useFadeInAnimation } from '../../utils/animations';

export default function AccountScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const colors = useColors();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const loadingStartTime = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadedRef = useRef(false);

  // Add animation hooks
  const { animatedStyle: fadeInStyle, startAnimation: startFadeIn } = useFadeInAnimation(0, 300);

  // Start the animation when the component mounts or when isLoading changes
  useEffect(() => {
    if (!isLoading) {
      startFadeIn();
    }
  }, [isLoading, startFadeIn]);

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

  const loadSession = useCallback(async () => {
    // Skip if data is already loaded
    if (dataLoadedRef.current && session) {
      return;
    }

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
      dataLoadedRef.current = true;
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
  }, [session]);

  // Use focus effect to only load session when tab is focused and data isn't loaded yet
  useFocusEffect(
    useCallback(() => {
      if (!dataLoadedRef.current) {
        loadSession();
      }
    }, [loadSession])
  );

  useEffect(() => {
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

  // Override styles with theme-specific colors
  const themedStyles = useMemo(
    () => ({
      ...styles,
    }),
    [colors]
  );

  // Show loading screen while session is being fetched
  if (isLoading) {
    return (
      <ThemedView style={themedStyles.container}>
        <LoadingScreen />
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <Animated.View style={[{ flex: 1 }, fadeInStyle]}>
        <ThemedView style={themedStyles.container}>
          <View style={[themedStyles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
            <ThemedText style={themedStyles.headerTitle}>Account</ThemedText>
          </View>
          <View style={themedStyles.authContainer}>
            <ThemedText type="title" style={themedStyles.welcomeTitle}>
              Welcome
            </ThemedText>
            <ThemedText style={themedStyles.subtitle}>Sign in to access your account</ThemedText>
            <Auth />
          </View>
        </ThemedView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ flex: 1 }, fadeInStyle]}>
      <ThemedView style={themedStyles.container} useSafeArea={true} includeBottomInset={false}>
        {/* Fixed header */}
        <View style={[themedStyles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={themedStyles.headerTitle}>Account</ThemedText>
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
          <View style={themedStyles.content}>
            {/* Preferences Section */}
            <View
              style={[
                themedStyles.settingsContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
                LAYOUT.SHADOW.MEDIUM,
              ]}
            >
              <View style={themedStyles.settingRow}>
                <View style={themedStyles.settingLabelContainer}>
                  <Ionicons name="moon" size={20} color={colors.tabIconDefault} />
                  <ThemedText style={themedStyles.settingLabel}>Dark Mode</ThemedText>
                </View>
                <ThemeToggle />
              </View>
              <View style={[themedStyles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={themedStyles.settingRow}>
                <View style={themedStyles.settingLabelContainer}>
                  <Ionicons name="language" size={20} color={colors.tabIconDefault} />
                  <ThemedText style={themedStyles.settingLabel}>Show English</ThemedText>
                </View>
                <Toggle
                  value={settings.showEnglish}
                  onValueChange={value => dispatch(setShowEnglish(value))}
                />
              </View>
              <View style={[themedStyles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={themedStyles.settingRow}>
                <View style={themedStyles.settingLabelContainer}>
                  <Ionicons name="text" size={20} color={colors.tabIconDefault} />
                  <ThemedText style={themedStyles.settingLabel}>Text Size</ThemedText>
                </View>
                <View style={themedStyles.sliderContainer}>
                  <ThemedText
                    style={[themedStyles.scaleText, { color: colors.tabIconDefault }]}
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
                    style={themedStyles.slider}
                  />
                </View>
              </View>
              <View style={[themedStyles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={themedStyles.previewContainer}>
                <ThemedText style={themedStyles.previewLabel}>Article Text Preview</ThemedText>
                <ThemedText
                  style={[
                    themedStyles.arabicPreviewText,
                    {
                      fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * settings.fontScale,
                      lineHeight: Math.round(
                        LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
                          LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL *
                          settings.fontScale
                      ),
                      color: colors.arabicText,
                      fontFamily: 'NotoNaskhArabic',
                    },
                  ]}
                  skipDefaultColor
                >
                  مرحباً بك في اللغة العربية
                </ThemedText>
                {settings.showEnglish ? (
                  <ThemedText
                    style={[
                      themedStyles.englishPreviewText,
                      {
                        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale,
                        lineHeight: Math.round(
                          LAYOUT.TYPOGRAPHY.SCALE.MEDIUM *
                            LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL *
                            settings.fontScale
                        ),
                        color: colors.text,
                        fontFamily: 'Philosopher-Regular',
                      },
                    ]}
                    skipDefaultColor
                  >
                    Welcome to the Arabic language
                  </ThemedText>
                ) : (
                  <ThemedText
                    style={[
                      themedStyles.englishPreviewText,
                      {
                        fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale,
                        lineHeight: Math.round(
                          LAYOUT.TYPOGRAPHY.SCALE.MEDIUM *
                            LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL *
                            settings.fontScale
                        ),
                        opacity: 0,
                      },
                    ]}
                  >
                    Welcome to the Arabic language
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Connect Section */}
            <View
              style={[
                themedStyles.connectContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                  marginTop: LAYOUT.SPACING.MEDIUM,
                },
                LAYOUT.SHADOW.MEDIUM,
              ]}
            >
              <ThemedButton
                variant="outlined"
                title="Twitter"
                onPress={() => handleSocialLink('https://twitter.com/openarabicio')}
                icon="logo-twitter"
                style={[themedStyles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={[themedStyles.divider, { backgroundColor: colors.cardBorder }]} />
              <ThemedButton
                variant="outlined"
                title="Instagram"
                onPress={() => handleSocialLink('https://instagram.com/openarabic.io')}
                icon="logo-instagram"
                style={[themedStyles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={[themedStyles.divider, { backgroundColor: colors.cardBorder }]} />
              <ThemedButton
                variant="outlined"
                title="Facebook"
                onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
                icon="logo-facebook"
                style={[themedStyles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
            </View>

            {/* Support & Account Section */}
            <View
              style={[
                themedStyles.actionsContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                  marginTop: LAYOUT.SPACING.MEDIUM,
                },
                LAYOUT.SHADOW.MEDIUM,
              ]}
            >
              <ThemedButton
                variant="outlined"
                title="Contact Support"
                onPress={handleSupport}
                icon="mail"
                style={[themedStyles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={[themedStyles.divider, { backgroundColor: colors.cardBorder }]} />
              <ThemedButton
                variant="outlined"
                title="Sign Out"
                onPress={signOut}
                icon="log-out"
                style={[themedStyles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={themedStyles.accountInfoContainer}>
                <ThemedText style={themedStyles.signedInLabel}>Signed in as:</ThemedText>
                <ThemedText
                  style={themedStyles.signedInEmail}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {session.user.email}
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      </ThemedView>
    </Animated.View>
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
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  welcomeTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.XLARGE,
    textAlign: 'center',
  },
  settingsContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    marginLeft: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  divider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    width: '100%',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  scaleText: {
    width: 45,
    textAlign: 'right',
    marginRight: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  previewContainer: {
    padding: LAYOUT.SPACING.MEDIUM,
  },
  previewLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  arabicPreviewText: {
    textAlign: 'right',
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  englishPreviewText: {
    textAlign: 'left',
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  connectContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
  },
  actionsContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
  },
  actionButton: {
    borderWidth: 0,
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  accountInfoContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  signedInLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  signedInEmail: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});
