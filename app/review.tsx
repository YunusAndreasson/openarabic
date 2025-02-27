import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Animated, PanResponder, Pressable } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SCREEN_WIDTH, LAYOUT } from '@/constants/layout';
import { ThemedButton } from '@/components/ThemedButton';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedModal } from '@/components/ThemedModal';
import { Loader, LoadingScreen } from '@/components/Loader';

// Constants
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.15;
const SWIPE_OUT_DURATION = LAYOUT.ANIMATION.DURATION.FAST;
const MEANING_DISPLAY_DURATION = 1600;

// Main Component
export default function ReviewScreen() {
  useEffect(() => {
    router.setParams({ hideHeader: 'true' });
  }, []);

  const colors = useColors();
  const { user } = useAuth();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const mountedRef = useRef(true);
  const position = useRef(new Animated.ValueXY()).current;
  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const meaningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use the spaced repetition hook
  const {
    currentIndex,
    currentWord,
    isLoading,
    isUpdating,
    updateWord,
    progress,
    isComplete,
    invalidateQueries,
    transitionType,
    dueWords,
  } = useSpacedRepetition({
    userId: user?.id,
    onComplete: () => {
      // Additional completion logic if needed
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      position.stopAnimation();
      if (meaningTimeoutRef.current) {
        clearTimeout(meaningTimeoutRef.current);
      }
    };
  }, []);

  const isInteractionDisabled = useCallback(
    () => isLoading || isUpdating || isAnimating || showMeaningOverlay,
    [isLoading, isUpdating, isAnimating, showMeaningOverlay]
  );

  // Handle swipe action
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (isInteractionDisabled()) return;
      if (!currentWord?.sentence_word_id) return;

      setIsAnimating(true);

      if (direction === 'right') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.timing(position, {
          toValue: { x: SCREEN_WIDTH, y: 0 },
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: true,
        }).start(() => {
          position.setValue({ x: -SCREEN_WIDTH, y: 0 });
          updateWord(currentWord.sentence_word_id, true);
          setIsAnimating(false);
        });
      } else if (direction === 'left') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Animated.timing(position, {
          toValue: { x: -SCREEN_WIDTH, y: 0 },
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: true,
        }).start(() => {
          setShowMeaningOverlay(true);
          meaningTimeoutRef.current = setTimeout(() => {
            setShowMeaningOverlay(false);
            position.setValue({ x: -SCREEN_WIDTH, y: 0 });
            updateWord(currentWord.sentence_word_id, false);
            setIsAnimating(false);
          }, MEANING_DISPLAY_DURATION);
        });
      }
    },
    [position, currentWord, isInteractionDisabled, updateWord]
  );

  // Pan responder - memoized to prevent recreation on each render
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          !isInteractionDisabled() && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
        onPanResponderMove: (_, { dx }) => {
          position.setValue({ x: dx, y: 0 });
        },
        onPanResponderRelease: (_, { dx }) => {
          if (dx > SWIPE_THRESHOLD) {
            handleSwipe('right');
          } else if (dx < -SWIPE_THRESHOLD) {
            handleSwipe('left');
          } else {
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }).start(() => {
              if (mountedRef.current) setIsAnimating(false);
            });
          }
        },
      }),
    [isInteractionDisabled, position, handleSwipe, SWIPE_THRESHOLD]
  );

  // UI handlers
  const handleClose = () => router.back();
  const [showInstructions, setShowInstructions] = useState(false);

  // Current word data - memoized to prevent recalculations
  const currentWordData = useCallback(() => {
    const word = currentWord?.sentence_word;
    const wordForm = word?.word_form;
    const sentence = word?.sentence?.arabic;
    const parts = sentence && wordForm ? sentence.split(wordForm) : ['', ''];

    return { word, wordForm, sentence, parts };
  }, [currentWord]);

  const { wordForm, sentence, parts } = currentWordData();

  // Ensure meaning timeout is cleared when component unmounts or when overlay is hidden
  useEffect(() => {
    if (!showMeaningOverlay && meaningTimeoutRef.current) {
      clearTimeout(meaningTimeoutRef.current);
      meaningTimeoutRef.current = null;
    }
  }, [showMeaningOverlay]);

  // Reset animation when current index changes
  useEffect(() => {
    // Stop any ongoing animations first for better performance
    fadeOpacity.stopAnimation();
    position.stopAnimation();

    // Choose animation type based on transitionType
    if (transitionType === 'fade') {
      // For correct answers, fade in place
      fadeOpacity.setValue(0);
      position.setValue({ x: 0, y: 0 });

      // Use timing animation with easing for smooth fade
      Animated.timing(fadeOpacity, {
        toValue: 1,
        duration: 250, // Slightly faster for better UX
        useNativeDriver: true,
      }).start();
    } else {
      // For incorrect answers, slide in from right (default behavior)
      position.setValue({ x: SCREEN_WIDTH, y: 0 });

      // Use spring for natural slide motion
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        tension: 65, // Slightly higher tension for faster animation
        friction: 7, // Keep same friction for bouncy effect
      }).start();
    }
  }, [currentIndex, position, fadeOpacity, transitionType]);

  // Memoize the progress bar style for better performance
  const progressBarStyle = useMemo(
    () => ({
      height: LAYOUT.SPACING.SMALL,
      borderRadius: LAYOUT.SPACING.SMALL / 2,
      marginBottom: LAYOUT.SPACING.LARGE,
      width: '100%' as any, // Type assertion to fix width compatibility issue
      marginTop: isLoading || isComplete || !currentWord ? 0 : LAYOUT.SPACING.XLARGE,
    }),
    [isLoading, isComplete, currentWord]
  );

  if (isLoading || !user) {
    return (
      <ThemedView style={styles.container}>
        <ProgressBar progress={0} style={progressBarStyle} />
        <View style={styles.loadingContainer}>
          <Loader size="large" color={colors.tint} />
        </View>
      </ThemedView>
    );
  }

  if (dueWords.length === 0 && !isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ProgressBar progress={0} style={progressBarStyle} />
        <View style={styles.completedContainer}>
          <ThemedText style={styles.completedText}>No words to review!</ThemedText>
          <ThemedButton title="Go Back" onPress={handleClose} variant="filled" />
        </View>
      </ThemedView>
    );
  }

  if (isComplete) {
    return (
      <ThemedView style={styles.container}>
        <ProgressBar progress={100} style={progressBarStyle} />
        <View style={styles.completedContainer}>
          <ThemedText style={styles.completedText}>Review complete!</ThemedText>
          <ThemedButton
            title="Done"
            onPress={() => {
              invalidateQueries();
              handleClose();
            }}
            variant="filled"
          />
        </View>
      </ThemedView>
    );
  }

  if (!currentWord) {
    return (
      <ThemedView style={styles.container}>
        <ProgressBar progress={0} style={progressBarStyle} />
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Error loading word</ThemedText>
          <ThemedButton
            title="Go Back"
            onPress={handleClose}
            variant="filled"
            style={styles.errorButton}
          />
        </View>
      </ThemedView>
    );
  }

  if (!sentence || !wordForm) {
    return (
      <ThemedView style={styles.container}>
        <ProgressBar progress={0} style={progressBarStyle} />
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Error loading sentence data</ThemedText>
          <ThemedButton
            title="Go Back"
            onPress={handleClose}
            variant="filled"
            style={styles.errorButton}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        <ProgressBar progress={progress} style={progressBarStyle} fillColor={colors.tint} />

        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateX: position.x }] },
            { opacity: fadeOpacity },
          ]}
          {...panResponder.panHandlers}
        >
          <ThemedText style={styles.sentence} skipDefaultColor>
            <ThemedText style={[styles.dimmedText, { color: `${colors.text}70` }]} skipDefaultColor>
              {parts[0]}
            </ThemedText>
            <ThemedText style={[styles.studyWord, { color: colors.tint }]} skipDefaultColor>
              {wordForm}
            </ThemedText>
            <ThemedText style={[styles.dimmedText, { color: `${colors.text}70` }]} skipDefaultColor>
              {parts[1]}
            </ThemedText>
          </ThemedText>
        </Animated.View>

        {showMeaningOverlay && (
          <View
            style={[
              styles.meaningOverlay,
              {
                backgroundColor: `${colors.modalOverlay}80`,
                top: LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.SMALL + LAYOUT.SPACING.LARGE,
                bottom: 100,
              },
            ]}
          >
            <ThemedText style={[styles.meaningText, { color: colors.white }]} skipDefaultColor>
              {currentWord?.sentence_word?.english || 'Translation not available'}
            </ThemedText>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: pressed
                  ? `${colors.cardBackground}80`
                  : `${colors.cardBackground}90`,
                zIndex: LAYOUT.Z_INDEX.OVERLAY + 1,
              },
            ]}
          >
            <Ionicons
              name="close"
              size={LAYOUT.TYPOGRAPHY.SCALE.LARGE}
              color={`${colors.icon}90`}
            />
          </Pressable>
          <Pressable
            onPress={() => setShowInstructions(true)}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: pressed
                  ? `${colors.cardBackground}80`
                  : `${colors.cardBackground}90`,
                zIndex: LAYOUT.Z_INDEX.OVERLAY + 1,
              },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={LAYOUT.TYPOGRAPHY.SCALE.LARGE}
              color={`${colors.icon}90`}
            />
          </Pressable>
        </View>

        <ThemedModal
          visible={showInstructions}
          onClose={() => setShowInstructions(false)}
          title="How to Review"
          useBlur={true}
        >
          <View style={styles.modalInstructionRow}>
            <Ionicons
              name="chevron-forward"
              size={LAYOUT.TYPOGRAPHY.SCALE.LARGE}
              color={colors.success}
            />
            <ThemedText style={styles.modalText}>Swipe right: I know this word</ThemedText>
          </View>
          <View style={styles.modalInstructionRow}>
            <Ionicons
              name="chevron-back"
              size={LAYOUT.TYPOGRAPHY.SCALE.LARGE}
              color={colors.warning}
            />
            <ThemedText style={styles.modalText}>Swipe left: I don't know this word</ThemedText>
          </View>
        </ThemedModal>
      </ThemedView>
    </>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: LAYOUT.SCREEN_EDGE_PADDING,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  sentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.LOOSE * 1.5,
  },
  dimmedText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
    fontFamily: 'NotoNaskhArabic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.LOOSE * 1.5,
  },
  studyWord: {
    fontWeight: 'bold',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.1,
    fontFamily: 'NotoNaskhArabic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.LOOSE * 1.5,
  },
  meaningOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  meaningText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.1,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...LAYOUT.SHADOW.SMALL,
  },
  modalInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: LAYOUT.SPACING.SMALL,
  },
  modalText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: LAYOUT.SPACING.LARGE,
  },
  completedText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  errorButton: {
    minWidth: 120,
  },
});

// Add display name
ReviewScreen.displayName = 'ReviewScreen';
