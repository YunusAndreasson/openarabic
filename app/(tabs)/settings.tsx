import { StyleSheet, Alert, Linking, View, ScrollView } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useState, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { useLoadingState, useScreenAnimation } from '../../hooks';
import PageHeader from '../../components/PageHeader';
import { lightFeedback } from '@/utils/haptics';
import BaseCard from '@/components/BaseCard';

// Helper function to calculate header height
const getHeaderHeight = (insets: { top: number }) => {
  return insets.top + LAYOUT.SPACING.TINY + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.LARGE;
};

export default function SettingsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const colors = useColors();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const insets = useSafeAreaInsets();

  // Use the new loading state hook with minimal loading time
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState(); // Using default values (80ms, true)

  // Use the new screen animation hook
  const { fadeInStyle } = useScreenAnimation(
    true, // Always ready to display
    isLoadingState
    // Using default values for remaining parameters
  );

  const loadSession = useCallback(async () => {
    // Skip if data is already loaded
    if (session) {
      return;
    }

    startLoading();
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    } catch (_error) {
      // Error handling removed
    } finally {
      stopLoading();
    }
  }, [session, startLoading, stopLoading]);

  // Use focus effect to only load session when tab is focused and data isn't loaded yet
  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [loadSession])
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

  // Memoize text preview styles to avoid recalculation on each render
  const previewTextStyles = useMemo(() => {
    const arabicFontSize = LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * settings.fontScale;
    const arabicLineHeight = Math.round(
      LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL * settings.fontScale
    );

    const englishFontSize = LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale;
    const englishLineHeight = Math.round(
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL * settings.fontScale
    );

    return {
      arabic: {
        fontSize: arabicFontSize,
        lineHeight: arabicLineHeight,
        color: colors.arabicText,
        fontFamily: 'NotoNaskhArabic',
      },
      english: {
        fontSize: englishFontSize,
        lineHeight: englishLineHeight,
        color: colors.text,
        fontFamily: 'Philosopher-Regular',
      },
      hiddenEnglish: {
        fontSize: englishFontSize,
        lineHeight: englishLineHeight,
        opacity: 0,
      },
    };
  }, [settings.fontScale, colors.arabicText, colors.text]);

  async function signOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            startLoading();
            try {
              const { error } = await supabase.auth.signOut();
              if (error) Alert.alert('Error', error.message);
            } finally {
              stopLoading();
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  const handleSupport = () => {
    Linking.openURL('mailto:yunus@edenmind.com');
  };

  const handleSocialLink = (url: string) => {
    Linking.openURL(url);
  };

  // Handle font scale change with haptic feedback
  const handleFontScaleChange = useCallback(
    (value: number) => {
      // Get the previous scale value
      const previousScale = settings.fontScale;

      // Check if the value has actually changed to a different step
      if (Math.abs(value - previousScale) >= 0.1) {
        // Trigger haptic feedback for every increment
        lightFeedback();
      }

      dispatch(setFontScale(value));
    },
    [settings.fontScale, dispatch]
  );

  // Use cached data to render a skeleton while loading instead of the full loading screen
  if (isLoadingState) {
    return (
      <Animated.View style={[styles.flexOne, fadeInStyle]}>
        <ThemedView style={styles.container}>
          <PageHeader title="Settings" />
        </ThemedView>
      </Animated.View>
    );
  }

  if (!session) {
    return (
      <Animated.View style={[styles.flexOne, fadeInStyle]}>
        <ThemedView style={styles.container}>
          <PageHeader title="Settings" />
          <View style={styles.authContainer}>
            <ThemedText type="heading2" weight="600" align="center">
              Welcome
            </ThemedText>
            <View style={styles.subtitleContainer}>
              <ThemedText type="body" align="center">
                Sign in to continue
              </ThemedText>
            </View>
            <Auth />
          </View>
        </ThemedView>
      </Animated.View>
    );
  }

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
    >
      <ThemedView
        useSafeArea={false}
        includeBottomInset={false}
        style={{ flex: 1 }}
        scrollable={true}
        contentContainerStyle={[styles.listContent, { paddingTop: getHeaderHeight(insets) }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Preferences Section */}
          <View style={styles.settingsWrapper}>
            <BaseCard
              style={styles.settingsContainer}
              shadowSize="small"
              includePressAnimation={false}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="moon" size={20} color={colors.tabIconDefault} />
                  <View style={styles.settingLabelTextContainer}>
                    <ThemedText type="body">Dark Mode</ThemedText>
                  </View>
                </View>
                <ThemeToggle />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="language" size={20} color={colors.tabIconDefault} />
                  <View style={styles.settingLabelTextContainer}>
                    <ThemedText type="body">English Translation</ThemedText>
                  </View>
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
                  <View style={styles.settingLabelTextContainer}>
                    <ThemedText type="body">Text Size</ThemedText>
                  </View>
                </View>
                <View style={styles.sliderContainer}>
                  <ThemedText
                    type="caption"
                    variant="secondary"
                    align="right"
                    style={styles.scaleText}
                  >
                    {Math.round(settings.fontScale * 100)}%
                  </ThemedText>
                  <CustomSlider
                    value={settings.fontScale}
                    onValueChange={handleFontScaleChange}
                    minimumValue={0.8}
                    maximumValue={1.3}
                    step={0.1}
                    style={styles.slider}
                  />
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.previewContainer}>
                <View style={styles.previewLabelContainer}>
                  <ThemedText type="caption" variant="secondary">
                    Preview
                  </ThemedText>
                </View>
                <View style={styles.previewWrapper}>
                  <View style={styles.previewContent}>
                    <ThemedText
                      type="arabic"
                      arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * settings.fontScale}
                      align="right"
                      skipDefaultColor
                      colorName="arabicText"
                      style={styles.arabicPreviewText}
                    >
                      مرحباً بك في اللغة العربية
                    </ThemedText>
                    {settings.showEnglish ? (
                      <ThemedText
                        type="body"
                        skipDefaultColor
                        colorName="text"
                        align="left"
                        style={[styles.englishPreviewText, { opacity: LAYOUT.OPACITY.MEDIUM_HIGH }]}
                      >
                        Welcome to the Arabic language
                      </ThemedText>
                    ) : (
                      <ThemedText type="body" style={[styles.englishPreviewText, { opacity: 0 }]}>
                        Welcome to the Arabic language
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>
            </BaseCard>
          </View>

          {/* Connect Section */}
          <View style={styles.connectWrapper}>
            <BaseCard
              style={styles.connectContainer}
              shadowSize="small"
              includePressAnimation={false}
            >
              <ThemedButton
                variant="outlined"
                title="Twitter"
                onPress={() => handleSocialLink('https://twitter.com/OpenArabicApp')}
                icon="logo-twitter"
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
            </BaseCard>
          </View>

          {/* Support & Account Section */}
          <View style={styles.actionsWrapper}>
            <BaseCard
              style={styles.actionsContainer}
              shadowSize="small"
              includePressAnimation={false}
            >
              <ThemedButton
                variant="outlined"
                title="Support"
                onPress={handleSupport}
                icon="mail"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <ThemedButton
                variant="outlined"
                title="Sign Out"
                onPress={signOut}
                icon="log-out"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
            </BaseCard>
          </View>
        </ScrollView>
      </ThemedView>
      <PageHeader title="Settings" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    padding: LAYOUT.SCREEN_EDGE_PADDING,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  settingsWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  settingsContainer: {
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
  settingLabelTextContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
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
    marginRight: LAYOUT.SPACING.SMALL,
  },
  previewContainer: {
    padding: LAYOUT.SPACING.SMALL,
  },
  previewLabelContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  previewWrapper: {
    height: 100,
    overflow: 'hidden',
  },
  previewContent: {
    position: 'absolute',
    width: '100%',
    top: 0,
  },
  arabicPreviewText: {
    marginBottom: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
    flexShrink: 0,
  },
  englishPreviewText: {
    paddingVertical: LAYOUT.SPACING.TINY,
    flexShrink: 0,
  },
  connectWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  connectContainer: {
    overflow: 'hidden',
  },
  actionsWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  actionsContainer: {
    overflow: 'hidden',
  },
  actionButton: {
    borderWidth: 0,
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
  },
});
