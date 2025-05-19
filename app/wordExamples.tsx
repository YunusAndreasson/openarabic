import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import EmptyState from '@/components/EmptyState';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import type { SentenceWord } from '@/types/vocabulary.types';
import { wordExamplesService, SentenceWithWords } from '@/services/wordExamples';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

// Simple word component that only highlights the target word and doesn't use useArabicWord
const SimpleArabicWord = memo(
  ({
    word,
    isHighlighted,
    fontScale = 1.0,
  }: {
    word: SentenceWord;
    isHighlighted: boolean;
    fontScale?: number;
  }) => {
    const colors = useColors();

    const containerStyle = useMemo(
      () => [
        styles.wordContainer,
        isHighlighted && {
          backgroundColor: `${colors.primary}30`, // Use 30% opacity for highlight
          borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
          padding: LAYOUT.SPACING.TINY,
        },
      ],
      [colors.primary, isHighlighted]
    );

    return (
      <View style={containerStyle}>
        <ThemedText type="arabic" arabicFontSize={fontScale * 24} style={styles.arabicText}>
          {word.word_form}
        </ThemedText>
      </View>
    );
  }
);

export default function WordExamplesScreen() {
  const { wordId, rootId, category } = useLocalSearchParams<{
    wordId: string;
    rootId: string;
    category: string;
  }>();
  const colors = useColors();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [wordData, setWordData] = useState<SentenceWord | null>(null);
  const [examples, setExamples] = useState<SentenceWithWords[]>([]);

  // Fetch word data and example sentences

  useEffect(() => {
    const fetchExamples = async () => {
      setIsLoading(true);

      try {
        if (rootId) {
          const { examples, word } = await wordExamplesService.getExamples({
            rootId: parseInt(rootId),
          });
          setWordData(word);
          setExamples(examples);
        } else if (wordId) {
          const { examples, word } = await wordExamplesService.getExamples({
            wordId: parseInt(wordId),
          });
          setWordData(word);
          setExamples(examples);
        } else if (category && user?.id) {
          let rootsQuery = supabase
            .from('study_words')
            .select('root_id')
            .eq('user_id', user.id)
            .order('fsrs_last_review', { ascending: false })
            .limit(5);

          switch (category) {
            case 'mastered':
              rootsQuery = rootsQuery.eq('fsrs_state', 3).gte('fsrs_stability', 30);
              break;
            case 'learning':
              rootsQuery = rootsQuery.or(
                'fsrs_state.eq.1,fsrs_state.eq.2,fsrs_state.eq.0,and(fsrs_state.eq.3,fsrs_stability.lt.30)'
              );
              break;
            case 'due':
              rootsQuery = rootsQuery.lte('fsrs_due', new Date().toISOString());
              break;
          }

          const { data: rootsData, error: rootsError } = await rootsQuery;
          if (rootsError) throw rootsError;

          const rootIds = (rootsData || []).map(r => r.root_id).filter(Boolean);
          if (rootIds.length === 0) {
            setExamples([]);
            setIsLoading(false);
            return;
          }

          const { examples } = await wordExamplesService.getExamples({ rootIds });
          setWordData(null);
          setExamples(examples);
        } else {
          setExamples([]);
        }
      } catch (error) {
        handleError(error as Error);
        setExamples([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamples();
  }, [wordId, rootId, category, user?.id]);
  // Render a sentence with words using ArticleSentence component
  const renderSentenceItem = useCallback(
    ({ item }: { item: SentenceWithWords }) => {
      // Find the specific target word in this sentence
      let targetWordId: number | null = null;

      if (wordId) {
        // If we have a wordId, highlight that specific word only
        targetWordId = parseInt(wordId);
      } else if (rootId) {
        // If we have a rootId, find the first word in this sentence with that root_id
        const wordWithRoot = item.words.find(word => word.root_id === parseInt(rootId));
        if (wordWithRoot) {
          targetWordId = wordWithRoot.id;
        }
      }

      return (
        <View style={styles.sentenceContainer}>
          <View style={[styles.sentenceContent, { backgroundColor: colors.card }]}>
            {/* Show the full sentence with individual word components */}
            {item.words.length > 0 && (
              <View style={styles.wordsContainer}>
                {item.words.map((word, index) => (
                  <SimpleArabicWord
                    key={`word-${word.id}-${index}`}
                    word={word}
                    isHighlighted={targetWordId === word.id}
                    fontScale={1.0}
                  />
                ))}
              </View>
            )}

            {/* Fallback to raw text if no words */}
            {item.words.length === 0 && (
              <ThemedText type="arabic" align="right" style={styles.arabicSentence}>
                {item.sentence.arabic}
              </ThemedText>
            )}

            {/* Show the English translation */}
            <ThemedText colorName="secondaryText" style={styles.englishSentence}>
              {item.sentence.english}
            </ThemedText>
          </View>
        </View>
      );
    },
    [colors, rootId, wordId]
  );

  // Get the title for the screen
  const title = useMemo(() => {
    if (isLoading) return 'Loading...';

    if (category && !wordData) {
      switch (category) {
        case 'total':
          return 'All Words Examples';
        case 'mastered':
          return 'Mastered Words Examples';
        case 'learning':
          return 'Learning Words Examples';
        case 'due':
          return 'Review Words Examples';
        default:
          return 'Word Examples';
      }
    }

    if (!wordData) return 'Word Examples';

    // Prefer root's English meaning, then sentence word's English
    if (wordData.root?.meaning) {
      return capitalizeFirstLetter(wordData.root.meaning);
    }
    if (wordData.english) {
      return capitalizeFirstLetter(wordData.english);
    }
    return 'Word Examples';
  }, [isLoading, wordData, category]);

  if (isLoading) {
    return null;
  }

  if (examples.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title, headerShown: true }} />
        <EmptyState
          title="No Examples Found"
          description="We couldn't find any examples for this word."
          icon="book-outline"
          colors={colors}
        />
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: title,
          headerTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 2,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTransparent: true,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
        }}
      />

      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['top', 'left', 'right']}
      >
        <FlashList
          data={examples}
          renderItem={renderSentenceItem}
          estimatedItemSize={150}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          contentInsetAdjustmentBehavior="automatic"
          estimatedFirstItemOffset={LAYOUT.SPACING.XXLARGE * 3.5}
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordInfoContainer: {
    padding: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
  },
  transliteration: {
    marginVertical: LAYOUT.SPACING.SMALL,
  },
  meaning: {
    marginTop: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
  examplesHeader: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  listContent: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.XXLARGE,
  },
  sentenceContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sentenceContent: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  arabicSentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'right',
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 2,
    paddingRight: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  wordContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL / 2,
  },
  arabicText: {
    textAlign: 'right',
  },
  highlightedWord: {
    marginBottom: LAYOUT.SPACING.SMALL,
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  highlightedWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  highlightedArabic: {
    marginHorizontal: LAYOUT.SPACING.SMALL,
  },
  highlightedEnglish: {
    fontStyle: 'italic',
  },
  englishSentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  separator: {
    height: 1,
    marginHorizontal: LAYOUT.SPACING.LARGE,
    marginVertical: LAYOUT.SPACING.SMALL,
    opacity: 0.1,
  },
});
