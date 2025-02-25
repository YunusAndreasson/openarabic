import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Pressable, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LAYOUT } from '@/constants/layout';
import type { Tables } from '@/types/database.types';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

interface WordDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  word: Tables<'sentence_words'> & {
    root: Tables<'roots'> | null;
    word_type: Tables<'word_types'> | null;
  };
  isSelected: boolean;
  onStudyPress?: () => void;
}

function WordDetailsModalComponent({
  visible,
  onClose,
  word,
  isSelected,
  onStudyPress,
}: WordDetailsModalProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Memoize handlers to prevent unnecessary rerenders
  const handleStudyPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStudyPress?.();
  }, [onStudyPress]);

  const handleBackdropPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  // Memoize styles to prevent new object creation on each render
  const containerStyle = useMemo(
    () => [styles.modalContainer, { backgroundColor: colors.modalOverlay }],
    [colors.modalOverlay]
  );

  const contentStyle = useMemo(
    () => [
      styles.modalContent,
      {
        backgroundColor: colors.cardBackground,
        shadowColor: colors.shadow,
        borderColor: colors.cardBorder,
      },
    ],
    [colors.cardBackground, colors.shadow, colors.cardBorder]
  );

  const arabicWordStyle = useMemo(
    () => [
      styles.arabicWord,
      {
        color: isSelected ? (isDarkMode ? '#ced4da' : '#343a40') : colors.arabicText,
        fontWeight: isSelected ? ('700' as const) : ('normal' as const),
      },
    ],
    [colors.arabicText, isSelected, isDarkMode]
  );

  // Add a style for the word container to show a subtle indicator in dark mode
  const wordContainerStyle = useMemo(
    () => ({
      position: 'relative' as const,
      paddingBottom: isSelected ? LAYOUT.SPACING.SMALL : 0,
    }),
    [isSelected]
  );

  // Add a style for the indicator line
  const indicatorStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      bottom: 0,
      left: '30%' as any,
      right: '30%' as any,
      height: 1,
      borderBottomWidth: 0.8,
      borderBottomColor: isDarkMode ? '#ced4da80' : '#34383c50',
      borderStyle: 'dotted' as const,
    }),
    [isDarkMode]
  );

  const translationStyle = useMemo(
    () => [styles.translation, { color: colors.titleText }],
    [colors.titleText]
  );

  const labelStyle = useMemo(() => [styles.label, { color: colors.titleText }], [colors.titleText]);

  const pillStyle = useMemo(
    () => [styles.pill, { backgroundColor: colors.textOverlay }],
    [colors.textOverlay]
  );

  const rootTextStyle = useMemo(
    () => [styles.rootText, { color: colors.arabicText }],
    [colors.arabicText]
  );

  const rootMeaningStyle = useMemo(
    () => [styles.rootMeaning, { color: colors.titleText }],
    [colors.titleText]
  );

  const typeTextStyle = useMemo(
    () => [styles.typeText, { color: colors.titleText }],
    [colors.titleText]
  );

  const noteTextStyle = useMemo(
    () => [styles.noteText, { color: colors.titleText }],
    [colors.titleText]
  );

  const studyButtonStyle = useMemo(
    () => [
      styles.studyButton,
      {
        backgroundColor: isSelected ? (isDarkMode ? '#6c757d' : '#dee2e6') : colors.textOverlay,
        borderColor: colors.borderOverlay,
      },
    ],
    [colors.textOverlay, colors.borderOverlay, isSelected, isDarkMode]
  );

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark">
        <Pressable style={containerStyle} onPress={handleBackdropPress}>
          <Pressable style={contentStyle} onPress={e => e.stopPropagation()}>
            <View style={styles.header}>
              <View style={wordContainerStyle}>
                <ThemedText style={arabicWordStyle} skipDefaultColor>
                  {word.word_form}
                </ThemedText>
                {isSelected && <View style={indicatorStyle} />}
              </View>
              <ThemedText style={translationStyle} skipDefaultColor numberOfLines={2}>
                {word.english}
              </ThemedText>
            </View>

            <View style={styles.detailsContainer}>
              {word.root && (
                <View style={styles.detailRow}>
                  <ThemedText style={labelStyle} skipDefaultColor>
                    Root
                  </ThemedText>
                  <View style={pillStyle}>
                    <ThemedText style={rootTextStyle} skipDefaultColor>
                      {word.root.letters}
                    </ThemedText>
                    {word.root.meaning && (
                      <ThemedText style={rootMeaningStyle} skipDefaultColor>
                        {word.root.meaning}
                      </ThemedText>
                    )}
                  </View>
                </View>
              )}

              {word.word_type && (
                <View style={styles.detailRow}>
                  <ThemedText style={labelStyle} skipDefaultColor>
                    Type
                  </ThemedText>
                  <View style={pillStyle}>
                    <ThemedText style={typeTextStyle} skipDefaultColor>
                      {word.word_type.name}
                    </ThemedText>
                  </View>
                </View>
              )}

              {word.grammar_note && (
                <View style={styles.grammarNote}>
                  <ThemedText style={labelStyle} skipDefaultColor>
                    Grammar Notes
                  </ThemedText>
                  <View style={pillStyle}>
                    <ThemedText style={noteTextStyle} skipDefaultColor>
                      {word.grammar_note}
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {onStudyPress && (
              <TouchableOpacity style={studyButtonStyle} onPress={handleStudyPress}>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'school'}
                  size={20}
                  color={colors.titleText}
                  style={styles.studyIcon}
                />
                <ThemedText
                  style={[styles.studyButtonText, { color: colors.titleText }]}
                  skipDefaultColor
                >
                  {isSelected ? 'Word added to study list' : 'Study this word'}
                </ThemedText>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

// Memoize the component to prevent unnecessary rerenders
export const WordDetailsModal = React.memo(WordDetailsModalComponent);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    paddingTop: LAYOUT.SPACING.XXLARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    ...LAYOUT.SHADOW.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.MODAL,
  },
  header: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XXLARGE,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  arabicWord: {
    fontFamily: 'NotoNaskhArabic',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  translation: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  detailsContainer: {
    gap: LAYOUT.SPACING.LARGE,
  },
  detailRow: {
    gap: LAYOUT.SPACING.TINY,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginBottom: LAYOUT.SPACING.TINY,
    fontWeight: '500',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  pill: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  rootText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontFamily: 'NotoNaskhArabic',
    textAlign: 'center',
  },
  rootMeaning: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginTop: LAYOUT.SPACING.TINY,
    textAlign: 'center',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  typeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    fontWeight: '500',
  },
  grammarNote: {
    gap: LAYOUT.SPACING.TINY,
  },
  noteText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.BUTTON.PADDING.VERTICAL.MEDIUM,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
    marginTop: LAYOUT.SPACING.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
  studyIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  studyButtonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
  },
});
