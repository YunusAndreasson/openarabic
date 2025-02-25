import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Animated, PanResponder, Pressable, Modal, Easing } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { router, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SCREEN_WIDTH, LAYOUT } from '@/constants/layout';

// Constants for animation and interaction
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = LAYOUT.ANIMATION.DURATION.FAST;
const FADE_DURATION = LAYOUT.ANIMATION.DURATION.FAST * 0.75;
const DEBOUNCE_DELAY = LAYOUT.ANIMATION.DURATION.NORMAL;

// Add color feedback for swipe directions - make more subtle
const getSwipeColors = (dx: number, colors: any) => {
  const swipeProgress = Math.abs(dx) / SWIPE_THRESHOLD;
  const opacity = Math.min(swipeProgress * 0.2, 0.2); // Reduced opacity for more subtle feedback

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
  const [showInstructions, setShowInstructions] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const revealAnim = useRef(new Animated.Value(0)).current;

  // Keep a stable reference to the current words
  const wordsRef = useRef<any[]>([]);

  // Enhanced animation state tracking
  const animationState = useRef({
    isAnimating: false,
    isMutating: false,
    lastSwipeTime: 0,
    currentWord: null as any,
    direction: null as 'left' | 'right' | null,
    animationPromise: null as Promise<void> | null,
  }).current;

  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Add a subtle pulse animation for the tap instruction
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isAnswerRevealed) {
      // Create a subtle pulsing effect for the tap instruction
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    } else {
      // Stop the animation when answer is revealed
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }

    return () => {
      pulseAnim.stopAnimation();
    };
  }, [isAnswerRevealed, pulseAnim]);

  // Add cleanup for animations when component unmounts
  useEffect(() => {
    return () => {
      // Stop any ongoing animations on unmount
      position.stopAnimation();
      fadeAnim.stopAnimation();
      revealAnim.stopAnimation();
      // Clean up any pending state
      animationState.isAnimating = false;
      animationState.isMutating = false;
      animationState.animationPromise = null;
    };
  }, [position, fadeAnim, revealAnim, animationState]);

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
        ? Math.max(1.3, wordToUpdate.ease_factor + 0.1)
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

  const throttledMove = throttle((dx: number) => {
    if (isInteractionDisabled()) return;

    // Increase resistance for more subtle movement
    const resistance = 0.65;
    const adjustedDx = dx * resistance;
    position.setValue({ x: adjustedDx, y: 0 });

    setSwipeDirection({ dx: adjustedDx, opacity: Math.abs(adjustedDx) / SCREEN_WIDTH });

    // Adjust fade values for a more subtle effect
    const maxDragDistance = SCREEN_WIDTH * 0.4;
    const fadeValue = Math.max(0.8, 1 - Math.abs(dx) / maxDragDistance);
    fadeAnim.setValue(fadeValue);
  }, 16);

  const handlePanResponderMove = useCallback(throttledMove, [throttledMove]);

  const handleRevealAnswer = () => {
    if (isAnswerRevealed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsAnswerRevealed(true);

    Animated.timing(revealAnim, {
      toValue: 1,
      duration: LAYOUT.ANIMATION.DURATION.NORMAL,
      useNativeDriver: true,
    }).start();
  };

  const resetRevealState = () => {
    setIsAnswerRevealed(false);
    revealAnim.setValue(0);
  };

  // Create a wrapper for forceSwipe that also resets the reveal state
  const handleSwipe = async (direction: 'left' | 'right') => {
    await forceSwipe(direction);
    resetRevealState();
  };

  // Update the panResponder to remove the swipe-down gesture
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isInteractionDisabled(),
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        // Increase threshold for initiating swipe to prevent accidental swipes
        return !isInteractionDisabled() && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
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

        // Adjust swipe threshold for a more intentional swipe
        const isRightSwipe = dx > SWIPE_THRESHOLD || (dx > 0 && vx > 0.4);
        const isLeftSwipe = dx < -SWIPE_THRESHOLD || (dx < 0 && vx < -0.4);

        if (isRightSwipe) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await handleSwipe('right');
        } else if (isLeftSwipe) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          await handleSwipe('left');
        } else {
          await resetPosition();
        }
      },
    })
  ).current;

  const handleClose = () => {
    router.back();
  };

  const handleInfoPress = () => {
    setShowInstructions(true);
  };

  const handleCloseInstructions = () => {
    setShowInstructions(false);
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

  // Calculate translation and opacity for the answer reveal animation
  const translateY = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const answerOpacity = revealAnim;

  // Show loading state during any data operations
  if (!user || isLoading || isFetching) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <View style={[styles.progressBar, { backgroundColor: colors.cardBackground }]} />
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
          </View>

          {/* Swipe direction feedback overlay */}
          {swipeDirection.dx !== 0 && (
            <View style={[styles.swipeFeedback, getSwipeColors(swipeDirection.dx, colors)]} />
          )}

          <Pressable
            onPress={handleRevealAnswer}
            style={styles.fullScreenTapArea}
            disabled={isInteractionDisabled()}
          >
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
                  style={[styles.sentence, { color: colors.authorText, opacity: 0.5 }]}
                  skipDefaultColor
                >
                  {parts[0]}
                  <ThemedText
                    style={[styles.highlightedWord, { color: colors.white }]}
                    skipDefaultColor
                  >
                    {wordForm}
                  </ThemedText>
                  {parts[1]}
                </ThemedText>

                <Animated.View
                  style={[
                    styles.answerContainer,
                    {
                      opacity: answerOpacity,
                      transform: [{ translateY }],
                    },
                  ]}
                >
                  {isAnswerRevealed && (
                    <>
                      <ThemedText style={styles.answerLabel}>Meaning</ThemedText>
                      <ThemedText style={styles.answerText}>
                        {currentWord?.sentence_word?.english || 'Translation not available'}
                      </ThemedText>
                      <View style={styles.swipeInstructionContainer}>
                        <View style={styles.swipeInstructionItem}>
                          <MaterialCommunityIcons
                            name="gesture-swipe-left"
                            size={20}
                            color={colors.warning}
                          />
                          <ThemedText
                            style={[styles.swipeInstructionText, { color: colors.warning }]}
                            skipDefaultColor
                          >
                            Didn't know
                          </ThemedText>
                        </View>
                        <View style={styles.swipeInstructionItem}>
                          <ThemedText
                            style={[styles.swipeInstructionText, { color: colors.success }]}
                            skipDefaultColor
                          >
                            Knew it
                          </ThemedText>
                          <MaterialCommunityIcons
                            name="gesture-swipe-right"
                            size={20}
                            color={colors.success}
                          />
                        </View>
                      </View>
                    </>
                  )}
                  {!isAnswerRevealed && (
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        transform: [{ scale: pulseAnim }],
                      }}
                    >
                      <ThemedText
                        style={[styles.tapToRevealText, { backgroundColor: `${colors.tint}15` }]}
                      >
                        Tap to reveal
                      </ThemedText>
                    </Animated.View>
                  )}
                </Animated.View>
              </View>
            </Animated.View>
          </Pressable>

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.elevation1,
                  opacity: pressed ? 0.7 : LAYOUT.OPACITY.DIMMED,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name="close-outline"
                size={26}
                color={colors.tabIconDefault}
                style={{ marginTop: 1 }}
              />
            </Pressable>
            <Pressable
              onPress={handleInfoPress}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.elevation1,
                  opacity: pressed ? 0.7 : LAYOUT.OPACITY.DIMMED,
                },
              ]}
              hitSlop={8}
            >
              <Ionicons
                name="information-circle-outline"
                size={26}
                color={colors.tabIconDefault}
                style={{ marginTop: 1 }}
              />
            </Pressable>
          </View>

          {/* Instructions Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={showInstructions}
            onRequestClose={handleCloseInstructions}
          >
            <Pressable style={styles.modalOverlay} onPress={handleCloseInstructions}>
              <View style={[styles.modalContent, { backgroundColor: colors.elevation2 }]}>
                <ThemedText style={styles.modalTitle}>How to Review</ThemedText>

                <View style={styles.instructionRow}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.cardBackground }]}>
                    <Ionicons name="hand-left-outline" size={24} color={colors.text} />
                  </View>
                  <ThemedText style={styles.modalText}>Tap to reveal meaning</ThemedText>
                </View>

                <View style={styles.instructionRow}>
                  <View style={[styles.iconContainer, { backgroundColor: `${colors.success}20` }]}>
                    <MaterialCommunityIcons
                      name="gesture-swipe-right"
                      size={24}
                      color={colors.success}
                    />
                  </View>
                  <ThemedText style={styles.modalText}>Swipe right if you knew it</ThemedText>
                </View>

                <View style={styles.instructionRow}>
                  <View style={[styles.iconContainer, { backgroundColor: `${colors.warning}20` }]}>
                    <MaterialCommunityIcons
                      name="gesture-swipe-left"
                      size={24}
                      color={colors.warning}
                    />
                  </View>
                  <ThemedText style={styles.modalText}>Swipe left if you didn't know</ThemedText>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.closeModalButton,
                    {
                      backgroundColor: colors.cardBackground,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={handleCloseInstructions}
                >
                  <ThemedText style={styles.closeButtonText}>Got it</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
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
        </View>

        {/* Swipe direction feedback overlay - make more subtle */}
        {swipeDirection.dx !== 0 && (
          <View style={[styles.swipeFeedback, getSwipeColors(swipeDirection.dx, colors)]} />
        )}

        {/* Make the entire screen tappable instead of just the word container */}
        <Pressable
          onPress={handleRevealAnswer}
          style={styles.fullScreenTapArea}
          disabled={isInteractionDisabled()}
        >
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
              <ThemedText style={[styles.sentence, { color: colors.authorText }]} skipDefaultColor>
                {parts[0]}
                <ThemedText
                  style={[styles.highlightedWord, { color: colors.white }]}
                  skipDefaultColor
                >
                  {wordForm}
                </ThemedText>
                {parts[1]}
              </ThemedText>

              <Animated.View
                style={[
                  styles.answerContainer,
                  {
                    opacity: answerOpacity,
                    transform: [{ translateY }],
                  },
                ]}
              >
                {isAnswerRevealed && (
                  <>
                    <ThemedText style={styles.answerLabel}>Meaning</ThemedText>
                    <ThemedText style={styles.answerText}>
                      {currentWord?.sentence_word?.english || 'Translation not available'}
                    </ThemedText>
                    <View style={styles.swipeInstructionContainer}>
                      <View style={styles.swipeInstructionItem}>
                        <MaterialCommunityIcons
                          name="gesture-swipe-left"
                          size={20}
                          color={colors.warning}
                        />
                        <ThemedText
                          style={[styles.swipeInstructionText, { color: colors.warning }]}
                          skipDefaultColor
                        >
                          Didn't know
                        </ThemedText>
                      </View>
                      <View style={styles.swipeInstructionItem}>
                        <ThemedText
                          style={[styles.swipeInstructionText, { color: colors.success }]}
                          skipDefaultColor
                        >
                          Knew it
                        </ThemedText>
                        <MaterialCommunityIcons
                          name="gesture-swipe-right"
                          size={20}
                          color={colors.success}
                        />
                      </View>
                    </View>
                  </>
                )}
                {!isAnswerRevealed && (
                  <Animated.View
                    style={{
                      opacity: pulseAnim,
                      transform: [{ scale: pulseAnim }],
                    }}
                  >
                    <ThemedText
                      style={[styles.tapToRevealText, { backgroundColor: `${colors.tint}15` }]}
                    >
                      Tap to reveal
                    </ThemedText>
                  </Animated.View>
                )}
              </Animated.View>
            </View>
          </Animated.View>
        </Pressable>

        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.elevation1,
                opacity: pressed ? 0.7 : LAYOUT.OPACITY.DIMMED,
              },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="close-outline"
              size={26}
              color={colors.tabIconDefault}
              style={{ marginTop: 1 }}
            />
          </Pressable>
          <Pressable
            onPress={handleInfoPress}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: colors.elevation1,
                opacity: pressed ? 0.7 : LAYOUT.OPACITY.DIMMED,
              },
            ]}
            hitSlop={8}
          >
            <Ionicons
              name="information-circle-outline"
              size={26}
              color={colors.tabIconDefault}
              style={{ marginTop: 1 }}
            />
          </Pressable>
        </View>

        {/* Instructions Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showInstructions}
          onRequestClose={handleCloseInstructions}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCloseInstructions}>
            <View style={[styles.modalContent, { backgroundColor: colors.elevation2 }]}>
              <ThemedText style={styles.modalTitle}>How to Review</ThemedText>

              <View style={styles.instructionRow}>
                <View style={[styles.iconContainer, { backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="hand-left-outline" size={24} color={colors.text} />
                </View>
                <ThemedText style={styles.modalText}>Tap to reveal meaning</ThemedText>
              </View>

              <View style={styles.instructionRow}>
                <View style={[styles.iconContainer, { backgroundColor: `${colors.success}20` }]}>
                  <MaterialCommunityIcons
                    name="gesture-swipe-right"
                    size={24}
                    color={colors.success}
                  />
                </View>
                <ThemedText style={styles.modalText}>Swipe right if you knew it</ThemedText>
              </View>

              <View style={styles.instructionRow}>
                <View style={[styles.iconContainer, { backgroundColor: `${colors.warning}20` }]}>
                  <MaterialCommunityIcons
                    name="gesture-swipe-left"
                    size={24}
                    color={colors.warning}
                  />
                </View>
                <ThemedText style={styles.modalText}>Swipe left if you didn't know</ThemedText>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.closeModalButton,
                  {
                    backgroundColor: colors.cardBackground,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={handleCloseInstructions}
              >
                <ThemedText style={styles.closeButtonText}>Got it</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
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
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    height: 40,
  },
  closeButton: {
    padding: LAYOUT.SPACING.SMALL,
    marginLeft: LAYOUT.SPACING.MEDIUM,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: LAYOUT.OPACITY.DIMMED, // Make close button less prominent
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  wordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.XXLARGE,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    width: '100%',
  },
  sentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontFamily: 'NotoNaskhArabic',
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  highlightedWord: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontFamily: 'NotoNaskhArabic',
    fontWeight: '700',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    opacity: 1, // Keep highlighted word fully visible
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: LAYOUT.BORDER.WIDTH.THIN * 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.BORDER.WIDTH.THIN * 4,
    width: '0%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    padding: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: '100%',
    paddingVertical: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  modalText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    flex: 1,
  },
  closeModalButton: {
    marginTop: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    textAlign: 'center',
  },
  submessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 1,
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  swipeFeedback: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  answerContainer: {
    marginTop: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  answerLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: 0.8,
  },
  answerText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  tapToRevealText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  swipeInstructionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  swipeInstructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  swipeInstructionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
  },
  fullScreenTapArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  closeButtonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '700',
  },
});
