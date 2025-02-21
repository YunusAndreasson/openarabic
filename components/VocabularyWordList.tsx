import React from 'react';
import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { Tables } from '@/types/database.types';

type StudyWord = Tables<'study_words'> & {
  sentence_word:
    | (Tables<'sentence_words'> & {
        root: Tables<'roots'> | null;
        word_type: Tables<'word_types'> | null;
      })
    | null;
};

interface VocabularyWordListProps {
  title: string;
  words: StudyWord[];
  onWordPress: (word: StudyWord) => void;
}

export function VocabularyWordList({ title, words, onWordPress }: VocabularyWordListProps) {
  const colors = useColors();

  const renderItem = ({ item: studyWord }: { item: StudyWord }) => {
    const word = studyWord.sentence_word;
    if (!word) return null;

    const dueDate = new Date(studyWord.next_review_at);
    const isOverdue = dueDate < new Date();
    const isMastered = studyWord.interval_days >= 30;

    return (
      <Pressable
        onPress={() => onWordPress(studyWord)}
        style={[
          styles.wordCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View style={styles.wordInfo}>
          <ThemedText
            style={[
              styles.arabicWord,
              {
                color: colors.arabicText,
              },
            ]}
            skipDefaultColor
          >
            {word.word_form}
          </ThemedText>
          <ThemedText style={styles.translation}>{word.english}</ThemedText>
        </View>
        <View style={styles.statusContainer}>
          <BlurView intensity={10} tint="light" style={styles.statusPill}>
            <View
              style={[
                styles.statusBackground,
                {
                  backgroundColor: isMastered
                    ? colors.success
                    : isOverdue
                      ? colors.warning
                      : colors.info,
                },
              ]}
            >
              <Ionicons
                name={isMastered ? 'checkmark-circle' : isOverdue ? 'time' : 'school'}
                size={16}
                color={colors.background}
              />
              <ThemedText
                style={[styles.statusText, { color: colors.background }]}
                skipDefaultColor
              >
                {isMastered ? 'Mastered' : isOverdue ? 'Due' : 'Learning'}
              </ThemedText>
            </View>
          </BlurView>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <FlatList
        data={words}
        renderItem={renderItem}
        keyExtractor={item => `${item.sentence_word_id}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  wordCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordInfo: {
    flex: 1,
    marginRight: 16,
  },
  arabicWord: {
    fontSize: 24,
    fontFamily: 'NotoNaskhArabic',
    marginBottom: 4,
  },
  translation: {
    fontSize: 16,
    opacity: 0.8,
  },
  statusContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusPill: {
    borderRadius: 12,
  },
  statusBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
