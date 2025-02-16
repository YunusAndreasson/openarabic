import React, { ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, View, ImageSourcePropType, StatusBar, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useNavigation } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';

const HEADER_HEIGHT = 280;
const HEADER_HEIGHT_COLLAPSED = 0;
const NAV_HEIGHT = Platform.OS === 'ios' ? 44 : 56;
const NAV_HEADER_HEIGHT = Platform.OS === 'ios' ? 96 : 80;
const SCROLL_THRESHOLD = HEADER_HEIGHT - HEADER_HEIGHT_COLLAPSED;
const HEADER_FADE_THRESHOLD = SCROLL_THRESHOLD * 0.7;

interface Props {
  children: ReactNode;
  backgroundImage?: ImageSourcePropType;
  renderContent: () => ReactNode;
  title: string;
}

export function CollapsibleHeader({ children, backgroundImage, renderContent, title }: Props) {
  const colors = useColors();
  const scrollY = useSharedValue(0);
  const navigation = useNavigation();

  const gradientColors = useMemo(() => {
    return ['transparent', colors.background] as const;
  }, [colors.background]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerTransparent: true,
      headerStyle: { backgroundColor: 'transparent' },
    });
  }, [navigation]);

  const updateNavigation = (progress: number) => {
    navigation.setOptions({
      headerTitle: progress > 0.9 ? title : '',
      headerStyle: {
        backgroundColor: 'transparent',
      },
    });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
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
      opacity,
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <View style={styles.imageContainer}>
          <Image
            source={backgroundImage || require('@/assets/images/default-header.jpg')}
            style={styles.backgroundImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Animated.View style={[styles.headerContent, headerContentAnimatedStyle]}>
              {renderContent()}
            </Animated.View>
          </LinearGradient>
        </View>
      </Animated.View>

      <Animated.View style={[styles.navHeader, navHeaderAnimatedStyle]}>
        <BlurView
          intensity={100}
          tint={colors.background === Colors.dark.background ? 'dark' : 'light'}
          style={styles.blur}
        >
          <View style={[styles.navHeaderBackground, { backgroundColor: colors.cardBackground }]} />
        </BlurView>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: HEADER_HEIGHT + 24, backgroundColor: colors.background },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
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
    padding: 20,
    paddingBottom: 24,
    paddingTop: NAV_HEIGHT + 20,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  navHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: NAV_HEADER_HEIGHT,
    zIndex: 2,
  },
  blur: {
    flex: 1,
  },
  navHeaderBackground: {
    ...StyleSheet.absoluteFillObject,
  },
});
