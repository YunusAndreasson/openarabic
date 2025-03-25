import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '@/constants/layout';
import type { Tables } from '@/types/database.types';

interface ArticleSentenceProps {
  sentence: Tables<'article_sentences'>;
  words: (Tables<'sentence_words'> & {
    root: Tables<'roots'> | null;
    word_type: Tables<'word_types'> | null;
  })[];
  renderWord: (
    word: Tables<'sentence_words'> & {
      root: Tables<'roots'> | null;
      word_type: Tables<'word_types'> | null;
    }
  ) => React.ReactNode;
  settings: any;
  colors: any;
  containerStyle?: StyleProp<ViewStyle>;
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
});

// Memoized sentence component for better list performance
export const ArticleSentence = React.memo(
  ({ sentence, words, renderWord, settings, colors, containerStyle }: ArticleSentenceProps) => {
    return (
      <View
        style={[styles.sentenceContainer, { backgroundColor: colors.transparent }, containerStyle]}
      >
        <View style={styles.arabicSentence}>{words.map(renderWord)}</View>
        {settings.showEnglish && (
          <ThemedText
            type="body"
            variant="secondary"
            align="left"
            style={{
              writingDirection: 'ltr',
              fontFamily: 'Philosopher',
              paddingLeft: LAYOUT.SPACING.SMALL,
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale,
              lineHeight: Math.round(
                LAYOUT.TYPOGRAPHY.SCALE.MEDIUM *
                  LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL *
                  settings.fontScale
              ),
            }}
          >
            {sentence.english}
          </ThemedText>
        )}
      </View>
    );
  }
);
