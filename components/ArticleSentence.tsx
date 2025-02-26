import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import type { Tables } from '@/types/database.types';

export interface ArticleSentenceProps {
  sentence: Tables<'article_sentences'>;
  words: Tables<'sentence_words'>[];
  renderWord: (word: Tables<'sentence_words'>) => React.ReactNode;
  settings: {
    showEnglish: boolean;
    fontScale: number;
    [key: string]: any;
  };
  colors: {
    englishText: string;
    [key: string]: any;
  };
}

const styles = StyleSheet.create({
  sentenceContainer: {
    paddingHorizontal: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  arabicSentence: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.TINY,
  },
  englishText: {
    writingDirection: 'ltr',
    fontFamily: 'Philosopher',
    textAlign: 'left',
  },
});

// Memoized sentence component for better list performance
export const ArticleSentence = React.memo(
  ({ sentence, words, renderWord, settings, colors }: ArticleSentenceProps) => (
    <View style={styles.sentenceContainer}>
      <View style={styles.arabicSentence}>{words.map(renderWord)}</View>
      {settings.showEnglish && (
        <ThemedText
          style={[
            styles.englishText,
            {
              color: colors.englishText,
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale,
              lineHeight: Math.round(
                LAYOUT.TYPOGRAPHY.SCALE.MEDIUM *
                  LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL *
                  settings.fontScale
              ),
            },
          ]}
        >
          {sentence.english}
        </ThemedText>
      )}
    </View>
  )
);
