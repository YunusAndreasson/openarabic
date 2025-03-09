import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
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
    authorText: string;
    [key: string]: any;
  };
}

const styles = StyleSheet.create({
  sentenceContainer: {
    paddingHorizontal: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
  arabicSentence: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  englishText: {
    writingDirection: 'ltr',
    fontFamily: 'Philosopher',
    textAlign: 'left',
    paddingLeft: LAYOUT.SPACING.SMALL,
  },
});

// Function to create dynamic styles based on settings and colors
const getEnglishTextStyle = (
  settings: ArticleSentenceProps['settings'],
  colors: ArticleSentenceProps['colors']
) => {
  return {
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

    // Use a less prominent color for English text
    // In dark mode, englishText is already '#CCCCCC' which is less white than the main text
    // In light mode, we'll use authorText which is '#666666' (less black than the main text)
    const textColor = { color: colors.authorText };

    return (
      <View style={styles.sentenceContainer}>
        <View style={styles.arabicSentence}>{words.map(renderWord)}</View>
        {settings.showEnglish && (
          <ThemedText style={[styles.englishText, englishTextStyle, textColor]} skipDefaultColor>
            {sentence.english}
          </ThemedText>
        )}
      </View>
    );
  }
);
