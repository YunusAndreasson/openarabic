import React, { useCallback } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SCREEN_WIDTH } from '@/constants/layout';
import WordDisplay from './WordDisplay';

// Animation config constants
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.15; // Reduced from 0.3 to 0.15 for easier swipes
const TIMING_CONFIG = { duration: 300 };

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
  console.log('[ReviewCard] Rendering with:', { word, fontSize, isUpdating, isTransitioning });

  // Animation values
  const translateX = useSharedValue(0);

  // Reset position function
  const resetPosition = useCallback(() => {
    console.log('[ReviewCard] Resetting position');
    translateX.value = withTiming(0, TIMING_CONFIG);
  }, [translateX]);

  // Create pan gesture
  const panGesture = Gesture.Pan()
    .enabled(!isUpdating && !isTransitioning)
    .minDistance(1) // Make gesture recognition more sensitive
    .onBegin(() => {
      console.log('[ReviewCard] Pan gesture began:', {
        isUpdating,
        isTransitioning,
        currentX: translateX.value,
        word,
      });
    })
    .onUpdate(event => {
      if (!isUpdating && !isTransitioning) {
        translateX.value = event.translationX;
      } else {
        console.log('[ReviewCard] Gesture blocked during update:', {
          isUpdating,
          isTransitioning,
          translationX: event.translationX,
        });
      }
    })
    .onEnd(event => {
      console.log('[ReviewCard] Pan end:', {
        translationX: event.translationX,
        threshold: SWIPE_THRESHOLD,
        isUpdating,
        isTransitioning,
        word,
      });

      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const isRight = event.translationX > 0;
        console.log('[ReviewCard] Swipe threshold met, triggering:', { isRight });
        runOnJS(isRight ? onSwipeRight : onSwipeLeft)();
      }

      runOnJS(resetPosition)();
    })
    .onFinalize(() => {
      console.log('[ReviewCard] Gesture finalized:', {
        isUpdating,
        isTransitioning,
        currentX: translateX.value,
        word,
      });
    });

  // Create animated style for the swipe container only
  const swipeContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.swipeContainer, swipeContainerStyle]}>
        <Animated.View style={styles.wordContainer}>
          <WordDisplay word={word} fontSize={fontSize} />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  wordContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  } as ViewStyle,
});

export default ReviewCard;
