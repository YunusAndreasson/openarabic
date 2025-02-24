import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { CompactThemedCard } from './CompactThemedCard';
import type { Tables } from '@/types/database.types';
import { LAYOUT } from '@/constants/layout';

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
      <CompactThemedCard onPress={() => onWordPress(studyWord)}>
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
      </CompactThemedCard>
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
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  wordInfo: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  arabicWord: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontFamily: 'NotoNaskhArabic',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  translation: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: 0.8,
  },
  statusContainer: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  statusPill: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
  },
  statusBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL - 2,
    gap: LAYOUT.SPACING.SMALL - 2,
  },
  statusText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '600',
  },
});
