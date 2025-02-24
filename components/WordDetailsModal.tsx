import React from 'react';
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

export function WordDetailsModal({ visible, onClose, word, onStudyPress }: WordDetailsModalProps) {
  const colors = useColors();

  const handleStudyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStudyPress?.();
  };

  const handleBackdropPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <Pressable
        style={[styles.modalContainer, { backgroundColor: colors.overlay }]}
        onPress={handleBackdropPress}
      >
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.cardBackground,
              shadowColor: colors.shadow,
              borderColor: colors.cardBorder,
            },
          ]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.header}>
            <ThemedText style={[styles.arabicWord, { color: colors.arabicText }]} skipDefaultColor>
              {word.arabic}
            </ThemedText>
            <ThemedText style={[styles.translation, { color: colors.titleText }]} skipDefaultColor>
              {word.translation}
            </ThemedText>
          </View>

          <View style={styles.detailsContainer}>
            {word.root && (
              <View style={styles.detailRow}>
                <ThemedText style={[styles.label, { color: colors.titleText }]} skipDefaultColor>
                  Root
                </ThemedText>
                <View style={[styles.pill, { backgroundColor: colors.textOverlay }]}>
                  <ThemedText
                    style={[styles.rootText, { color: colors.arabicText }]}
                    skipDefaultColor
                  >
                    {word.root}
                  </ThemedText>
                  {word.rootMeaning && (
                    <ThemedText
                      style={[styles.rootMeaning, { color: colors.titleText }]}
                      skipDefaultColor
                    >
                      {word.rootMeaning}
                    </ThemedText>
                  )}
                </View>
              </View>
            )}

            {word.type && (
              <View style={styles.detailRow}>
                <ThemedText style={[styles.label, { color: colors.titleText }]} skipDefaultColor>
                  Type
                </ThemedText>
                <View style={[styles.pill, { backgroundColor: colors.textOverlay }]}>
                  <ThemedText
                    style={[styles.typeText, { color: colors.titleText }]}
                    skipDefaultColor
                  >
                    {word.type}
                  </ThemedText>
                </View>
              </View>
            )}

            {word.grammarNotes && word.grammarNotes.length > 0 && (
              <View style={styles.grammarNote}>
                <ThemedText style={[styles.label, { color: colors.titleText }]} skipDefaultColor>
                  Grammar Notes
                </ThemedText>
                {word.grammarNotes.map((note, index) => (
                  <View
                    key={index}
                    style={[styles.notePill, { backgroundColor: colors.textOverlay }]}
                  >
                    <ThemedText
                      style={[styles.noteText, { color: colors.titleText }]}
                      skipDefaultColor
                    >
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
