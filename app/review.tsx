import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Animated, PanResponder, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { router, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = 200;
const FADE_DURATION = 150;
const DEBOUNCE_DELAY = 300; // Prevent rapid swipes

// Add color feedback for swipe directions
const getSwipeColors = (dx: number, colors: any) => {
  const swipeProgress = Math.abs(dx) / SWIPE_THRESHOLD;
  const opacity = Math.min(swipeProgress * 0.25, 0.25); // Reduce max opacity to 25%

  if (dx > 0) {
    return { backgroundColor: colors.success, opacity };
  } else if (dx < 0) {
    return { backgroundColor: colors.warning, opacity };
  }
  return { backgroundColor: 'transparent', opacity: 0 };
};

// Add throttle utility with proper typing
const throttle = <T extends (...args: any[]) => any>(func: T, limit: number): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>): ReturnType<T> | void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      requestAnimationFrame(() => {
        inThrottle = false;
      });
    }
  }) as T;
};

export default function ReviewScreen() {
  useEffect(() => {
    router.setParams({ hideHeader: 'true' });
  }, []);

  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Keep a stable reference to the current words
  const wordsRef = useRef<any[]>([]);

  // Optimize data fetching with increased stale time
  const {
    data: dueWords = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['dueWords', user?.id],
    queryFn: async () => {
      const words = await studyWordsService.getStudyWords(user!.id);

      const now = new Date();
      const filtered = words
        .filter(word => {
          if (!word.sentence_word || !word.next_review_at) return false;
          const reviewDate = new Date(word.next_review_at);
          return reviewDate <= now && word.interval_days < 30;
        })
        .sort((a, b) => {
          const dateA = new Date(a.next_review_at);
          const dateB = new Date(b.next_review_at);
          return dateA.getTime() - dateB.getTime();
        });

      console.log(`Found ${filtered.length} words due for review`);
      return filtered;
    },
    enabled: !!user,
    staleTime: 30000, // Increase stale time to 30 seconds
    gcTime: 300000, // Increase cache time to 5 minutes
    refetchOnWindowFocus: false,
  });

  // Update wordsRef when dueWords changes
  useEffect(() => {
    if (dueWords && Array.isArray(dueWords)) {
      // Make sure we have a fresh copy of the words
      wordsRef.current = [...dueWords];
      setCurrentIndex(0);
    }
  }, [dueWords]);

  // Enhanced animation state tracking
  const animationState = useRef({
    isAnimating: false,
    isMutating: false,
    lastSwipeTime: 0,
    currentWord: null as any,
    direction: null as 'left' | 'right' | null,
    animationPromise: null as Promise<void> | null,
  }).current;

  const isInteractionDisabled = () => {
    const now = Date.now();
    const isDebouncing = now - animationState.lastSwipeTime < DEBOUNCE_DELAY;
    return (
      isLoading ||
      isFetching ||
      isUpdating ||
      animationState.isAnimating ||
      animationState.isMutating ||
      isDebouncing
    );
  };

  // Update word review status
  const updateWordMutation = useMutation({
    mutationFn: async ({
      wordId,
      success,
      wordToUpdate,
    }: {
      wordId: number;
      success: boolean;
      wordToUpdate: any;
    }) => {
      animationState.isMutating = true;
      setIsUpdating(true);

      const newInterval = success
        ? Math.max(1, Math.round(wordToUpdate.interval_days * wordToUpdate.ease_factor))
        : 1;
      const newEaseFactor = success
        ? Math.max(1.3, wordToUpdate.ease_factor + (0.1 - (5 - 5) * (0.08 + (5 - 5) * 0.02)))
        : Math.max(1.3, wordToUpdate.ease_factor - 0.2);

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + newInterval);

      const update = {
        interval_days: newInterval,
        ease_factor: newEaseFactor,
        next_review_at: nextReview.toISOString(),
        review_count: wordToUpdate.review_count + 1,
        lapses: success ? wordToUpdate.lapses : wordToUpdate.lapses + 1,
      };

      try {
        await studyWordsService.updateWordReview(wordId, update);
        return { success: true };
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
    },
    onSettled: () => {
      animationState.isMutating = false;
      setIsUpdating(false);
    },
    onError: () => {
      resetPosition();
    },
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Memoize animation sequence for better performance
  const createAnimationSequence = useCallback(
    (toValue: any, duration: number) => {
      return Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: toValue.fade,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(position, {
          toValue: { x: toValue.x, y: 0 },
          useNativeDriver: true,
          tension: 40,
          friction: 5,
          velocity: toValue.velocity || 0,
        }),
      ]);
    },
    [fadeAnim, position]
  );

  // Memoize reset position function
  const resetPosition = useCallback(async () => {
    position.stopAnimation();
    fadeAnim.stopAnimation();

    if (animationState.animationPromise) {
      return animationState.animationPromise;
    }

    const resetPromise = new Promise<void>(resolve => {
      createAnimationSequence({ fade: 1, x: 0 }, FADE_DURATION).start(() => {
        animationState.isAnimating = false;
        animationState.currentWord = null;
        animationState.direction = null;
        animationState.animationPromise = null;
        setIsAnimating(false);
        setSwipeDirection({ dx: 0, opacity: 0 });
        resolve();
      });
    });

    animationState.animationPromise = resetPromise;
    return resetPromise;
  }, [createAnimationSequence, position, fadeAnim]);

  const forceSwipe = async (direction: 'left' | 'right') => {
    const currentWords = wordsRef.current;

    if (isInteractionDisabled()) {
      await resetPosition();
      return;
    }

    // Update last swipe time
    animationState.lastSwipeTime = Date.now();

    // Ensure we have valid data before proceeding
    if (!currentWords?.length || currentIndex >= currentWords.length) {
      await resetPosition();
      return;
    }

    const wordToUpdate = currentWords[currentIndex];
    if (!wordToUpdate?.sentence_word?.id) {
      await resetPosition();
      return;
    }

    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;

    animationState.isAnimating = true;
    animationState.currentWord = wordToUpdate;
    animationState.direction = direction;
    setIsAnimating(true);

    const swipePromise = new Promise<void>(resolve => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(position, {
          toValue: { x, y: 0 },
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: true,
        }),
      ]).start(async ({ finished }) => {
        if (!finished) {
          await resetPosition();
          resolve();
          return;
        }

        try {
          await updateWordMutation.mutateAsync({
            wordId: wordToUpdate.sentence_word_id,
            success: direction === 'right',
            wordToUpdate: wordToUpdate,
          });

          position.setValue({ x: 0, y: 0 });

          // Fade in the next card
          await new Promise<void>(fadeResolve => {
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: FADE_DURATION,
              useNativeDriver: true,
            }).start(() => {
              animationState.isAnimating = false;
              animationState.currentWord = null;
              animationState.direction = null;
              animationState.animationPromise = null;
              setIsAnimating(false);
              fadeResolve();
            });
          });

          // Invalidate queries after everything is complete
          await queryClient.invalidateQueries({ queryKey: ['studyWords', user?.id] });
          await queryClient.invalidateQueries({ queryKey: ['dueWords', user?.id] });
        } catch {
          await resetPosition();
        }
        resolve();
      });
    });

    animationState.animationPromise = swipePromise;
    return swipePromise;
  };

  const [swipeDirection, setSwipeDirection] = useState<{ dx: number; opacity: number }>({
    dx: 0,
    opacity: 0,
  });

  // Throttled pan responder move handler
  const handlePanResponderMove = useCallback(
    throttle((dx: number) => {
      if (isInteractionDisabled()) return;

      const resistance = 0.75;
      const adjustedDx = dx * resistance;
      position.setValue({ x: adjustedDx, y: 0 });

      setSwipeDirection({ dx: adjustedDx, opacity: Math.abs(adjustedDx) / SCREEN_WIDTH });

      const maxDragDistance = SCREEN_WIDTH * 0.4;
      const fadeValue = Math.max(0.7, 1 - Math.abs(dx) / maxDragDistance);
      fadeAnim.setValue(fadeValue);
    }, 16), // ~60fps
    [position, fadeAnim, isInteractionDisabled]
  );

  // Memoize pan responder
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isInteractionDisabled(),
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        return !isInteractionDisabled() && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        if (isInteractionDisabled()) return;
        position.setValue({ x: 0, y: 0 });
        setSwipeDirection({ dx: 0, opacity: 0 });
      },
      onPanResponderMove: (_, { dx }) => handlePanResponderMove(dx),
      onPanResponderRelease: async (_, { dx, vx }) => {
        if (isInteractionDisabled()) return;

        position.flattenOffset();
        setSwipeDirection({ dx: 0, opacity: 0 });

        const isRightSwipe = dx > SWIPE_THRESHOLD || (dx > 0 && vx > 0.3);
        const isLeftSwipe = dx < -SWIPE_THRESHOLD || (dx < 0 && vx < -0.3);

        if (isRightSwipe) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await forceSwipe('right');
        } else if (isLeftSwipe) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          await forceSwipe('left');
        } else {
          await resetPosition();
        }
      },
    })
  ).current;

  const handleClose = () => {
    router.back();
  };

  // Get current word data
  const currentWord = dueWords?.[currentIndex];
  const word = currentWord?.sentence_word;
  const wordForm = word?.word_form;
  const sentence = word?.sentence?.arabic;

  // Memoized computations
  const parts = useMemo(() => {
    if (!sentence || !wordForm) return ['', ''];
    return sentence.split(wordForm);
  }, [sentence, wordForm]);

  const progress = useMemo(() => {
    return (currentIndex / (dueWords?.length || 1)) * 100;
  }, [currentIndex, dueWords?.length]);

  // Show loading state during any data operations
  if (!user || isLoading || isFetching) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]} />
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.completeContainer}>
            <ThemedText style={styles.message}>Loading...</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  // Show error state
  if (isError) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]} />
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.completeContainer}>
            <ThemedText style={styles.message}>Error loading words</ThemedText>
            <ThemedText style={styles.submessage}>{error?.message}</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  // Ensure we have valid data
  if (!dueWords || !Array.isArray(dueWords) || dueWords.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]} />
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.completeContainer}>
            <ThemedText style={styles.message}>No words due for review</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  if (currentIndex >= dueWords.length) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]}>
              <View
                style={[styles.progressFill, { width: '100%', backgroundColor: colors.tint }]}
              />
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.completeContainer}>
            <ThemedText style={styles.message}>Review complete!</ThemedText>
            <ThemedText style={styles.submessage}>
              You've reviewed all {dueWords.length} words.
            </ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  if (!currentWord?.sentence_word) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]} />
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.completeContainer}>
            <ThemedText style={styles.message}>Error loading word data</ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  if (!sentence) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: colors.tint },
                ]}
              />
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Swipe direction feedback overlay */}
          {swipeDirection.dx !== 0 && (
            <View style={[styles.swipeFeedback, getSwipeColors(swipeDirection.dx, colors)]} />
          )}

          <Animated.View
            style={[
              styles.contentContainer,
              {
                transform: [{ translateX: position.x }],
                opacity: fadeAnim,
              },
            ]}
            {...panResponderRef.panHandlers}
          >
            <View style={styles.wordContainer}>
              <ThemedText
                style={[styles.highlightedWord, { color: colors.arabicText }]}
                skipDefaultColor
              >
                {wordForm}
              </ThemedText>
            </View>
          </Animated.View>

          <View style={styles.instructions}>
            <View style={[styles.instructionSide, { backgroundColor: colors.warningOverlay }]}>
              <MaterialCommunityIcons
                name="gesture-swipe-left"
                size={24}
                color={colors.warning}
                style={styles.instructionIcon}
              />
              <ThemedText style={styles.instructionText}>Don't know</ThemedText>
            </View>
            <View style={[styles.instructionSide, { backgroundColor: colors.successOverlay }]}>
              <ThemedText style={styles.instructionText}>Know it</ThemedText>
              <MaterialCommunityIcons
                name="gesture-swipe-right"
                size={24}
                color={colors.success}
                style={styles.instructionIcon}
              />
            </View>
          </View>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]}>
            <View
              style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.tint }]}
            />
          </View>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Swipe direction feedback overlay */}
        {swipeDirection.dx !== 0 && (
          <View style={[styles.swipeFeedback, getSwipeColors(swipeDirection.dx, colors)]} />
        )}

        <Animated.View
          style={[
            styles.contentContainer,
            {
              transform: [{ translateX: position.x }],
              opacity: fadeAnim,
            },
          ]}
          {...panResponderRef.panHandlers}
        >
          <View style={styles.wordContainer}>
            <ThemedText style={[styles.sentence, { color: colors.arabicText }]} skipDefaultColor>
              {parts[0]}
              <ThemedText
                style={[styles.highlightedWord, { color: colors.highlightedArabicText }]}
                skipDefaultColor
              >
                {wordForm}
              </ThemedText>
              {parts[1]}
            </ThemedText>
          </View>
        </Animated.View>

        <View style={styles.instructions}>
          <View style={[styles.instructionSide, { backgroundColor: colors.warningOverlay }]}>
            <MaterialCommunityIcons
              name="gesture-swipe-left"
              size={24}
              color={colors.warning}
              style={styles.instructionIcon}
            />
            <ThemedText style={styles.instructionText}>Don't know</ThemedText>
          </View>
          <View style={[styles.instructionSide, { backgroundColor: colors.successOverlay }]}>
            <ThemedText style={styles.instructionText}>Know it</ThemedText>
            <MaterialCommunityIcons
              name="gesture-swipe-right"
              size={24}
              color={colors.success}
              style={styles.instructionIcon}
            />
          </View>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 16,
    height: 40,
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  wordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 32, // Add some bottom margin for better spacing
  },
  sentence: {
    fontSize: 32,
    fontFamily: 'NotoNaskhArabic',
    textAlign: 'center',
    lineHeight: 48,
  },
  highlightedWord: {
    fontSize: 32,
    fontFamily: 'NotoNaskhArabic',
    fontWeight: '700',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    width: '0%',
  },
  instructions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 48,
    opacity: 0.6, // Reduce opacity for more subtle appearance
  },
  instructionSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10, // Slightly increase padding
    paddingHorizontal: 20, // Slightly increase padding
    borderRadius: 24, // Increase border radius for softer look
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.9, // Slightly reduce text opacity
  },
  instructionIcon: {
    opacity: 0.8, // Reduce icon opacity
  },
  message: {
    fontSize: 24,
    textAlign: 'center',
  },
  submessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.7,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  swipeFeedback: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  warningOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  successOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
