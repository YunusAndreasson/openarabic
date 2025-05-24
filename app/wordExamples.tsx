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
import BaseCard from '@/components/BaseCard';

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
          backgroundColor: colors.audioHighlight,
          borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
          padding: LAYOUT.SPACING.TINY,
        },
      ],
      [colors.audioHighlight, isHighlighted]
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

// Memoized component for word example items
const WordExampleItem = memo(
  ({ item, wordId, rootId }: { item: SentenceWithWords; wordId?: string; rootId?: string }) => {
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
        <BaseCard shadowSize="small" style={styles.sentenceContent}>
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
        </BaseCard>
      </View>
    );
  }
);

WordExampleItem.displayName = 'WordExampleItem';

export default function WordExamplesScreen() {
  const { wordId, rootId, category, rootMeaning, rootLetters } = useLocalSearchParams<{
    wordId: string;
    rootId: string;
    category: string;
    rootMeaning: string;
    rootLetters: string;
  }>();
  const colors = useColors();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [wordData, setWordData] = useState<SentenceWord | null>(null);
  const [examples, setExamples] = useState<SentenceWithWords[]>([]);

  // Initialize rootInfo from URL params if available
  const rootInfo = useMemo(
    () => (rootMeaning ? { letters: rootLetters || '', meaning: rootMeaning || null } : null),
    [rootMeaning, rootLetters]
  );

  // Fetch word data and example sentences
  useEffect(() => {
    const fetchExamples = async () => {
      // Don't show loading state for direct word/root access
      if (category && !wordId && !rootId) {
        setIsLoading(true);
      }

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
      return <WordExampleItem item={item} wordId={wordId} rootId={rootId} />;
    },
    [rootId, wordId]
  );

  // Get the title for the screen
  const title = useMemo(() => {
    // For categories, use category name
    if (category) {
      switch (category) {
        case 'total':
          return 'Total Words Examples';
        case 'mastered':
          return 'Mastered Examples';
        case 'learning':
          return 'Learning Examples';
        case 'due':
          return 'Review Examples';
        default:
          return 'Word Examples';
      }
    }

    // Use rootMeaning from URL params if available
    if (rootMeaning) {
      return capitalizeFirstLetter(rootMeaning);
    }

    // If we have word data, use that
    if (wordData) {
      if (wordData.root?.meaning) {
        return capitalizeFirstLetter(wordData.root.meaning);
      }
      if (wordData.english) {
        return capitalizeFirstLetter(wordData.english);
      }
    }

    // Fallback to a generic title
    return wordId ? 'Word Examples' : rootId ? 'Word Root' : 'Word Examples';
  }, [category, wordData, wordId, rootId, rootMeaning]);

  // Only show loading state for categories
  const showLoadingState = isLoading && category && !wordId && !rootId;

  // Wait until content is ready before rendering for categories only
  if (showLoadingState) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: title,
            headerShown: true,
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerShadowVisible: false,
            headerTransparent: false,
            headerTitleStyle: {
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 2,
              fontWeight: '600',
            },
            headerTintColor: colors.tint,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </ThemedView>
    );
  }

  // If we have examples, show them
  // If we're loading directly from word/root access, still render the component
  // with empty examples to avoid flickering
  const exampleList = examples.length > 0 || (isLoading && (wordId || rootId)) ? examples : [];

  // Show empty state only if we're not loading and have no examples
  const showEmptyState = !isLoading && examples.length === 0;

  if (showEmptyState) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title,
            headerShown: true,
            headerTitleStyle: {
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 2,
              fontWeight: '600',
            },
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerShadowVisible: false,
            headerTransparent: false,
            headerTintColor: colors.tint,
          }}
        />
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
          headerShadowVisible: false,
          headerTransparent: false,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          // Only show loading indicator if loading with wordId/rootId
          headerRight:
            isLoading && (wordId || rootId)
              ? () => (
                  <ActivityIndicator
                    size="small"
                    color={colors.tint}
                    style={{ marginRight: LAYOUT.SPACING.SMALL }}
                  />
                )
              : undefined,
        }}
      />

      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <FlashList
          data={exampleList}
          renderItem={renderSentenceItem}
          estimatedItemSize={150}
          contentContainerStyle={{
            paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT,
            paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
            paddingTop: LAYOUT.SPACING.TINY,
          }}
          showsVerticalScrollIndicator={true}
          contentInsetAdjustmentBehavior="automatic"
          drawDistance={300}
          keyExtractor={(item, index) => `sentence-${item.sentence.id || index}`}
          ListEmptyComponent={
            isLoading && (wordId || rootId) ? (
              <View style={styles.inlineLoadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : null
          }
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
  inlineLoadingContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentenceContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
    marginTop: 0,
  },
  sentenceContent: {
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  arabicSentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
    marginBottom: LAYOUT.SPACING.SMALL,
    textAlign: 'right',
  },
  wordsContainer: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    minHeight: LAYOUT.SPACING.XLARGE * 2,
    width: '100%',
  },
  wordContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL / 2,
  },
  arabicText: {
    textAlign: 'right',
  },
  englishSentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
