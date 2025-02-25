import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Animated, PanResponder, Pressable, Modal } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SCREEN_WIDTH, LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

// Types for study words
interface StudyWord {
  sentence_word_id: string;
  sentence_word: {
    word_form: string;
    english: string;
    sentence?: {
      arabic: string;
    };
  };
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  review_count: number;
  lapses: number;
}

// Constants
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = LAYOUT.ANIMATION.DURATION.FAST;
const MEANING_DISPLAY_DURATION = 1600;

// Swipe feedback utility
const getSwipeColors = (dx: number, colors: ReturnType<typeof useColors>) => {
  const swipeProgress = Math.abs(dx) / SWIPE_THRESHOLD;
  const opacity = Math.min(swipeProgress * 0.3, 0.3);
  if (dx > 0) {
    return { backgroundColor: colors.success, opacity };
  } else if (dx < 0) {
    return { backgroundColor: colors.warning, opacity };
  }
  return { backgroundColor: 'transparent', opacity: 0 };
};

// Main Component
export default function ReviewScreen() {
  useEffect(() => {
    router.setParams({ hideHeader: 'true' });
  }, []);

  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMeaningOverlay, setShowMeaningOverlay] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState({ dx: 0, opacity: 0 });
  const mountedRef = useRef(true);
  const position = useRef(new Animated.ValueXY()).current;
  const wordsRef = useRef<StudyWord[]>([]);
  const meaningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch due words
  const { data: dueWords = [], isLoading } = useQuery({
    queryKey: ['dueWords', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required');
      const words = await studyWordsService.getStudyWords(user.id);
      const now = new Date();

      // Directly convert dates to numbers for comparison
      const filteredWords = words.filter(
        word =>
          word.sentence_word &&
          word.next_review_at &&
          new Date(word.next_review_at).getTime() <= now.getTime() &&
          word.interval_days < 30
      );

      // Sort by next review date
      return filteredWords.sort((a, b) => {
        const dateA = new Date(a.next_review_at).getTime();
        const dateB = new Date(b.next_review_at).getTime();
        return dateA - dateB;
      });
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (dueWords && Array.isArray(dueWords)) {
      wordsRef.current = [...dueWords] as StudyWord[];
    }
  }, [dueWords]);

  const isInteractionDisabled = useCallback(
    () => isLoading || isUpdating || isAnimating || showMeaningOverlay,
    [isLoading, isUpdating, isAnimating, showMeaningOverlay]
  );

  // Word update mutation
  const updateWordMutation = useMutation({
    mutationFn: async ({
      wordId,
      success,
      wordToUpdate,
    }: {
      wordId: string;
      success: boolean;
      wordToUpdate: StudyWord;
    }) => {
      setIsUpdating(true);
      const newInterval = success
        ? Math.max(1, Math.round(wordToUpdate.interval_days * wordToUpdate.ease_factor))
        : 1;
      const newEaseFactor = success
        ? Math.max(1.3, wordToUpdate.ease_factor + 0.1)
        : Math.max(1.3, wordToUpdate.ease_factor - 0.2);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + newInterval);

      await studyWordsService.updateWordReview(wordId, {
        interval_days: newInterval,
        ease_factor: newEaseFactor,
        next_review_at: nextReview.toISOString(),
        review_count: wordToUpdate.review_count + 1,
        lapses: success ? wordToUpdate.lapses : wordToUpdate.lapses + 1,
      });
    },
    onSuccess: () => {
      if (mountedRef.current) {
        setCurrentIndex(prev => prev + 1);
        position.setValue({ x: 0, y: 0 });
      }
    },
    onSettled: () => {
      if (mountedRef.current) setIsUpdating(false);
    },
  });

  // Handle swipe action
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (isInteractionDisabled()) return;

      const wordToUpdate = wordsRef.current[currentIndex];
      if (!wordToUpdate?.sentence_word_id) return;

      setIsAnimating(true);

      if (direction === 'right') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.timing(position, {
          toValue: { x: SCREEN_WIDTH, y: 0 },
          duration: SWIPE_OUT_DURATION,
          useNativeDriver: true,
        }).start(() => {
          updateWordMutation.mutate({
            wordId: wordToUpdate.sentence_word_id,
            success: true,
            wordToUpdate,
          });
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
            updateWordMutation.mutate({
              wordId: wordToUpdate.sentence_word_id,
              success: false,
              wordToUpdate,
            });
            setIsAnimating(false);
          }, MEANING_DISPLAY_DURATION);
        });
      }
    },
    [position, currentIndex, isInteractionDisabled, updateWordMutation]
  );

  // Pan responder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !isInteractionDisabled() && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
      onPanResponderMove: (_, { dx }) => {
        position.setValue({ x: dx, y: 0 });
        setSwipeDirection({ dx, opacity: Math.abs(dx) / SCREEN_WIDTH });
      },
      onPanResponderRelease: (_, { dx }) => {
        setSwipeDirection({ dx: 0, opacity: 0 });
        if (dx > SWIPE_THRESHOLD) {
          handleSwipe('right');
        } else if (dx < -SWIPE_THRESHOLD) {
          handleSwipe('left');
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start(() => setIsAnimating(false));
        }
      },
    })
  ).current;

  // UI handlers
  const handleClose = () => router.back();
  const [showInstructions, setShowInstructions] = useState(false);

  // Current word data
  const currentWord = dueWords?.[currentIndex] as StudyWord | undefined;
  const word = currentWord?.sentence_word;
  const wordForm = word?.word_form;
  const sentence = word?.sentence?.arabic;
  const parts = sentence && wordForm ? sentence.split(wordForm) : ['', ''];
  const progress = dueWords.length > 0 ? (currentIndex / dueWords.length) * 100 : 0;

  // Get progress bar background color based on theme
  const progressBarBg = isDarkMode ? colors.elevation1 : `${colors.text}15`;

  if (isLoading || !user) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.progressBar, { backgroundColor: progressBarBg }]}>
          <View style={[styles.progressFill, { width: '0%', backgroundColor: colors.tint }]} />
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (currentIndex >= dueWords.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.progressBar, { backgroundColor: progressBarBg }]}>
          <View style={[styles.progressFill, { width: '100%', backgroundColor: colors.success }]} />
        </View>
        <View style={styles.completedContainer}>
          <ThemedText style={styles.completedText}>Review complete!</ThemedText>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: colors.tint, opacity: pressed ? LAYOUT.OPACITY.PRESSED : 1 },
            ]}
          >
            <ThemedText style={[styles.doneButtonText, { color: colors.white }]} skipDefaultColor>
              Done
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!currentWord || !sentence) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.progressBar, { backgroundColor: progressBarBg }]}>
          <View style={[styles.progressFill, { width: '0%', backgroundColor: colors.tint }]} />
        </View>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.errorText}>Error loading word</ThemedText>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: colors.tint, opacity: pressed ? LAYOUT.OPACITY.PRESSED : 1 },
            ]}
          >
            <ThemedText style={[styles.doneButtonText, { color: colors.white }]} skipDefaultColor>
              Go Back
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ThemedView style={styles.container}>
        {/* Progress bar with increased top margin */}
        <View
          style={[
            styles.progressBar,
            { backgroundColor: progressBarBg, marginTop: LAYOUT.SPACING.XLARGE },
          ]}
        >
          <View
            style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.tint }]}
          />
        </View>

        {swipeDirection.dx !== 0 && (
          <View style={[styles.swipeFeedback, getSwipeColors(swipeDirection.dx, colors)]} />
        )}

        <Animated.View
          style={[styles.card, { transform: [{ translateX: position.x }] }]}
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

        {/* Simplified meaning overlay for displaying the correct answer */}
        {showMeaningOverlay && (
          <View style={[styles.meaningOverlay, { backgroundColor: colors.modalOverlay }]}>
            <ThemedText
              style={{
                fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
                fontWeight: '600',
                textAlign: 'center',
                color: colors.white,
              }}
              skipDefaultColor
            >
              {currentWord?.sentence_word?.english || 'Translation not available'}
            </ThemedText>
          </View>
        )}

        {/* Updated bottom button container with larger icons */}
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleClose}
            disabled={isInteractionDisabled()}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: pressed ? `${colors.cardBackground}80` : colors.cardBackground,
              },
            ]}
          >
            <Ionicons name="close" size={LAYOUT.TYPOGRAPHY.SCALE.LARGE} color={colors.icon} />
          </Pressable>
          <Pressable
            onPress={() => setShowInstructions(true)}
            disabled={isInteractionDisabled()}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: pressed ? `${colors.cardBackground}80` : colors.cardBackground,
              },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={LAYOUT.TYPOGRAPHY.SCALE.LARGE}
              color={colors.icon}
            />
          </Pressable>
        </View>

        <Modal
          visible={showInstructions}
          transparent
          onRequestClose={() => setShowInstructions(false)}
          animationType="fade"
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
            <ThemedView style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>How to Review</ThemedText>
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
              <Pressable
                onPress={() => setShowInstructions(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  { backgroundColor: colors.tint, opacity: pressed ? LAYOUT.OPACITY.PRESSED : 1 },
                ]}
              >
                <ThemedText
                  style={[styles.modalButtonText, { color: colors.white }]}
                  skipDefaultColor
                >
                  Got it
                </ThemedText>
              </Pressable>
            </ThemedView>
          </View>
        </Modal>
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
  progressBar: {
    height: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.SPACING.SMALL / 2,
    marginBottom: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: LAYOUT.SPACING.SMALL / 2,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  sentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.LOOSE * 1.4,
  },
  dimmedText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontFamily: 'NotoNaskhArabic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.LOOSE * 1.4,
  },
  studyWord: {
    fontWeight: 'bold',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE, // Same size as dimmedText
    fontFamily: 'NotoNaskhArabic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.LOOSE * 1.4,
  },
  meaningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
  },
  answerLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  answerText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: '700',
    textAlign: 'center',
  },
  swipeFeedback: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: -1,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: LAYOUT.SPACING.XLARGE,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    ...LAYOUT.SHADOW.MEDIUM,
  },
  modalTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: 'bold',
    marginBottom: LAYOUT.SPACING.LARGE,
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
  modalButton: {
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
  },
  modalButtonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
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
  },
  errorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  doneButton: {
    padding: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  doneButtonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
  },
});
