import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import type { Tables } from '@/types/database.types';
import { SentenceWord } from '@/types/vocabulary.types';

export interface ArticleSentenceProps {
  sentence: Tables<'article_sentences'>;
  words: SentenceWord[];
  renderWord: (word: SentenceWord) => React.ReactNode;
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

// Function to create dynamic styles based on settings and colors
const getEnglishTextStyle = (
  settings: ArticleSentenceProps['settings'],
  colors: ArticleSentenceProps['colors']
) => {
  return {
    color: colors.englishText,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale,
    lineHeight: Math.round(
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL * settings.fontScale
    ),
  };
};

// Memoized sentence component for better list performance
export const ArticleSentence = React.memo(
  ({ sentence, words, renderWord, settings, colors }: ArticleSentenceProps) => {
    // Memoize dynamic styles
    const englishTextStyle = React.useMemo(
      () => getEnglishTextStyle(settings, colors),
      [settings.fontScale, colors.englishText]
    );

    return (
      <View style={styles.sentenceContainer}>
        <View style={styles.arabicSentence}>{words.map(renderWord)}</View>
        {settings.showEnglish && (
          <ThemedText style={[styles.englishText, englishTextStyle]}>{sentence.english}</ThemedText>
        )}
      </View>
    );
  }
);
