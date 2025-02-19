import React from 'react';
import { StyleSheet, Modal, View, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import type { Tables } from '@/types/database.types';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface WordDetailsModalProps {
  word: Tables<'sentence_words'> & {
    root: Tables<'roots'>;
    word_type: Tables<'word_types'>;
  };
  visible: boolean;
  onClose: () => void;
  isSelected?: boolean;
  onToggleStudy?: () => void;
}

export function WordDetailsModal({
  word,
  visible,
  onClose,
  isSelected,
  onToggleStudy,
}: WordDetailsModalProps) {
  const colors = useColors();

  const handleStudyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleStudy?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView
        intensity={90}
        tint={colors.background === Colors.dark.background ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.contentContainer} onPress={e => e.stopPropagation()}>
          <View
            style={[
              styles.content,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
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
                  },
                ]}
                skipDefaultColor
              >
                {word.word_form}
              </ThemedText>
              <ThemedText style={styles.translation}>{word.english}</ThemedText>
            </View>

            <View style={styles.detailsContainer}>
              {word.root && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.label}>Root Form</ThemedText>
                  <View style={[styles.pill, { backgroundColor: colors.cardBackground }]}>
                    <ThemedText
                      style={[
                        styles.rootText,
                        {
                          color:
                            colors.background === Colors.dark.background
                              ? Colors.dark.white
                              : Colors.light.arabicText,
                        },
                      ]}
                      skipDefaultColor
                    >
                      {word.root.letters}
                    </ThemedText>
                    {word.root.meaning && (
                      <ThemedText style={styles.rootMeaning}>{word.root.meaning}</ThemedText>
                    )}
                  </View>
                </View>
              )}

              {word.word_type && (
                <View style={styles.detailRow}>
                  <ThemedText style={styles.label}>Word Type</ThemedText>
                  <View style={[styles.pill, { backgroundColor: colors.cardBackground }]}>
                    <ThemedText style={styles.typeText}>{word.word_type.name}</ThemedText>
                  </View>
                </View>
              )}

              {word.grammar_note && (
                <View style={styles.grammarNote}>
                  <ThemedText style={styles.label}>Grammar Note</ThemedText>
                  <View style={[styles.notePill, { backgroundColor: colors.cardBackground }]}>
                    <ThemedText style={styles.noteText}>{word.grammar_note}</ThemedText>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.studyButton,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: isSelected ? colors.highlightedArabicText : colors.tint,
                  },
                ]}
                onPress={handleStudyPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSelected ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isSelected ? colors.highlightedArabicText : colors.tint}
                  style={styles.studyIcon}
                />
                <ThemedText
                  style={[
                    styles.studyButtonText,
                    { color: isSelected ? colors.highlightedArabicText : colors.tint },
                  ]}
                  skipDefaultColor
                >
                  {isSelected ? 'Added to Vocabulary' : 'Add to Vocabulary'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
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
    fontSize: 48,
    lineHeight: 86,
    fontFamily: 'NotoNaskhArabic',
    marginBottom: 8,
    textAlign: 'center',
  },
  translation: {
    fontSize: 20,
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
    fontSize: 32,
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
