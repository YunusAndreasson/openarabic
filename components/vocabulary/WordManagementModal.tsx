import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
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
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Generate actions and calculate dynamic height
    const actions = useMemo(() => {
      if (!word) return [];
      return getActionsForWord(word, colors);
    }, [word, colors]);

    // Configure snap points based on content
    const snapPoints = useMemo(() => {
      // Base height: header (100px) + word info (80px) + actions (70px each) + padding (60px)
      const dynamicHeight = 240 + actions.length * 70;
      return [Math.min(dynamicHeight, 500)];
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

    // Memoize backdrop component to prevent re-renders
    const backdropComponent = useCallback(
      (props: any) => (
        <View
          style={[props.style, [styles.backdrop, { backgroundColor: colors.backdropOverlay }]]}
          onTouchStart={onClose}
          pointerEvents="auto"
        />
      ),
      [colors.backdropOverlay, onClose]
    );

    // Memoize dynamic styles to prevent recalculation
    const dynamicStyles = useMemo(
      () => ({
        background: [styles.background, { backgroundColor: colors.card }],
        indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
        wordHeader: [styles.wordHeader, { borderBottomColor: colors.border }],
        actionCard: { backgroundColor: colors.elevation1 },
        destructiveBorder: {
          borderColor: colors.error,
          borderWidth: StyleSheet.hairlineWidth,
        },
      }),
      [colors.card, colors.modalIndicator, colors.border, colors.elevation1, colors.error]
    );

    // Don't render if not visible or no word
    if (!visible || !word) return null;

    const wordText = word.root?.letters || 'Unknown word';
    const wordMeaning = word.root?.meaning || 'No translation';

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
        backdropComponent={backdropComponent}
      >
        <BottomSheetView style={styles.content}>
          {/* Word Header */}
          <View style={dynamicStyles.wordHeader}>
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
                testID={`word-action-${action.id}`}
                style={[
                  styles.actionCard,
                  dynamicStyles.actionCard,
                  action.destructive && dynamicStyles.destructiveBorder,
                ]}
                onPress={() => handleActionPress(action)}
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
function getActionsForWord(
  word: StudyWord,
  colors: ThemeColors
): WordManagementAction[] {
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
}

WordManagementModal.displayName = 'WordManagementModal';

const styles = StyleSheet.create({
  background: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  backdrop: {
    // backgroundColor handled dynamically via colors.backdropOverlay
  },
  indicator: {
    width: 36,
    height: 4,
  },
  content: {
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  wordHeader: {
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
