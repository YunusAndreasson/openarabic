import React from 'react';
import { StyleSheet, View, Modal, TouchableWithoutFeedback, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { useAppSelector } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface WordDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  word: Tables<'sentence_words'> & {
    root: Tables<'roots'> | null;
    word_type: Tables<'word_types'> | null;
  };
  isSelected: boolean;
  onStudyPress: () => void;
}

export function WordDetailsModal({
  visible,
  onClose,
  word,
  isSelected,
  onStudyPress,
}: WordDetailsModalProps) {
  const colors = useColors();
  const { fontScale } = useAppSelector(state => state.settings);

  const handleStudyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStudyPress();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <BlurView intensity={20} tint="dark" style={styles.contentContainer}>
            <View
              style={[
                styles.content,
                { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.header}>
                <ThemedText
                  style={[
                    styles.arabicWord,
                    {
                      color:
                        colors.background === Colors.dark.background
                          ? Colors.dark.white
                          : Colors.light.arabicText,
                      fontSize: 36 * fontScale,
                      lineHeight: Math.round(48 * fontScale),
                    },
                  ]}
                  skipDefaultColor
                >
                  {word.word_form}
                </ThemedText>
                <ThemedText style={[styles.translation, { fontSize: 18 * fontScale }]}>
                  {word.english}
                </ThemedText>
              </View>

              <View style={styles.detailsContainer}>
                {word.root && (
                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.label, { fontSize: 14 }]}>Root</ThemedText>
                    <View style={[styles.pill, { backgroundColor: colors.cardBackground }]}>
                      <ThemedText
                        style={[
                          styles.rootText,
                          {
                            color:
                              colors.background === Colors.dark.background
                                ? Colors.dark.white
                                : Colors.light.arabicText,
                            fontSize: 24 * fontScale,
                          },
                        ]}
                        skipDefaultColor
                      >
                        {word.root.letters}
                      </ThemedText>
                      {word.root.meaning && (
                        <ThemedText style={[styles.rootMeaning, { fontSize: 14 }]}>
                          {word.root.meaning}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                )}

                {word.word_type && (
                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.label, { fontSize: 14 }]}>Type</ThemedText>
                    <View style={[styles.pill, { backgroundColor: colors.cardBackground }]}>
                      <ThemedText style={[styles.typeText, { fontSize: 16 }]}>
                        {word.word_type.name}
                      </ThemedText>
                    </View>
                  </View>
                )}

                {word.grammar_note && (
                  <View style={styles.grammarNote}>
                    <ThemedText style={[styles.label, { fontSize: 14 }]}>Grammar Note</ThemedText>
                    <View style={[styles.notePill, { backgroundColor: colors.cardBackground }]}>
                      <ThemedText style={[styles.noteText, { fontSize: 14 }]}>
                        {word.grammar_note}
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>

              <Pressable
                onPress={handleStudyPress}
                style={[
                  styles.studyButton,
                  {
                    backgroundColor: isSelected ? colors.cardBackground : colors.tint,
                    borderColor: colors.tint,
                  },
                ]}
              >
                <Ionicons
                  name={isSelected ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isSelected ? colors.tint : colors.background}
                  style={styles.studyIcon}
                />
                <ThemedText
                  style={[
                    styles.studyButtonText,
                    {
                      color: isSelected ? colors.tint : colors.background,
                      fontSize: 16,
                    },
                  ]}
                  skipDefaultColor
                >
                  {isSelected ? 'Remove from Study List' : 'Add to Study List'}
                </ThemedText>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </TouchableWithoutFeedback>
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
    paddingVertical: 16,
  },
  content: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  arabicWord: {
    fontFamily: 'NotoNaskhArabic',
    marginBottom: 8,
    textAlign: 'center',
  },
  translation: {
    textAlign: 'center',
    fontWeight: '600',
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
    opacity: 0.8,
  },
  pill: {
    borderRadius: 16,
    padding: 12,
  },
  rootText: {
    fontSize: 24,
    fontFamily: 'NotoNaskhArabic',
    textAlign: 'center',
  },
  rootMeaning: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.9,
  },
  typeText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  grammarNote: {
    gap: 6,
  },
  notePill: {
    borderRadius: 16,
    padding: 12,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  studyIcon: {
    marginRight: 8,
  },
  studyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
