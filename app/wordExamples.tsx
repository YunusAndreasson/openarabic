import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/services/supabase';
import { wordExamplesService, SentenceWithWords } from '@/services/wordExamples';
import type { SentenceWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

// Optimized word component with memoized styles and enhanced highlighting
const SimpleArabicWord = memo(
  ({ word, isHighlighted }: { word: SentenceWord; isHighlighted: boolean }) => {
    const colors = useColors();

    const containerStyle = useMemo(
      () => [
        styles.wordContainer,
        isHighlighted && {
          backgroundColor: colors.audioHighlight,
          borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
          padding: LAYOUT.SPACING.TINY,
          shadowColor: colors.audioHighlight,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 2,
        },
      ],
      [colors.audioHighlight, isHighlighted]
    );

    return (
      <View style={containerStyle}>
        <ThemedText type="arabic" arabicFontSize={24} style={styles.arabicText}>
          {word.word_form}
        </ThemedText>
      </View>
    );
  }
);

SimpleArabicWord.displayName = 'SimpleArabicWord';

// Enhanced example item component with better visual hierarchy
const WordExampleItem = memo(
  ({ item, wordId, rootId }: { item: SentenceWithWords; wordId?: string; rootId?: string }) => {
    // Find target word ID once and memoize
    const targetWordId = useMemo(() => {
      if (wordId) return parseInt(wordId);
      if (rootId) {
        const wordWithRoot = item.words.find(word => word.root_id === parseInt(rootId));
        return wordWithRoot?.id || null;
      }
      return null;
    }, [wordId, rootId, item.words]);

    return (
      <View style={styles.sentenceContainer}>
        <BaseCard shadowSize="small" style={styles.sentenceContent}>
          {/* Render words or fallback to raw text */}
          {item.words.length > 0 ? (
            <View style={styles.wordsContainer}>
              {item.words.map((word, index) => (
                <SimpleArabicWord
                  key={`word-${word.id}-${index}`}
                  word={word}
                  isHighlighted={targetWordId === word.id}
                />
              ))}
            </View>
          ) : (
            <ThemedText type="arabic" align="right" style={styles.arabicSentence}>
              {item.sentence.arabic}
            </ThemedText>
          )}

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
  const { wordId, rootId, category, rootMeaning } = useLocalSearchParams<{
    wordId: string;
    rootId: string;
    category: string;
    rootMeaning: string;
  }>();
  const colors = useColors();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [wordData, setWordData] = useState<SentenceWord | null>(null);
  const [examples, setExamples] = useState<SentenceWithWords[]>([]);

  // Memoize derived values
  const showLoadingState = useMemo(() => {
    // Show loading when actively fetching AND no cached data exists
    return isLoading && examples.length === 0;
  }, [isLoading, examples.length]);

  // Enhanced title calculation with better formatting
  const title = useMemo(() => {
    if (category) {
      const categoryTitles = {
        total: 'All Examples',
        mastered: 'Strong Words',
        learning: 'Learning Progress',
        due: 'Review Queue',
      };
      return categoryTitles[category as keyof typeof categoryTitles] || 'Word Examples';
    }

    if (rootMeaning) return capitalizeFirstLetter(rootMeaning);
    if (wordData?.root?.meaning) return capitalizeFirstLetter(wordData.root.meaning);
    if (wordData?.english) return capitalizeFirstLetter(wordData.english);

    return wordId ? 'Word Examples' : rootId ? 'Word Root' : 'Word Examples';
  }, [category, wordData, wordId, rootId, rootMeaning]);

  // Consolidated fetch logic with better error handling
  useEffect(() => {
    const fetchExamples = async () => {
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
          // Category-based fetching with optimized query
          const categoryQueries = {
            mastered: 'fsrs_state.eq.3,fsrs_stability.gte.30',
            learning:
              'fsrs_state.eq.1,fsrs_state.eq.2,fsrs_state.eq.0,and(fsrs_state.eq.3,fsrs_stability.lt.30)',
            due: `fsrs_due.lte.${new Date().toISOString()}`,
          };

          let rootsQuery = supabase
            .from('study_words')
            .select('root_id')
            .eq('user_id', user.id)
            .order('fsrs_last_review', { ascending: false })
            .limit(5);

          const queryFilter = categoryQueries[category as keyof typeof categoryQueries];
          if (queryFilter) {
            rootsQuery = rootsQuery.or(queryFilter);
          }

          const { data: rootsData, error: rootsError } = await rootsQuery;
          if (rootsError) throw rootsError;

          const rootIds = (rootsData || []).map(r => r.root_id).filter(Boolean);
          if (rootIds.length === 0) {
            setExamples([]);
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

  // Memoized render function
  const renderSentenceItem = useCallback(
    ({ item }: { item: SentenceWithWords }) => (
      <WordExampleItem item={item} wordId={wordId} rootId={rootId} />
    ),
    [rootId, wordId]
  );

  // Enhanced header options with better styling
  const headerOptions = useMemo(
    () => ({
      headerShown: true,
      headerTitle: title,
      headerTitleStyle: {
        ...LAYOUT.HEADER.TITLE.SECONDARY,
        color: colors.text,
        letterSpacing: -0.5,
      },
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerShadowVisible: false,
      headerTransparent: false,
      headerTitleAlign: 'left' as const,
      headerTintColor: colors.tint,
    }),
    [title, colors]
  );

  // Early returns for loading states only
  if (showLoadingState) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={headerOptions} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText variant="secondary" style={styles.loadingText}>
            Loading examples...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen options={headerOptions} />

      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <FlashList
          data={examples}
          renderItem={renderSentenceItem}
          estimatedItemSize={160}
          contentContainerStyle={{
            paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
            paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
            paddingTop: LAYOUT.SPACING.SMALL,
          }}
          showsVerticalScrollIndicator={true}
          contentInsetAdjustmentBehavior="automatic"
          drawDistance={400}
          keyExtractor={(item, index) => `sentence-${item.sentence.id || index}`}
        />
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  arabicSentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.5,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'right',
  },
  arabicText: {
    textAlign: 'right',
  },
  container: {
    flex: 1,
  },
  englishSentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    gap: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
  },
  sentenceContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: 0,
  },
  sentenceContent: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.LARGE,
  },
  wordContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL / 2,
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
});
