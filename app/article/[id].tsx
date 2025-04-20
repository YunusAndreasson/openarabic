/* eslint-disable react-native/no-unused-styles */
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
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
import type { SentenceWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

import type { Article } from '../../types/articles.types';

// Move styles outside component but keep it as a function
const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    contentContainer: {
      backgroundColor: colors.background,
      flex: 1,
    },
    loadingContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingTop: 0,
    },
    transparentBackground: {
      backgroundColor: 'transparent',
    },
  });

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  // Create styles with current colors
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    setManualNavigation,
  } = useMemo(
    () => ({
      currentWordId: audioPlayer.currentWordId,
      currentPosition: audioPlayer.currentPosition,
      isPlaying: audioPlayer.isPlaying,
      currentSentenceIndex: audioPlayer.currentSentenceIndex,
      startPlayback: audioPlayer.startPlayback,
      stopPlayback: audioPlayer.stopPlayback,
      findWordById: audioPlayer.findWordById,
      setManualNavigation: audioPlayer.setManualNavigation,
    }),
    [
      audioPlayer.currentWordId,
      audioPlayer.currentPosition,
      audioPlayer.isPlaying,
      audioPlayer.currentSentenceIndex,
      audioPlayer.startPlayback,
      audioPlayer.stopPlayback,
      audioPlayer.findWordById,
      audioPlayer.setManualNavigation,
    ]
  );

  // Parse article ID
  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

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
    refetchStudyWords,
  } = useArticleData(articleId, user?.id);

  // Pre-fetch study words if user is logged in with optimized caching
  useEffect(() => {
    if (user?.id) {
      // Always fetch fresh data when this screen mounts
      queryClient.fetchQuery({
        queryKey: ['studyWords', user.id],
        queryFn: () => studyWordsFSRSService.getFSRSWords(user.id),
        staleTime: 0, // No stale time - always fetch fresh data
      });
    }
  }, [user, queryClient]);

  // Set up AppState listener to refetch study words when app comes back to foreground
  useEffect(() => {
    if (!user?.id) return;

    // When the app comes back to foreground, refetch the study words
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Force refetch study words when returning to the app
        queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
        refetchStudyWords?.();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.id, queryClient, refetchStudyWords]);

  // Track article view when article data loads
  useEffect(() => {
    if (article && !isLoadingArticle) {
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
  }, [article, isLoadingArticle]);

  // Track reading list changes
  useEffect(() => {
    if (article && !isLoadingReadingList) {
      analytics.trackToggleReadingList(article.id, isInReadingList);
    }
  }, [article, isInReadingList, isLoadingReadingList]);

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
        // Check for audio URL field - only use audio_url as that's all that exists
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

  // Handle scroll events
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const isScrollingDown = currentScrollY > prevScrollYValue.current;
      const isScrollingUp = currentScrollY < prevScrollYValue.current;
      const isCloseToBottom =
        event.nativeEvent.layoutMeasurement.height + currentScrollY >=
        event.nativeEvent.contentSize.height - 200;

      // Toggle header visibility based on scroll direction
      if (isScrollingDown && isHeaderVisible && currentScrollY > 50) {
        setIsHeaderVisible(false);
      } else if (isScrollingUp && !isHeaderVisible) {
        setIsHeaderVisible(true);
      }

      // Track article completion
      if (isCloseToBottom && article) {
        // No need to check for user as we know they're authenticated
        analytics.trackCompleteArticle(article.id, {
          wordsAdded: selectedWordIds?.size || 0,
        });
      }

      prevScrollYValue.current = currentScrollY;
    },
    [isHeaderVisible, article, selectedWordIds]
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
  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    refetchStudyWords
  );

  // We override default word handling to use long-press for root toggles
  const noopWordPress = useCallback((_w: SentenceWord) => {}, []);

  // Use the article renderers hook
  const { handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    selectedWordIds,
    sentenceWordsMap,
    noopWordPress,
    handleRootPress
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
      // Check if index is valid (within array bounds)
      return savedState.sentenceIndex >= 0 && savedState.sentenceIndex < sentenceAudioData.length;
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

    // First stop any existing playback to ensure clean state
    await stopPlayback();

    // Reset Redux state before starting new playback
    dispatch(
      updateAudioState({
        wordId: null,
        position: null,
        isPlaying: true,
        sentenceId: 0, // Start from first sentence (index 0)
      })
    );

    // Reset the sentence index offset to ensure we start from the beginning
    if (audioPlayer.setCurrentSentenceIndex) {
      audioPlayer.setCurrentSentenceIndex(0);
    }

    await audioPlayer.preloadAudioFiles(sentenceAudioData);
    const success = await startPlayback(sentenceAudioData, {
      sentenceOffset: 0, // Explicitly set to start from first sentence
      forceReset: true, // Force a reset of the playback state
    });

    if (!success) {
      handleError(new Error('Failed to start audio playback'));
      setAudioControlVisible(false);
    }
  }, [audioPlayer, sentenceAudioData, startPlayback, dispatch, stopPlayback]);

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

      // If we're at the last sentence or finished playing, start from beginning
      if (
        savedState.sentenceIndex === null ||
        savedState.sentenceIndex >= sentenceAudioData.length - 1
      ) {
        // Clear all states and start fresh
        pausedAudioStateRef.current = {
          sentenceIndex: null,
          wordId: null,
          position: null,
          audioPositionMs: 0,
        };
        await startFreshPlayback();
      } else if (shouldResumeFromSavedPosition(savedState)) {
        await resumeFromSavedPosition(savedState);
      } else {
        await startFreshPlayback();
      }
    } catch (error) {
      handleError(error as Error);
      // Reset UI state on error
      setAudioControlVisible(false);
    }
  }, [
    shouldResumeFromSavedPosition,
    resumeFromSavedPosition,
    startFreshPlayback,
    sentenceAudioData.length,
  ]);

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
    // The user will always be authenticated by this point due to our auth redirect
    // so we don't need to check for user existence
    if (articleId) {
      lightFeedback();
      setInitialBookmarkIcon(isInReadingList ? 'bookmark-outline' : 'bookmark');
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList]);

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
      word: SentenceWord,
      isAudioHighlighted = false,
      wordRef?: React.RefObject<ComponentRef<typeof TouchableOpacity>>
    ) => (
      <ArabicWord
        key={word.id}
        word={word}
        onPress={() => {
          if (word.root) {
            handleRootPress(word.root.id);
          }
        }}
        settings={{
          showEnglish: false,
          fontScale: settings.fontScale,
          showTransliteration: false,
          showWordType: false,
        }}
        isAudioHighlighted={isAudioHighlighted}
        wordRef={wordRef}
      />
    ),
    [handleRootPress, settings]
  );

  // Render sentence item with optimized settings
  const renderSentenceItem = useCallback(
    (props: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(props.item.id);
      return (
        <ArticleSentence
          key={props.item.id}
          sentence={{
            id: props.item.id,
            english: props.item.english,
            arabic: props.item.arabic,
            audio_url: props.item.audio_url,
          }}
          words={words}
          renderWord={renderWord}
          settings={{
            ...settings,
            showTransliteration: false,
            showWordType: false,
          }}
          colors={articleUIProps.colors}
          containerStyle={styles.transparentBackground}
          currentPlayingSentenceId={articleUIProps.currentSentenceIndex}
          currentPlayingWordId={articleUIProps.currentWordId}
          currentPlayingPosition={articleUIProps.currentPosition}
        />
      );
    },
    [getWordsForSentence, renderWord, articleUIProps, settings, styles]
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
        // Set manual navigation flag to prevent auto-advancement from old audio
        setManualNavigation(true);

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

        // Start playback using the full audio data array with correct offset
        await audioPlayer.preloadAudioFiles(sentenceAudioData);
        const success = await startPlayback(sentenceAudioData, {
          sentenceOffset: nextSentenceIndex, // This maintains the correct sentence index
        });

        if (!success) {
          handleError(new Error('Failed to play next sentence'));
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
      // Already at last sentence
      isNavigatingRef.current = false;
    }
  }, [
    currentSentenceIndex,
    sentenceAudioData,
    stopPlayback,
    startPlayback,
    audioPlayer,
    setManualNavigation,
  ]);

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
        // Set manual navigation flag to prevent auto-advancement from old audio
        setManualNavigation(true);

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

        // Start playback from the previous sentence
        await audioPlayer.preloadAudioFiles(sentenceAudioData);
        const success = await startPlayback(sentenceAudioData, {
          sentenceOffset: prevSentenceIndex, // Pass the absolute index
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
  }, [
    currentSentenceIndex,
    sentenceAudioData,
    stopPlayback,
    startPlayback,
    audioPlayer,
    setManualNavigation,
  ]);

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
      <View style={styles.contentContainer}>
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
