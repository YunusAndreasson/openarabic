import { useState, useCallback, useMemo } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent, ViewStyle } from 'react-native';
import type { AnimatedStyleProp } from 'react-native-reanimated';

import { useOpacityAnimation } from './useOpacityAnimation';

interface ScreenAnimationsResult {
  contentStyle: AnimatedStyleProp<ViewStyle>;
  headerStyle: AnimatedStyleProp<ViewStyle>;
  footerStyle: AnimatedStyleProp<ViewStyle>;
  backButtonStyle: AnimatedStyleProp<ViewStyle>;
  bookmarkButtonStyle: AnimatedStyleProp<ViewStyle>;
  playButtonStyle: AnimatedStyleProp<ViewStyle>;
  startAllAnimations: () => void;
  handleScroll: (
    event: NativeSyntheticEvent<NativeScrollEvent>,
    prevScrollYRef: React.MutableRefObject<number>
  ) => void;
}

/**
 * Custom hook that unifies all animations for the article screen.
 * Manages content, header, footer, and button animations in one place.
 *
 * @param initialButtonsVisibility - Whether the buttons should be visible initially
 * @returns Object containing all animation styles and controls
 */
export const useScreenAnimations = (initialButtonsVisibility = true): ScreenAnimationsResult => {
  // Animation visibility state
  const [isButtonsVisible, setIsButtonsVisible] = useState(initialButtonsVisibility);

  // Content animations
  const { animatedStyle: contentStyle, startAnimation: startContentAnimation } =
    useOpacityAnimation({ initialOpacity: 0, delay: 0, duration: 400 });

  const { animatedStyle: headerStyle, startAnimation: startHeaderAnimation } = useOpacityAnimation({
    initialOpacity: 0,
    delay: 0,
    duration: 400,
  });

  const { animatedStyle: footerStyle, startAnimation: startFooterAnimation } = useOpacityAnimation({
    initialOpacity: 0,
    delay: 200,
    duration: 400,
  });

  // Button animations
  const {
    animatedStyle: backButtonStyle,
    startAnimation: startBackButtonAnimation,
    setOpacity: setBackButtonOpacity,
  } = useOpacityAnimation({ initialOpacity: 1, duration: 300 });

  const {
    animatedStyle: bookmarkButtonStyle,
    startAnimation: startBookmarkButtonAnimation,
    setOpacity: setBookmarkButtonOpacity,
  } = useOpacityAnimation({ initialOpacity: 1, duration: 300 });

  const {
    animatedStyle: playButtonStyle,
    startAnimation: startPlayButtonAnimation,
    setOpacity: setPlayButtonOpacity,
  } = useOpacityAnimation({ initialOpacity: 1, duration: 300 });

  // Unified function to start all content animations
  const startAllAnimations = useCallback(() => {
    startContentAnimation();
    startHeaderAnimation();
    startFooterAnimation();
    startBackButtonAnimation();
    startBookmarkButtonAnimation();
    startPlayButtonAnimation();
  }, [
    startContentAnimation,
    startHeaderAnimation,
    startFooterAnimation,
    startBackButtonAnimation,
    startBookmarkButtonAnimation,
    startPlayButtonAnimation,
  ]);

  // Handle scroll events for button visibility
  const handleScroll = useCallback(
    (
      event: NativeSyntheticEvent<NativeScrollEvent>,
      prevScrollYRef: React.MutableRefObject<number>
    ) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const isScrollingUp = currentScrollY < prevScrollYRef.current;
      const isAtTop = currentScrollY <= 0;
      const shouldBeVisible = isScrollingUp || isAtTop;

      if (isButtonsVisible !== shouldBeVisible) {
        setIsButtonsVisible(shouldBeVisible);

        if (shouldBeVisible) {
          startBackButtonAnimation();
          startBookmarkButtonAnimation();
          startPlayButtonAnimation();
        } else {
          setBackButtonOpacity(0);
          setBookmarkButtonOpacity(0);
          setPlayButtonOpacity(0);
        }
      }
      prevScrollYRef.current = currentScrollY;
    },
    [
      isButtonsVisible,
      startBackButtonAnimation,
      startBookmarkButtonAnimation,
      startPlayButtonAnimation,
      setBackButtonOpacity,
      setBookmarkButtonOpacity,
      setPlayButtonOpacity,
    ]
  );

  return {
    // Animation styles - ensure they're typed as AnimatedStyleProp<ViewStyle>
    contentStyle: useMemo(() => contentStyle as AnimatedStyleProp<ViewStyle>, [contentStyle]),
    headerStyle: useMemo(() => headerStyle as AnimatedStyleProp<ViewStyle>, [headerStyle]),
    footerStyle: useMemo(() => footerStyle as AnimatedStyleProp<ViewStyle>, [footerStyle]),
    backButtonStyle: useMemo(
      () => backButtonStyle as AnimatedStyleProp<ViewStyle>,
      [backButtonStyle]
    ),
    bookmarkButtonStyle: useMemo(
      () => bookmarkButtonStyle as AnimatedStyleProp<ViewStyle>,
      [bookmarkButtonStyle]
    ),
    playButtonStyle: useMemo(
      () => playButtonStyle as AnimatedStyleProp<ViewStyle>,
      [playButtonStyle]
    ),

    // Animation controllers
    startAllAnimations,
    handleScroll,
  };
};
