import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Animated, PanResponder, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;
const SWIPE_OUT_DURATION = 250;

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

  // Fetch due words
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
        .filter(
          word =>
            word.sentence_word && new Date(word.next_review_at) <= now && word.interval_days < 30
        )
        .sort(
          (a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
        );

      return filtered;
    },
    enabled: !!user,
    // Prevent automatic background updates during animations
    staleTime: 5000,
    gcTime: 10000,
    refetchOnWindowFocus: false,
  });

  // Update wordsRef when dueWords changes
  useEffect(() => {
    if (dueWords && Array.isArray(dueWords)) {
      wordsRef.current = dueWords;
      setCurrentIndex(0);
    }
  }, [dueWords]);

  // Keep track of the current animation state
  const animationState = useRef({
    isAnimating: false,
    currentWord: null as any,
    direction: null as 'left' | 'right' | null,
  }).current;

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
        throw error; // Re-throw to trigger onError
      }
    },
    onSuccess: () => {},
    onSettled: () => {
      setIsUpdating(false);
    },
    onError: () => {
      // Reset animation state on error
      setIsAnimating(false);
      position.setValue({ x: 0, y: 0 });
    },
  });

  const forceSwipe = (direction: 'left' | 'right') => {
    const currentWords = wordsRef.current;

    // Ensure we have valid data before proceeding
    if (!currentWords || !Array.isArray(currentWords) || currentWords.length === 0) {
      resetPosition();
      return;
    }

    if (isLoading || isFetching || isUpdating || animationState.isAnimating) {
      resetPosition();
      return;
    }

    // Validate we have words and current index is valid
    if (currentIndex >= currentWords.length) {
      resetPosition();
      return;
    }

    const wordToUpdate = currentWords[currentIndex];

    // Validate the word data structure

    // Validate the word data structure
    if (!wordToUpdate?.sentence_word?.id) {
      resetPosition();
      return;
    }

    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

    // Set animation state first
    animationState.isAnimating = true;
    animationState.currentWord = wordToUpdate;
    animationState.direction = direction;
    setIsAnimating(true);

    // First animate the card out
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(async ({ finished }) => {
      if (!finished) {
        resetPosition();
        return;
      }

      try {
        // Update the word in the database
        await updateWordMutation.mutateAsync({
          wordId: wordToUpdate.sentence_word_id,
          success: direction === 'right',
          wordToUpdate: wordToUpdate,
        });

        // After successful update, prepare for the next card
        const nextIndex = currentIndex + 1;

        // Reset position without animation for the next card
        position.setValue({ x: 0, y: 0 });

        // Update the index after position is reset
        setCurrentIndex(nextIndex);

        // Reset all animation states
        animationState.isAnimating = false;
        animationState.currentWord = null;
        animationState.direction = null;
        setIsAnimating(false);

        // Invalidate queries after everything is complete
        await queryClient.invalidateQueries({ queryKey: ['studyWords', user?.id] });
        await queryClient.invalidateQueries({ queryKey: ['dueWords', user?.id] });
      } catch {
        resetPosition();
      }
    });
  };

  const resetPosition = () => {
    // Cancel any ongoing animation
    position.stopAnimation();

    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      tension: 40,
      friction: 5,
    }).start(() => {
      animationState.isAnimating = false;
      animationState.currentWord = null;
      animationState.direction = null;
      setIsAnimating(false);
    });
  };

  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating,
      onMoveShouldSetPanResponder: () => !isAnimating,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        // Simply start from current position
        position.setOffset({ x: 0, y: 0 });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, { dx }) => {
        if (isLoading || isFetching || isUpdating || animationState.isAnimating) {
          return;
        }
        position.setValue({ x: dx, y: 0 });
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        position.flattenOffset();

        if (isLoading || isFetching || isUpdating || animationState.isAnimating) {
          return;
        }

        const isRightSwipe = dx > SWIPE_THRESHOLD || (dx > 0 && vx > 0.3);
        const isLeftSwipe = dx < -SWIPE_THRESHOLD || (dx < 0 && vx < -0.3);

        if (isRightSwipe) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          forceSwipe('right');
        } else if (isLeftSwipe) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const handleClose = () => {
    router.back();
  };

  // Show loading state during any data operations
  if (!user || isLoading || isFetching) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  // Show error state
  if (isError) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Error loading words: {error?.message}</ThemedText>
      </ThemedView>
    );
  }

  // Ensure we have valid data
  if (!dueWords || !Array.isArray(dueWords) || dueWords.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>No words due for review.</ThemedText>
      </ThemedView>
    );
  }

  if (currentIndex >= dueWords.length) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Review complete!</ThemedText>
        <ThemedText style={styles.submessage}>
          You've reviewed all {dueWords.length} words.
        </ThemedText>
      </ThemedView>
    );
  }

  const currentWord = dueWords[currentIndex];
  if (!currentWord?.sentence_word) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Error loading word data.</ThemedText>
      </ThemedView>
    );
  }

  const word = currentWord.sentence_word;
  const progress = ((currentIndex + 1) / dueWords.length) * 100;

  // Get the sentence and word form with proper error handling
  const wordForm = word.word_form;
  const sentence = word.sentence?.arabic;

  // If we don't have a sentence, show just the word
  if (!sentence) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>

          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
                transform: [
                  {
                    translateX: position.x,
                  },
                  {
                    rotate: position.x.interpolate({
                      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
                      outputRange: ['-20deg', '0deg', '20deg'],
                    }),
                  },
                ],
              },
            ]}
            {...panResponderRef.panHandlers}
          >
            <View style={styles.sentenceContainer}>
              <ThemedText
                style={[styles.highlightedWord, { color: colors.arabicText }]}
                skipDefaultColor
              >
                {wordForm}
              </ThemedText>
            </View>
          </Animated.View>

          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]}>
            <View
              style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.tint }]}
            />
          </View>

          {/* Progress text */}
          <ThemedText style={styles.progressText}>
            {currentIndex + 1} of {dueWords.length}
          </ThemedText>

          {/* Swipe instructions */}
          <View style={styles.instructions}>
            <View style={styles.instruction}>
              <Ionicons name="arrow-back" size={24} color={colors.warning} />
              <ThemedText style={styles.instructionText}>Swipe left if you don't know</ThemedText>
            </View>
            <View style={styles.instruction}>
              <ThemedText style={styles.instructionText}>Swipe right if you know</ThemedText>
              <Ionicons name="arrow-forward" size={24} color={colors.success} />
            </View>
          </View>
        </ThemedView>
      </>
    );
  }

  // Split the sentence only if we have both sentence and wordForm
  const parts = sentence.split(wordForm);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        {/* Close button */}
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
              transform: [
                {
                  translateX: position.x,
                },
                {
                  rotate: position.x.interpolate({
                    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
                    outputRange: ['-20deg', '0deg', '20deg'],
                  }),
                },
              ],
            },
          ]}
          {...panResponderRef.panHandlers}
        >
          <View style={styles.sentenceContainer}>
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

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]}>
          <View
            style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.tint }]}
          />
        </View>

        {/* Progress text */}
        <ThemedText style={styles.progressText}>
          {currentIndex + 1} of {dueWords.length}
        </ThemedText>

        {/* Swipe instructions */}
        <View style={styles.instructions}>
          <View style={styles.instruction}>
            <Ionicons name="arrow-back" size={24} color={colors.warning} />
            <ThemedText style={styles.instructionText}>Swipe left if you don't know</ThemedText>
          </View>
          <View style={styles.instruction}>
            <ThemedText style={styles.instructionText}>Swipe right if you know</ThemedText>
            <Ionicons name="arrow-forward" size={24} color={colors.success} />
          </View>
        </View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  sentenceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
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
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  instructions: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  instructionText: {
    fontSize: 16,
  },
  message: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: 24,
  },
  submessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.7,
  },
});
