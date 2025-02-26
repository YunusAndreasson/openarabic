import React, { ReactNode, useCallback, useEffect, useMemo, memo } from 'react';
import {
  StyleSheet,
  View,
  ImageSourcePropType,
  StatusBar,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useNavigation } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

// Extract constants to avoid recalculation
const HEADER_HEIGHT = LAYOUT.HEADER.HEIGHT.EXPANDED;
const HEADER_HEIGHT_COLLAPSED = LAYOUT.HEADER.HEIGHT.COLLAPSED;
const NAV_HEIGHT = LAYOUT.HEADER.NAV_HEIGHT;
const NAV_HEADER_HEIGHT = LAYOUT.HEADER.NAV_HEADER_HEIGHT;
const SCROLL_THRESHOLD = HEADER_HEIGHT - HEADER_HEIGHT_COLLAPSED;
const HEADER_FADE_THRESHOLD = SCROLL_THRESHOLD * 0.8;
const ANIMATION_DURATION = LAYOUT.ANIMATION.DURATION.NORMAL;

interface Props {
  children: ReactNode;
  backgroundImage?: ImageSourcePropType;
  renderContent: () => ReactNode;
  title: string;
  accessibilityLabel?: string;
  customGradientColors?: readonly [string, string, ...string[]];
}

export const CollapsibleHeader = memo(function CollapsibleHeader({
  children,
  backgroundImage,
  renderContent,
  title,
  accessibilityLabel,
  customGradientColors,
}: Props) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const scrollY = useSharedValue(0);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Memoize gradient colors to prevent unnecessary re-renders
  const gradientColors = useMemo(() => {
    // Use custom gradient colors if provided, otherwise use default
    if (customGradientColors) {
      return customGradientColors;
    }

    // Enhanced default gradient for better readability in light mode
    return isDarkMode
      ? (['transparent', colors.background] as const)
      : (['transparent', 'rgba(255, 255, 255, 0.8)', colors.background] as const); // Three-color gradient for light mode
  }, [colors.background, customGradientColors, isDarkMode]);

  // Memoize initial navigation options
  const initialNavOptions = useMemo(
    () => ({
      headerTitle: null,
      headerTransparent: true,
      headerStyle: { backgroundColor: 'transparent' },
    }),
    []
  );

  useEffect(() => {
    navigation.setOptions(initialNavOptions);

    // Announce to screen readers when the component mounts
    if (accessibilityLabel) {
      AccessibilityInfo.announceForAccessibility(accessibilityLabel);
    }
  }, [navigation, initialNavOptions, accessibilityLabel]);

  // Use useCallback to prevent unnecessary re-renders
  const updateNavigation = useCallback(
    (progress: number) => {
      navigation.setOptions({
        headerTitle: progress > 0.9 ? title : null,
        headerStyle: {
          backgroundColor: 'transparent',
        },
      });
    },
    [navigation, title]
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      // Use withTiming for smoother scrolling experience
      scrollY.value = event.contentOffset.y;
      const progress = interpolate(event.contentOffset.y, [0, SCROLL_THRESHOLD], [0, 1], 'clamp');
      runOnJS(updateNavigation)(progress);
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [HEADER_HEIGHT, HEADER_HEIGHT_COLLAPSED],
      'clamp'
    );

    const opacity = interpolate(scrollY.value, [0, HEADER_FADE_THRESHOLD], [1, 0], 'clamp');

    return {
      height,
      opacity,
    };
  });

  const headerContentAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HEADER_FADE_THRESHOLD], [1, 0], 'clamp');

    const scale = interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.9], 'clamp');

    const translateY = interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, 10], 'clamp');

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const navHeaderAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_HEIGHT * 0.7, HEADER_HEIGHT],
      [0, 1],
      'clamp'
    );

    return {
      opacity: withTiming(opacity, { duration: ANIMATION_DURATION }),
    };
  });

  // Memoize the default image to prevent unnecessary re-renders
  const defaultImage = useMemo(() => require('@/assets/images/default-header.jpg'), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View
        style={[styles.header, headerAnimatedStyle]}
        accessibilityRole="header"
        accessibilityLabel={title}
      >
        <View style={styles.imageContainer}>
          <Image
            source={backgroundImage || defaultImage}
            style={styles.backgroundImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={ANIMATION_DURATION}
            placeholder={Platform.OS === 'ios' ? { color: colors.cardBackground } : undefined}
            accessible={false}
          />
          <LinearGradient
            colors={gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Animated.View
              style={[styles.headerContent, headerContentAnimatedStyle]}
              accessibilityElementsHidden={scrollY.value > HEADER_FADE_THRESHOLD}
              importantForAccessibility={
                scrollY.value > HEADER_FADE_THRESHOLD ? 'no-hide-descendants' : 'yes'
              }
            >
              {renderContent()}
            </Animated.View>
          </LinearGradient>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.navHeader, navHeaderAnimatedStyle, { paddingTop: insets.top }]}
        accessibilityRole="header"
        accessibilityLabel={`${title} navigation bar`}
      >
        <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={styles.blur}>
          <View
            style={[
              styles.navHeaderBackground,
              { backgroundColor: colors.cardBackground, opacity: LAYOUT.OPACITY.OVERLAY },
            ]}
          />
        </BlurView>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: HEADER_HEIGHT,
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        removeClippedSubviews={true}
        accessibilityRole="scrollbar"
        accessibilityLabel={`${title} content`}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
    overflow: 'hidden',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  headerContent: {
    padding: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.XXLARGE,
    paddingTop: NAV_HEIGHT + LAYOUT.SPACING.LARGE,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  navHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: NAV_HEADER_HEIGHT,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  blur: {
    flex: 1,
  },
  navHeaderBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
});
