import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { memo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInDown,
  FadeOut,
  SlideOutDown,
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { StudyWord } from '@/types/vocabulary.types';
import { withOpacity } from '@/utils/colorUtils';
import { selectionFeedback } from '@/utils/haptics';

interface WordManagementAction {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  destructive?: boolean;
}

interface WordManagementModalProps {
  visible: boolean;
  word: StudyWord | null;
  onClose: () => void;
  onRemoveFromStudy: (word: StudyWord) => void;
  onResetProgress: (word: StudyWord) => void;
  onSkipForToday: (word: StudyWord) => void;
  onMarkAsEasy: (word: StudyWord) => void;
  onMarkAsHard: (word: StudyWord) => void;
}

const WordManagementModal = memo(
  ({
    visible,
    word,
    onClose,
    onRemoveFromStudy,
    onResetProgress,
    onSkipForToday,
    onMarkAsEasy,
    onMarkAsHard,
  }: WordManagementModalProps) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();

    // Animation values for swipe to dismiss
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(1);

    // Animated close
    const animateClose = useCallback(() => {
      translateY.value = withTiming(400, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, finished => {
        if (finished) {
          runOnJS(onClose)();
        }
      });
    }, [translateY, opacity, onClose]);

    // Animate back to position
    const animateBack = useCallback(() => {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withSpring(1, { damping: 15, stiffness: 150 });
    }, [translateY, opacity]);

    // Gesture handler for swipe to dismiss
    const gestureHandler = Gesture.Pan()
      .onUpdate(event => {
        if (event.translationY <= 0) return;
        translateY.value = event.translationY;
        opacity.value = Math.max(0.3, 1 - event.translationY / 300);
      })
      .onEnd(event => {
        const shouldDismiss = event.translationY > 80 || event.velocityY > 300;
        if (shouldDismiss) {
          runOnJS(animateClose)();
        } else {
          runOnJS(animateBack)();
        }
      });

    // Animated styles
    const animatedModalStyle = useAnimatedStyle(
      () => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
      }),
      [translateY, opacity]
    );

    // Reset animation values when modal becomes visible
    React.useEffect(() => {
      if (visible) {
        translateY.value = 0;
        opacity.value = 1;
      }
    }, [visible, translateY, opacity]);

    // Generate contextual actions based on word state
    const getActions = useCallback(
      (word: StudyWord): WordManagementAction[] => {
        const difficulty = word.fsrs_difficulty ?? 6.5;
        const stability = word.fsrs_stability ?? 0;
        const lapses = word.fsrs_lapses ?? 0;
        const isStruggling = difficulty >= 8.0 && lapses > 0;
        const isMastered = stability >= 21 && difficulty <= 5;

        const baseActions: WordManagementAction[] = [
          {
            id: 'skip',
            label: 'Skip for Today',
            description: "Don't show again in this session",
            icon: 'play-forward-outline',
            color: colors.tint,
          },
          {
            id: 'reset',
            label: 'Reset Progress',
            description: 'Start fresh with this word',
            icon: 'refresh-outline',
            color: colors.warning,
          },
          {
            id: 'remove',
            label: 'Remove from Study',
            description: 'Stop studying this word entirely',
            icon: 'trash-outline',
            color: colors.error,
            destructive: true,
          },
        ];

        // Add context-specific actions
        if (isStruggling) {
          baseActions.unshift({
            id: 'easy',
            label: 'Mark as Easier',
            description: 'Reduce difficulty for this word',
            icon: 'trending-down-outline',
            color: colors.success,
          });
        } else if (isMastered) {
          baseActions.unshift({
            id: 'hard',
            label: 'Needs More Practice',
            description: 'Increase practice frequency',
            icon: 'trending-up-outline',
            color: colors.warning,
          });
        } else {
          // For learning words, offer both options
          baseActions.unshift(
            {
              id: 'easy',
              label: 'Mark as Easy',
              description: 'Reduce practice frequency',
              icon: 'trending-down-outline',
              color: colors.success,
            },
            {
              id: 'hard',
              label: 'Mark as Hard',
              description: 'Increase practice frequency',
              icon: 'trending-up-outline',
              color: colors.warning,
            }
          );
        }

        return baseActions;
      },
      [colors]
    );

    const handleActionPress = useCallback(
      (action: WordManagementAction) => {
        if (!word) return;

        selectionFeedback();

        switch (action.id) {
          case 'remove':
            onRemoveFromStudy(word);
            break;
          case 'reset':
            onResetProgress(word);
            break;
          case 'skip':
            onSkipForToday(word);
            break;
          case 'easy':
            onMarkAsEasy(word);
            break;
          case 'hard':
            onMarkAsHard(word);
            break;
        }

        onClose();
      },
      [
        word,
        onRemoveFromStudy,
        onResetProgress,
        onSkipForToday,
        onMarkAsEasy,
        onMarkAsHard,
        onClose,
      ]
    );

    if (!visible || !word) return null;

    const actions = getActions(word);
    const wordText = word.root?.letters || 'Unknown word';
    const wordMeaning = word.root?.meaning || 'No translation';

    return (
      <Modal
        transparent
        visible={visible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <Animated.View
          style={styles.overlay}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <BlurView
            intensity={20}
            style={StyleSheet.absoluteFill}
            tint={isDarkMode ? 'dark' : 'light'}
          />

          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <GestureDetector gesture={gestureHandler}>
            <Animated.View
              style={[
                styles.modalContainer,
                { backgroundColor: colors.background },
                animatedModalStyle,
              ]}
              entering={SlideInDown.duration(250).damping(15)}
              exiting={SlideOutDown.duration(200)}
            >
              <View style={[styles.closeIndicator, { backgroundColor: colors.modalIndicator }]} />

              {/* Word Header */}
              <View style={styles.wordHeader}>
                <ThemedText style={styles.wordText} type="heading2" weight="bold">
                  {wordText}
                </ThemedText>
                <ThemedText
                  style={styles.wordMeaning}
                  type="body"
                  colorName="secondaryText"
                  weight="medium"
                >
                  {wordMeaning}
                </ThemedText>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                {actions.map(action => (
                  <TouchableOpacity
                    key={action.id}
                    style={[
                      styles.actionCard,
                      { backgroundColor: colors.card },
                      action.destructive && {
                        borderColor: withOpacity(colors.error, 0.2),
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => handleActionPress(action)}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: withOpacity(action.color, 0.08) },
                      ]}
                    >
                      <Ionicons name={action.icon} size={24} color={action.color} />
                    </View>
                    <View style={styles.actionContent}>
                      <ThemedText
                        style={[styles.actionTitle, action.destructive && { color: colors.error }]}
                        type="body"
                        weight="semibold"
                      >
                        {action.label}
                      </ThemedText>
                      <ThemedText
                        colorName="secondaryText"
                        style={styles.actionDescription}
                        type="caption"
                      >
                        {action.description}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </Modal>
    );
  }
);

WordManagementModal.displayName = 'WordManagementModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingBottom: LAYOUT.SPACING.XLARGE,
    maxHeight: '80%',
  },
  closeIndicator: {
    alignSelf: 'center',
    borderRadius: 2,
    height: 4,
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    width: 36,
  },
  wordHeader: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  wordText: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  wordMeaning: {
    textAlign: 'center',
  },
  actionsContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.SMALL,
  },
  actionCard: {
    ...LAYOUT.ELEVATION.SUBTLE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minHeight: 64,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  actionDescription: {
    lineHeight: 16,
  },
});

export default WordManagementModal;
