import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { AnimatedStyleProp } from 'react-native-reanimated';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { LoadingScreen } from '@/components/Loader';
import { ArticleNotFound } from '@/components/NotFound';
import ThemedCard from '@/components/ThemedCard';
import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence } from '@/components/article';
import { ArabicWord } from '@/components/article/ArabicWord';
import { ArticleButtons } from '@/components/article/ArticleButtons';
import { ArticleContent, type ArticleContentRef } from '@/components/article/ArticleContent';
import AudioControlPanel from '@/components/article/AudioControlPanel';
import { useNavigationWithDebounce } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import { useArticleData } from '@/hooks/useArticleData';
import { useArticleMutations } from '@/hooks/useArticleMutations';
import { useArticleRenderers } from '@/hooks/useArticleRenderers';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import {
  useSentenceAudioPlayer,
  type WordTiming,
  type SentenceWordsMap,
} from '@/hooks/useSentenceAudioPlayer';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { analytics } from '@/services/analytics';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { updateAudioState } from '@/store/audioSlice';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import type { Tables } from '@/types/database.types';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

import type { Article } from '../../types/articles.types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 0, // Remove the top padding since we're centering
  },
});

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const queryClient = useQueryClient();
  const router = useRouter();
  const articleContentRef = useRef<ArticleContentRef>(null);
  const dispatch = useAppDispatch();

  // Scroll position tracking
  const prevScrollYValue = useRef(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // FORCE a default bookmark icon to ensure it's always visible
  const [initialBookmarkIcon, setInitialBookmarkIcon] = useState<'bookmark-outline' | 'bookmark'>(
    'bookmark-outline'
  );

  // Navigation hook
  useNavigationWithDebounce();

  // Get audio player hook - use its state directly
  const audioPlayer = useSentenceAudioPlayer();

  // Memoize audio player state to prevent unnecessary rerenders
  const {
    currentWordId,
    currentPosition,
    isPlaying,
    currentSentenceIndex,
    startPlayback,
    stopPlayback,
    findWordById,
  } = useMemo(
    () => ({
      currentWordId: audioPlayer.currentWordId,
      currentPosition: audioPlayer.currentPosition,
      isPlaying: audioPlayer.isPlaying,
      currentSentenceIndex: audioPlayer.currentSentenceIndex,
      startPlayback: audioPlayer.startPlayback,
      stopPlayback: audioPlayer.stopPlayback,
      findWordById: audioPlayer.findWordById,
    }),
    [
      audioPlayer.currentWordId,
      audioPlayer.currentPosition,
      audioPlayer.isPlaying,
      audioPlayer.currentSentenceIndex,
      audioPlayer.startPlayback,
      audioPlayer.stopPlayback,
      audioPlayer.findWordById,
    ]
  );

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  // Pre-fetch study words if user is logged in with optimized caching
  useEffect(() => {
    if (user?.id) {
      // Immediately fetch study words - don't wait for cached data check
      queryClient.fetchQuery({
        queryKey: ['studyWords', user.id],
        queryFn: () => studyWordsFSRSService.getFSRSWords(user.id),
        staleTime: 300000, // Cache for 5 minutes
        gcTime: 600000, // Keep in garbage collection for 10 minutes
        retry: 3,
      });
    }
  }, [user?.id, queryClient]);

  // Extract article data hook before using any results
  const {
    article,
    isLoadingArticle,
    isInReadingList,
    refetchReadingListStatus,
    isLoadingReadingList,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    otherArticles,
    otherCategoryArticles,
  } = useArticleData(articleId, user?.id);

  // Track article view when article data loads
  useEffect(() => {
    if (article && !isLoadingArticle && user) {
      analytics.trackViewArticle(article.id, {
        ...(article.title && { title: article.title }),
        ...(article.category?.name && { category: article.category.name }),
        ...(article.article_sentences && {
          wordCount: article.article_sentences.reduce(
            (total, sentence) => total + (sentence.sentence_words?.length || 0),
            0
          ),
          sentenceCount: article.article_sentences.length,
        }),
      });
    }
  }, [article, isLoadingArticle, user]);

  // Track reading list changes
  useEffect(() => {
    if (article && user && !isLoadingReadingList) {
      analytics.trackToggleReadingList(article.id, isInReadingList);
    }
  }, [article, isInReadingList, isLoadingReadingList, user]);

  // Use animation hooks for screen and buttons
  const { fadeInStyle, triggerAnimations } = useScreenAnimation(true);
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isHeaderVisible ? 1 : 0, { duration: 200 }),
  }));

  // Use the same animated style for all buttons since they share the same visibility
  const backButtonStyle = buttonStyle;
  const bookmarkButtonStyle = buttonStyle;
  const playButtonStyle = buttonStyle;

  // Prepare audio data for sentence-by-sentence playback
  const sentenceAudioData = useMemo(() => {
    if (!sortedSentences || !sentenceWordsMap) {
      return [];
    }

    const audioData = sortedSentences
      .filter(sentence => {
        // Only include sentences with valid audio URLs
        const audioUrl = sentence.audio_url;
        const isValid =
          audioUrl &&
          audioUrl.trim().length > 0 &&
          (audioUrl.startsWith('http://') ||
            audioUrl.startsWith('https://') ||
            audioUrl.startsWith('file://'));

        return isValid;
      })
      .map(sentence => {
        const sentenceId = sentence.id;
        const words = sentenceWordsMap.get(sentenceId) || [];

        // Create word timings from the words that have audio_start and audio_end
        const wordTimings: WordTiming[] = words
          .filter(word => {
            const start = parseFloat(word.audio_start || '');
            const end = parseFloat(word.audio_end || '');
            const isValid = !isNaN(start) && !isNaN(end) && start < end;
            return isValid;
          })
          .map((word, index) => ({
            wordId: word.id,
            startTime: parseFloat(word.audio_start || '0') * 1000, // Convert to milliseconds
            endTime: parseFloat(word.audio_end || '0') * 1000, // Convert to milliseconds
            position: index, // Add position information
          }));

        return {
          sentenceId,
          audioUrl: sentence.audio_url || '',
          wordTimings,
        };
      });

    return audioData;
  }, [sortedSentences, sentenceWordsMap]);

  // Auto-scroll to the currently highlighted word
  useEffect(() => {
    if (!currentWordId || !articleContentRef.current || !sentenceWordsMap) {
      return;
    }

    // Find the sentence that contains this word using the hook's function
    const word = findWordById(currentWordId, sentenceWordsMap as SentenceWordsMap);
    if (!word) {
      return;
    }

    // Use the ArticleContent ref to scroll to the sentence
    articleContentRef.current.scrollToSentence(word.sentence_id);
  }, [currentWordId, sentenceWordsMap, findWordById]);

  // Track article completion and handle animations on scroll
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 20;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isCloseToBottom && article && user) {
        analytics.trackCompleteArticle(article.id, {
          wordsAdded: selectedWordIds.size,
        });
      }

      // Handle scroll animations
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const isScrollingUp = currentScrollY < prevScrollYValue.current;
      const isAtTop = currentScrollY <= 0;
      const shouldBeVisible = isScrollingUp || isAtTop;

      if (isHeaderVisible !== shouldBeVisible) {
        setIsHeaderVisible(shouldBeVisible);
      }

      prevScrollYValue.current = currentScrollY;
    },
    [article, user, selectedWordIds, isHeaderVisible]
  );

  // Update bookmark icon when reading list status changes
  useEffect(() => {
    if (!isLoadingReadingList) {
      setInitialBookmarkIcon(isInReadingList ? 'bookmark' : 'bookmark-outline');
    }
  }, [isLoadingReadingList, isInReadingList]);

  // Check if all data is loaded with optimized loading states
  const isLoading = useMemo(() => {
    // Consider data ready if we have article data in cache
    const articleQuery = queryClient.getQueryData(['article', articleId]);
    if (articleQuery) return false;

    return (
      isLoadingArticle ||
      isLoadingReadingList ||
      !article?.article_sentences ||
      !sentenceWordsMap ||
      (article.article_sentences.length > 0 && !sortedSentences?.length)
    );
  }, [
    isLoadingArticle,
    isLoadingReadingList,
    article,
    sentenceWordsMap,
    sortedSentences,
    articleId,
    queryClient,
  ]);

  // Start content animations when mounted
  useEffect(() => {
    triggerAnimations();
  }, [triggerAnimations]);

  // Handle article data hook callbacks
  const { handleToggleReadingList, handleWordPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus
  );

  // Use the article renderers hook
  const { handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    colors,
    selectedWordIds,
    sentenceWordsMap || new Map(),
    (word: Tables<'sentence_words'>) => handleWordPress(word.id)
  );

  // New state to track if audio control panel should be visible
  const [audioControlVisible, setAudioControlVisible] = useState(false);

  // New ref to prevent rapid navigation actions
  const isNavigatingRef = useRef(false);

  // Add a ref to track previous playing state
  const wasPlayingRef = useRef(false);

  // Pause audio state tracking
  const pausedAudioStateRef = useRef<{
    sentenceIndex: number | null;
    wordId: number | null;
    position: number | null;
    audioPositionMs?: number;
  }>({
    sentenceIndex: null,
    wordId: null,
    position: null,
    audioPositionMs: 0,
  });

  // Define a type for the saved audio state
  type SavedAudioState = {
    sentenceIndex: number | null;
    wordId: number | null;
    position: number | null;
    audioPositionMs?: number;
  };

  // Helper to check if we should resume from saved position
  const shouldResumeFromSavedPosition = useCallback(
    (savedState: SavedAudioState) => {
      // Early return if no valid sentence index
      if (savedState.sentenceIndex === null) return false;
      if (savedState.sentenceIndex < 0) return false;

      // Now TypeScript knows sentenceIndex is a number
      // Check if at end of article
      return savedState.sentenceIndex < sentenceAudioData.length - 1;
    },
    [sentenceAudioData]
  );

  // Helper to resume from saved position
  const resumeFromSavedPosition = useCallback(
    async (savedState: SavedAudioState) => {
      if (savedState.sentenceIndex === null) {
        throw new Error('Cannot resume playback with null sentence index');
      }

      // Update Redux state to indicate playback is starting
      dispatch(
        updateAudioState({
          wordId: savedState.wordId,
          position: savedState.position,
          isPlaying: true,
          sentenceId: savedState.sentenceIndex,
        })
      );

      // Use the resumePlayback function to continue exact sentence
      const resumeSuccess = await audioPlayer.resumePlayback(
        savedState.sentenceIndex, // Now safe to use directly since we checked above
        savedState.audioPositionMs || 0
      );

      if (!resumeSuccess) {
        // If resume fails, try starting from beginning of current sentence
        await audioPlayer.preloadAudioFiles(sentenceAudioData);
        const success = await startPlayback(sentenceAudioData, {
          sentenceOffset: savedState.sentenceIndex,
        });

        if (!success) {
          handleError(new Error('Failed to resume audio playback'));
          setAudioControlVisible(false);
        }
      }
    },
    [audioPlayer, sentenceAudioData, startPlayback, dispatch]
  );

  // Helper to start fresh playback
  const startFreshPlayback = useCallback(async () => {
    // Clear any saved state to ensure we start fresh
    pausedAudioStateRef.current = {
      sentenceIndex: null,
      wordId: null,
      position: null,
      audioPositionMs: 0,
    };

    // Reset Redux state before starting new playback
    dispatch(
      updateAudioState({
        wordId: null,
        position: null,
        isPlaying: true,
        sentenceId: 0, // Start from first sentence (index 0)
      })
    );

    await audioPlayer.preloadAudioFiles(sentenceAudioData);
    const success = await startPlayback(sentenceAudioData);
    if (!success) {
      handleError(new Error('Failed to start audio playback'));
      setAudioControlVisible(false);
    }
  }, [audioPlayer, sentenceAudioData, startPlayback, dispatch]);

  // Helper function to handle pausing audio
  const handlePauseAudio = useCallback(async () => {
    try {
      // Get current audio position in milliseconds for precise resumption
      let currentAudioPositionMs = 0;
      if (audioPlayer.soundRef.current) {
        try {
          const status = await audioPlayer.soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            currentAudioPositionMs = status.positionMillis;
          }
        } catch (audioError) {
          handleError(audioError as Error);
        }
      }

      // Save complete state for resumption
      pausedAudioStateRef.current = {
        sentenceIndex: currentSentenceIndex,
        wordId: currentWordId,
        position: currentPosition,
        audioPositionMs: currentAudioPositionMs,
      };

      // MODIFIED: Stop playback but DON'T unload the sound
      await audioPlayer.stopPlayback(false);

      // Update wasPlayingRef to reflect the current state
      wasPlayingRef.current = false;

      // Dispatch Redux update to indicate paused state but keep current positions
      dispatch(
        updateAudioState({
          wordId: currentWordId,
          position: currentPosition,
          isPlaying: false,
          sentenceId: currentSentenceIndex,
        })
      );
    } catch (error) {
      handleError(error as Error);
    }
  }, [audioPlayer, currentSentenceIndex, currentWordId, currentPosition, dispatch]);

  // Helper function to handle starting/resuming audio
  const handleStartAudio = useCallback(async () => {
    try {
      // Show the controls when starting playback
      setAudioControlVisible(true);

      // Update wasPlayingRef to reflect that we're now playing
      wasPlayingRef.current = true;

      // Check if we have a saved position to resume from
      const savedState = pausedAudioStateRef.current;

      if (shouldResumeFromSavedPosition(savedState)) {
        await resumeFromSavedPosition(savedState);
      } else {
        await startFreshPlayback();
      }
    } catch (error) {
      handleError(error as Error);
      // Reset UI state on error
      setAudioControlVisible(false);
    }
  }, [shouldResumeFromSavedPosition, resumeFromSavedPosition, startFreshPlayback]);

  // Handle play button press for article-level play/pause
  const handlePlayPress = useCallback(async () => {
    lightFeedback();

    if (isPlaying) {
      await handlePauseAudio();
    } else {
      await handleStartAudio();
    }
  }, [isPlaying, handlePauseAudio, handleStartAudio]);

  // Handle bookmark toggle with optimistic updates
  const handleBookmarkPress = useCallback(() => {
    // Add this check: If no user, do nothing
    if (!user) {
      return;
    }

    if (articleId) {
      lightFeedback();
      setInitialBookmarkIcon(isInReadingList ? 'bookmark-outline' : 'bookmark');
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList, user]);

  // Handle back button press with optimized cleanup
  const handleBackPress = useCallback(() => {
    // Stop audio playback if it's playing
    if (isPlaying) {
      stopPlayback().catch(error => {
        handleError(error);
      });
    }

    // Reset saved position
    pausedAudioStateRef.current = {
      sentenceIndex: null,
      wordId: null,
      position: null,
    };

    // Hide audio controls
    setAudioControlVisible(false);

    // Unload any audio resources
    if (audioPlayer.soundRef && audioPlayer.soundRef.current) {
      audioPlayer.soundRef.current.unloadAsync().catch(error => {
        handleError(error);
      });
    }

    // Reset screen animations
    const resetAnimations = () => {
      // Reset any active animations
      if (triggerAnimations && typeof triggerAnimations === 'function') {
        triggerAnimations();
      }
    };
    resetAnimations();

    // Clear any pending callbacks
    prevScrollYValue.current = 0;

    // Reset audio state in Redux
    dispatch(
      updateAudioState({
        wordId: null,
        position: null,
        isPlaying: false,
        sentenceId: null,
      })
    );

    // Cancel any pending React Query mutations
    queryClient.cancelQueries();

    // Navigate back
    router.back();
  }, [isPlaying, stopPlayback, audioPlayer, router, dispatch, triggerAnimations, queryClient]);

  // Memoize rendering-related props to prevent unnecessary rerenders
  const articleUIProps = useMemo(
    () => ({
      colors,
      settings,
      currentSentenceIndex,
      currentWordId,
      currentPosition,
    }),
    [colors, settings, currentSentenceIndex, currentWordId, currentPosition]
  );

  // Component renderers
  const renderWord = useCallback(
    (
      word: Tables<'sentence_words'> & {
        root: Tables<'roots'> | null;
        word_type: Tables<'word_types'> | null;
      },
      isAudioHighlighted = false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wordRef?: any
    ) => {
      return (
        <ArabicWord
          key={word.id}
          word={word}
          onPress={word => handleWordPress(word.id)}
          settings={{
            showEnglish: false,
            fontScale: settings.fontScale,
            showTransliteration: false,
            showWordType: false,
          }}
          isAudioHighlighted={isAudioHighlighted}
          wordRef={wordRef}
        />
      );
    },
    [handleWordPress, settings]
  );

  // Render article list item with optimized settings
  const renderSentenceItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item: sentence }: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(sentence.id);
      return (
        <ArticleSentence
          key={sentence.id}
          sentence={{
            id: sentence.id,
            english: sentence.english,
            audio_url: sentence.audio_url || undefined,
          }}
          words={words}
          renderWord={renderWord}
          settings={articleUIProps.settings}
          colors={articleUIProps.colors}
          containerStyle={{ backgroundColor: colors.transparent }}
          currentPlayingSentenceId={articleUIProps.currentSentenceIndex}
          currentPlayingWordId={articleUIProps.currentWordId}
          currentPlayingPosition={articleUIProps.currentPosition}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getWordsForSentence, renderWord, articleUIProps]
  );

  // Render article card with memoization
  const renderArticleCard = useCallback(
    (articleData: Article) => (
      <ThemedCard
        key={articleData.id}
        variant="compact"
        article={articleData}
        onPress={() => handleArticlePress(articleData.id, true)}
      />
    ),
    [handleArticlePress]
  );

  // Handle explicit stop of playback
  const handleStopPlayback = useCallback(async () => {
    lightFeedback();

    try {
      // Reset saved position
      pausedAudioStateRef.current = {
        sentenceIndex: null,
        wordId: null,
        position: null,
        audioPositionMs: 0,
      };

      // Hide controls and stop playback
      setAudioControlVisible(false);

      // Update wasPlayingRef to reflect that we're stopping playback
      wasPlayingRef.current = false;

      // Fully stop and unload all audio resources
      await stopPlayback();

      // Explicitly unload any audio resources to ensure complete cleanup
      if (audioPlayer.soundRef && audioPlayer.soundRef.current) {
        try {
          await audioPlayer.soundRef.current.unloadAsync();
        } catch (error) {
          handleError(error as Error);
        }
      }

      // Reset audio state in Redux
      dispatch(
        updateAudioState({
          wordId: null,
          position: null,
          isPlaying: false,
          sentenceId: null,
        })
      );
    } catch (error) {
      handleError(error as Error);
    }
  }, [stopPlayback, dispatch, audioPlayer]);

  // Handle next sentence button press
  const handleNextSentence = useCallback(async () => {
    // Prevent rapid multiple clicks
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    lightFeedback();

    if (currentSentenceIndex === null || !sentenceAudioData.length) {
      isNavigatingRef.current = false;
      return;
    }

    // If not at the last sentence, go to the next one
    if (currentSentenceIndex < sentenceAudioData.length - 1) {
      try {
        // Stop current playback
        await stopPlayback();

        // Update saved state to next sentence
        const nextSentenceIndex = currentSentenceIndex + 1;
        pausedAudioStateRef.current = {
          sentenceIndex: nextSentenceIndex,
          wordId: null,
          position: null,
          audioPositionMs: 0,
        };

        // Start playback from the next sentence - use a slice but keep proper index
        const nextSentences = sentenceAudioData.slice(nextSentenceIndex);
        await audioPlayer.preloadAudioFiles(nextSentences);
        const success = await startPlayback(nextSentences, {
          sentenceOffset: nextSentenceIndex, // Pass the absolute index in the original array
        });

        if (!success) {
          // Try one more sentence ahead if this fails
          if (nextSentenceIndex + 1 < sentenceAudioData.length) {
            const skipAheadSentences = sentenceAudioData.slice(nextSentenceIndex + 1);
            await startPlayback(skipAheadSentences, {
              sentenceOffset: nextSentenceIndex + 1, // Pass the absolute index
            });
          } else {
            handleError(new Error('Failed to play next sentence'));
            setAudioControlVisible(false);
          }
        }
      } catch (error) {
        handleError(error as Error);
        setAudioControlVisible(false);
      } finally {
        // Reset navigation state after a delay to prevent rapid transitions
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      }
    } else {
      // Already at last sentence
      isNavigatingRef.current = false;
    }
  }, [currentSentenceIndex, sentenceAudioData, stopPlayback, startPlayback, audioPlayer]);

  // Handle previous sentence button press
  const handlePreviousSentence = useCallback(async () => {
    // Prevent rapid multiple clicks
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    lightFeedback();

    if (currentSentenceIndex === null || !sentenceAudioData.length) {
      isNavigatingRef.current = false;
      return;
    }

    // If not at the first sentence, go to the previous one
    if (currentSentenceIndex > 0) {
      try {
        // Stop current playback
        await stopPlayback();

        // Update saved state to previous sentence
        const prevSentenceIndex = currentSentenceIndex - 1;
        pausedAudioStateRef.current = {
          sentenceIndex: prevSentenceIndex,
          wordId: null,
          position: null,
          audioPositionMs: 0,
        };

        // Start playback from the previous sentence - use a slice but keep proper index
        const prevSentences = sentenceAudioData.slice(prevSentenceIndex);
        await audioPlayer.preloadAudioFiles(prevSentences);
        const success = await startPlayback(prevSentences, {
          sentenceOffset: prevSentenceIndex, // Pass the absolute index in the original array
        });

        if (!success) {
          handleError(new Error('Failed to play previous sentence'));
          setAudioControlVisible(false);
        }
      } catch (error) {
        handleError(error as Error);
        setAudioControlVisible(false);
      } finally {
        // Reset navigation state after a delay to prevent rapid transitions
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      }
    } else {
      // Already at first sentence
      isNavigatingRef.current = false;
    }
  }, [currentSentenceIndex, sentenceAudioData, stopPlayback, startPlayback, audioPlayer]);

  // Main render - loading state
  if (isLoading) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: colors.background }]}
        useSafeArea={false}
      >
        <StatusBar
          style={isDarkMode ? 'light' : 'dark'}
          translucent={true}
          animated={true}
          hidden={false}
        />
        <View style={styles.loadingContainer}>
          <LoadingScreen />
        </View>

        <ArticleButtons
          backButtonStyle={backButtonStyle}
          bookmarkButtonStyle={bookmarkButtonStyle}
          playButtonStyle={playButtonStyle}
          onBackPress={handleBackPress}
          onBookmarkPress={handleBookmarkPress}
          onPlayPress={handlePlayPress}
          isInReadingList={isInReadingList}
          initialBookmarkIcon={initialBookmarkIcon}
          isPlaying={isPlaying}
          colors={colors}
          isDarkMode={isDarkMode}
          user={user}
        />
      </ThemedView>
    );
  }

  // Article not found state
  if (!article) {
    return (
      <ThemedView style={styles.container} useSafeArea={false}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent={true} animated={true} />

        <ArticleNotFound />

        <ArticleButtons
          backButtonStyle={backButtonStyle}
          bookmarkButtonStyle={bookmarkButtonStyle}
          playButtonStyle={playButtonStyle}
          onBackPress={handleBackPress}
          onBookmarkPress={handleBookmarkPress}
          onPlayPress={handlePlayPress}
          isInReadingList={isInReadingList}
          initialBookmarkIcon={initialBookmarkIcon}
          isPlaying={isPlaying}
          colors={colors}
          isDarkMode={isDarkMode}
          user={user}
        />
      </ThemedView>
    );
  }

  // Main article view
  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <StatusBar
        style={isDarkMode ? 'light' : 'dark'}
        translucent={true}
        animated={true}
        hidden={!isHeaderVisible}
      />

      <ArticleButtons
        backButtonStyle={backButtonStyle}
        bookmarkButtonStyle={bookmarkButtonStyle}
        playButtonStyle={playButtonStyle}
        onBackPress={handleBackPress}
        onBookmarkPress={handleBookmarkPress}
        onPlayPress={handlePlayPress}
        isInReadingList={isInReadingList}
        initialBookmarkIcon={initialBookmarkIcon}
        isPlaying={isPlaying}
        colors={colors}
        user={user}
        isDarkMode={isDarkMode}
      />

      {/* Article content */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        {sortedSentences && sortedSentences.length > 0 ? (
          <ArticleContent
            ref={articleContentRef}
            id={id}
            article={article}
            sortedSentences={sortedSentences}
            renderSentenceItem={renderSentenceItem}
            handleScroll={handleScroll}
            colors={colors}
            footerStyle={fadeInStyle as AnimatedStyleProp<ViewStyle>}
            otherArticles={otherArticles}
            otherCategoryArticles={otherCategoryArticles}
            renderArticleCard={renderArticleCard}
            currentPlayingSentenceId={currentSentenceIndex}
          />
        ) : null}
      </View>

      {/* Audio Control Panel */}
      <AudioControlPanel
        isVisible={audioControlVisible}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPress}
        onStop={handleStopPlayback}
        onPrevious={handlePreviousSentence}
        onNext={handleNextSentence}
        currentSentenceIndex={currentSentenceIndex}
        totalSentences={sentenceAudioData.length}
      />
    </ThemedView>
  );
}
