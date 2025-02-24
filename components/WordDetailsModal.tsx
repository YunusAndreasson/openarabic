import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LAYOUT } from '@/constants/layout';

interface WordDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  word: {
    arabic: string;
    translation: string;
    root?: string;
    rootMeaning?: string;
    type?: string;
    grammarNotes?: string[];
  };
  onStudyPress?: () => void;
}

function WordDetailsModalComponent({
  visible,
  onClose,
  word,
  onStudyPress,
}: WordDetailsModalProps) {
  const colors = useColors();

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
    () => [styles.modalContainer, { backgroundColor: colors.overlay }],
    [colors.overlay]
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
    () => [styles.arabicWord, { color: colors.arabicText }],
    [colors.arabicText]
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

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <Pressable style={containerStyle} onPress={handleBackdropPress}>
        <Pressable style={contentStyle} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <ThemedText style={arabicWordStyle} skipDefaultColor>
              {word.arabic}
            </ThemedText>
            <ThemedText style={translationStyle} skipDefaultColor>
              {word.translation}
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
                    {word.root}
                  </ThemedText>
                  {word.rootMeaning && (
                    <ThemedText style={rootMeaningStyle} skipDefaultColor>
                      {word.rootMeaning}
                    </ThemedText>
                  )}
                </View>
              </View>
            )}

            {word.type && (
              <View style={styles.detailRow}>
                <ThemedText style={labelStyle} skipDefaultColor>
                  Type
                </ThemedText>
                <View style={pillStyle}>
                  <ThemedText style={typeTextStyle} skipDefaultColor>
                    {word.type}
                  </ThemedText>
                </View>
              </View>
            )}

            {word.grammarNotes && word.grammarNotes.length > 0 && (
              <View style={styles.grammarNote}>
                <ThemedText style={labelStyle} skipDefaultColor>
                  Grammar Notes
                </ThemedText>
                {word.grammarNotes.map((note, index) => (
                  <View key={index} style={pillStyle}>
                    <ThemedText style={noteTextStyle} skipDefaultColor>
                      {note}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {onStudyPress && (
            <TouchableOpacity
              style={[
                styles.studyButton,
                {
                  backgroundColor: colors.textOverlay,
                  borderColor: colors.borderOverlay,
                },
              ]}
              onPress={handleStudyPress}
            >
              <Ionicons name="school" size={20} color={colors.titleText} style={styles.studyIcon} />
              <ThemedText
                style={[styles.studyButtonText, { color: colors.titleText }]}
                skipDefaultColor
              >
                Study this word
              </ThemedText>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
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
    paddingVertical: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    padding: LAYOUT.CARD.PADDING.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    ...LAYOUT.SHADOW.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.MODAL,
  },
  header: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  arabicWord: {
    fontFamily: 'NotoNaskhArabic',
    marginBottom: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
  },
  translation: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
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
    opacity: 0.9,
  },
  typeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    fontWeight: '500',
  },
  grammarNote: {
    gap: LAYOUT.SPACING.TINY,
  },
  notePill: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    padding: LAYOUT.SPACING.MEDIUM,
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  studyIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  studyButtonText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
  },
});
