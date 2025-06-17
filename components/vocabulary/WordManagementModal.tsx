import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import {
  STRUGGLING_DIFFICULTY_THRESHOLD,
  STRUGGLING_LAPSES_THRESHOLD,
  STRICT_MASTERED_STABILITY_THRESHOLD,
  MASTERED_DIFFICULTY_MAX,
} from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseModalProps } from '@/types/ui/modal.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

interface WordManagementAction {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  destructive?: boolean;
}

interface WordManagementModalProps extends BaseModalProps {
  word: StudyWord | null;
  onRemoveFromStudy: (word: StudyWord) => void;
  onResetProgress: (word: StudyWord) => void;
  onSkipForToday: (word: StudyWord) => void;
  onMarkAsEasy: (word: StudyWord) => void;
  onMarkAsHard: (word: StudyWord) => void;
}

const WordManagementModal = memo(
  ({
    visible,
    onClose,
    word,
    onRemoveFromStudy,
    onResetProgress,
    onSkipForToday,
    onMarkAsEasy,
    onMarkAsHard,
  }: WordManagementModalProps) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Generate actions and calculate dynamic height
    const actions = useMemo(() => {
      if (!word) return [];
      return getActionsForWord(word, colors);
    }, [word, colors]);

    // Configure snap points based on content (removed word header height)
    const snapPoints = useMemo(() => {
      // Base height: header (60px) + actions (70px each) + padding (60px)
      const dynamicHeight = 120 + actions.length * 70;
      return [Math.min(dynamicHeight, 400)];
    }, [actions.length]);

    // Handle visibility changes
    useEffect(() => {
      if (visible) {
        bottomSheetRef.current?.expand();
      } else {
        bottomSheetRef.current?.close();
      }
    }, [visible]);

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

        // Close the modal after any action is performed
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

    const actionHandlers = useMemo(() => {
      const handlers: Record<string, () => void> = {};
      actions.forEach(action => {
        handlers[action.id] = () => handleActionPress(action);
      });
      return handlers;
    }, [actions, handleActionPress]);

    // Use built-in backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          onPress={onClose}
        />
      ),
      [onClose]
    );

    // Memoize dynamic styles to prevent recalculation
    const dynamicStyles = useMemo(
      () => ({
        background: [styles.background, { backgroundColor: colors.elevation1 }],
        indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
        actionCard: { backgroundColor: colors.elevation2 },
        destructiveBorder: {
          borderColor: colors.error,
          borderWidth: StyleSheet.hairlineWidth,
        },
      }),
      [colors.card, colors.modalIndicator, colors.elevation2, colors.error]
    );

    // Don't render if not visible or no word
    if (!visible || !word) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableOverDrag={false}
        enableDynamicSizing={false}
        animateOnMount={true}
        activeOffsetY={[-10, 10]}
        onClose={onClose}
        backgroundStyle={dynamicStyles.background}
        handleIndicatorStyle={dynamicStyles.indicator}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="heading3">{STRINGS.WORD_OPTIONS}</ThemedText>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {actions.map(action => (
              <TouchableOpacity
                key={action.id}
                testID={`word-action-${action.id}`}
                style={[
                  styles.actionCard,
                  dynamicStyles.actionCard,
                  action.destructive && dynamicStyles.destructiveBorder,
                ]}
                onPress={actionHandlers[action.id]}
              >
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: action.destructive
                        ? colors.error + '14' // 8% opacity
                        : colors.tintBackground,
                    },
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
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

// Helper function to generate actions (moved outside component for better performance)
function getActionsForWord(word: StudyWord, colors: ThemeColors): WordManagementAction[] {
  const difficulty = word.fsrs_difficulty ?? 6.5;
  const stability = word.fsrs_stability ?? 0;
  const lapses = word.fsrs_lapses ?? 0;
  const isStruggling =
    difficulty >= STRUGGLING_DIFFICULTY_THRESHOLD &&
    lapses >= STRUGGLING_LAPSES_THRESHOLD;
  const isMastered =
    stability >= STRICT_MASTERED_STABILITY_THRESHOLD &&
    difficulty <= MASTERED_DIFFICULTY_MAX;

  const baseActions: WordManagementAction[] = [
    {
      id: 'skip',
      label: STRINGS.SKIP_TODAY,
      description: STRINGS.HIDE_FROM_CURRENT_SESSION,
      icon: 'play-forward-outline',
      color: colors.tint,
    },
    {
      id: 'reset',
      label: STRINGS.RESET_PROGRESS,
      description: STRINGS.START_OVER_WITH_THIS_WORD,
      icon: 'refresh-outline',
      color: colors.warning,
    },
    {
      id: 'remove',
      label: STRINGS.STOP_STUDYING,
      description: STRINGS.REMOVE_FROM_VOCABULARY_LIST,
      icon: 'trash-outline',
      color: colors.error,
      destructive: true,
    },
  ];

  // Add context-specific actions
  if (isStruggling) {
    baseActions.unshift({
      id: 'easy',
      label: STRINGS.MAKE_EASIER,
      description: STRINGS.REDUCE_DIFFICULTY_LEVEL,
      icon: 'trending-down-outline',
      color: colors.success,
    });
  } else if (isMastered) {
    baseActions.unshift({
      id: 'hard',
      label: STRINGS.NEEDS_PRACTICE,
      description: STRINGS.SHOW_MORE_OFTEN,
      icon: 'trending-up-outline',
      color: colors.warning,
    });
  } else {
    // For learning words, offer both options
    baseActions.unshift(
      {
        id: 'easy',
        label: STRINGS.MARK_EASY,
        description: STRINGS.SHOW_LESS_OFTEN,
        icon: 'trending-down-outline',
        color: colors.success,
      },
      {
        id: 'hard',
        label: STRINGS.MARK_HARD,
        description: STRINGS.SHOW_MORE_OFTEN,
        icon: 'trending-up-outline',
        color: colors.warning,
      }
    );
  }

  return baseActions;
}

WordManagementModal.displayName = 'WordManagementModal';

const styles = StyleSheet.create({
  background: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    width: 36,
    height: 4,
  },
  content: {
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  header: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
