import React from 'react';
import { StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.contentContainer}>
          <View style={[styles.content, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.header}>
              <ThemedText style={styles.arabicWord}>{word.arabic}</ThemedText>
              <ThemedText style={styles.translation}>{word.translation}</ThemedText>
            </View>

            <View style={styles.detailsContainer}>
              {word.root && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.label}>Root</ThemedText>
                  <View style={[styles.pill, { backgroundColor: colors.text + '10' }]}>
                    <ThemedText style={styles.rootText}>{word.root}</ThemedText>
                    {word.rootMeaning && (
                      <ThemedText style={styles.rootMeaning}>{word.rootMeaning}</ThemedText>
                    )}
                  </View>
                </View>
              )}

              {word.type && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.label}>Type</ThemedText>
                  <View style={[styles.pill, { backgroundColor: colors.text + '10' }]}>
                    <ThemedText style={styles.typeText}>{word.type}</ThemedText>
                  </View>
                </View>
              )}

              {word.grammarNotes && word.grammarNotes.length > 0 && (
                <View style={styles.grammarNote}>
                  <ThemedText style={styles.label}>Grammar Notes</ThemedText>
                  {word.grammarNotes.map((note, index) => (
                    <View
                      key={index}
                      style={[styles.notePill, { backgroundColor: colors.text + '10' }]}
                    >
                      <ThemedText style={styles.noteText}>{note}</ThemedText>
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
                    backgroundColor: colors.text + '10',
                    borderColor: colors.text + '20',
                  },
                ]}
                onPress={handleStudyPress}
              >
                <Ionicons name="school" size={20} color={colors.text} style={styles.studyIcon} />
                <ThemedText style={styles.studyButtonText}>Study this word</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: '90%',
    maxWidth: 400,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  content: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    padding: LAYOUT.CARD.PADDING.LARGE,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: LAYOUT.SPACING.LARGE,
    elevation: 8,
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
    opacity: 0.8,
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
