import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SCREEN_WIDTH } from '@/constants/layout';
import WordDisplay from './WordDisplay';

// Animation config constants to ensure consistency
const FAST_SPRING_CONFIG = {
  stiffness: 250, // Higher stiffness for faster movement
  damping: 20, // Higher damping for less bounce
};

const FADE_DURATION = 80;
const FAST_ANIMATION_CONFIG = {
  duration: FADE_DURATION,
};

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.05;

interface ReviewCardProps {
  word: string;
  fontSize: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isUpdating: boolean;
  isTransitioning: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  word,
  fontSize,
  onSwipeLeft,
  onSwipeRight,
  isUpdating,
  isTransitioning,
}) => {
  // Animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Track if the card is being swiped
  const [isSwiping, setIsSwiping] = useState(false);

  // Create animated styles
  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  }, []);

  // Function to reset card position and state
  const resetCard = useCallback(() => {
    translateX.value = 0;
    setIsSwiping(false);
  }, [translateX]);

  // Function to fade out and in
  const fadeOutAndIn = useCallback(() => {
    // Reset position immediately
    translateX.value = 0;

    // Fade out
    opacity.value = 0;

    // After a tiny delay, fade back in
    setTimeout(() => {
      if (!isTransitioning) {
        opacity.value = withTiming(1, FAST_ANIMATION_CONFIG);
      }
    }, 16); // One frame delay at 60fps
  }, [translateX, opacity, isTransitioning]);

  // Create the gesture handler with proper guards
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Prevent gestures during updates or transitions
      if (isUpdating || isTransitioning) {
        return false;
      }
      setIsSwiping(true);
    })
    .minDistance(1)
    .activateAfterLongPress(0)
    .onUpdate(event => {
      // Prevent gestures during updates or transitions
      if (isUpdating || isTransitioning) return;
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      // Prevent gestures during updates or transitions
      if (isUpdating || isTransitioning) {
        resetCard();
        return;
      }

      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right - success
        translateX.value = withSpring(SCREEN_WIDTH, FAST_SPRING_CONFIG, () => {
          try {
            runOnJS(onSwipeRight)();
            runOnJS(fadeOutAndIn)();
          } catch (error) {
            console.error('Error in swipe right callback:', error);
            runOnJS(resetCard)();
          }
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left - failure
        translateX.value = withSpring(-SCREEN_WIDTH, FAST_SPRING_CONFIG, () => {
          try {
            runOnJS(onSwipeLeft)();
            runOnJS(fadeOutAndIn)();
          } catch (error) {
            console.error('Error in swipe left callback:', error);
            runOnJS(resetCard)();
          }
        });
      } else {
        // Return to center if not swiped far enough
        translateX.value = withSpring(0, FAST_SPRING_CONFIG, () => {
          runOnJS(setIsSwiping)(false);
        });
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        <Animated.View style={[styles.cardContainer, cardStyle]}>
          <WordDisplay word={word} fontSize={fontSize} style={styles.wordContainer} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
});

export default ReviewCard;
