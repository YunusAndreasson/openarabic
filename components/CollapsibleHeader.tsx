import React, { ReactNode, useCallback, useEffect, useMemo, memo, useState } from 'react';
import {
  StyleSheet,
  View,
  ImageSourcePropType,
  StatusBar,
  Platform,
  AccessibilityInfo,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  runOnJS,
  withTiming,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useNavigation, router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { LoadingContainer } from './Loader';
import { Ionicons } from '@expo/vector-icons';

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
  onImageLoaded?: () => void;
  imageSource?: ImageSourcePropType;
}

export const CollapsibleHeader = memo(function CollapsibleHeader({
  children,
  backgroundImage,
  renderContent,
  title,
  accessibilityLabel,
  customGradientColors,
  onImageLoaded,
  imageSource,
}: Props) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const scrollY = useSharedValue(0);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isImageLoading, setIsImageLoading] = useState(true);

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
      headerShown: false, // Ensure no headers appear when scrolling down
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
        headerTitle: null, // Never show header title when scrolling
        headerShown: false, // Ensure no headers appear when scrolling down
        headerStyle: {
          backgroundColor: 'transparent',
        },
      });
    },
    [navigation]
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

    // Add zoom out effect when pulling down
    const scale = interpolate(scrollY.value, [-100, 0], [1.2, 1], Extrapolate.CLAMP);

    return {
      height,
      opacity,
      transform: [{ scale }],
    };
  });

  const headerContentAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HEADER_FADE_THRESHOLD], [1, 0], 'clamp');

    const scale = interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.9], 'clamp');

    // Enhanced pull-down effect for the content
    const translateY = interpolate(
      scrollY.value,
      [-100, 0, SCROLL_THRESHOLD],
      [30, 0, 10],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  // Memoize the default image to prevent unnecessary re-renders
  const defaultImage = useMemo(() => require('@/assets/images/default-header.jpg'), []);

  // Handle image loading
  const handleImageLoaded = useCallback(() => {
    setIsImageLoading(false);
    if (onImageLoaded) {
      onImageLoaded();
    }
  }, [onImageLoaded]);

  // Render children with proper scrolling behavior
  // Without creating nested scrollable views
  const renderScrollableContent = () => {
    if (!React.isValidElement(children)) {
      return children;
    }

    // Handle FlatList specifically to avoid nested ScrollView warnings
    if (children.type === FlatList || children.props.data) {
      const flatListProps = {
        ...children.props,
        onScroll: scrollHandler,
        scrollEventThrottle: 16,
        contentContainerStyle: {
          paddingTop: HEADER_HEIGHT + 5, // Further reduced gap between header and first sentence
          ...(children.props.contentContainerStyle || {}),
        },
      };

      return <Animated.FlatList {...flatListProps} />;
    }

    // For other components, just wrap them in a container with margin
    return <View style={{ marginTop: HEADER_HEIGHT + 5 }}>{children}</View>;
  };

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
            source={imageSource || backgroundImage || defaultImage}
            style={styles.backgroundImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={ANIMATION_DURATION}
            placeholder={Platform.OS === 'ios' ? { color: colors.cardBackground } : undefined}
            accessible={false}
            onLoad={handleImageLoaded}
          />
          {isImageLoading && (
            <View style={styles.imageLoadingContainer}>
              <LoadingContainer color={colors.tint} />
            </View>
          )}
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

      {/* Back button - always visible with reduced opacity blur */}
      <TouchableOpacity
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        style={styles.backButton}
      >
        <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={styles.backButtonBlur}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.text}
            style={styles.backButtonIcon}
          />
        </BlurView>
      </TouchableOpacity>

      {renderScrollableContent()}
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
    paddingTop: NAV_HEIGHT + LAYOUT.SPACING.XXLARGE + 10, // Significantly increased top padding for category pill
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 25,
    left: 15,
    zIndex: LAYOUT.Z_INDEX.HEADER + 1, // Ensure it's above the header
  },
  backButtonBlur: {
    padding: 8,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  backButtonIcon: {
    alignSelf: 'center',
  },
});
