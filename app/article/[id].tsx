/* eslint-disable react-native/no-unused-styles */
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { ComponentRef, JSX } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import type { TouchableOpacity } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSentence } from '@/components/article';
import { ArabicWord } from '@/components/article/ArabicWord';
import { ArticleContent, type ArticleContentRef } from '@/components/article/ArticleContent';
import AudioControlPanel from '@/components/article/AudioControlPanel';
import { LAYOUT } from '@/constants/layout';
import { useNavigationWithDebounce } from '@/hooks';
import { useArticleData } from '@/hooks/useArticleData';
import { useArticleMutations } from '@/hooks/useArticleMutations';
import { useArticleRenderers } from '@/hooks/useArticleRenderers';
import { useArticlesByDueWords } from '@/hooks/useArticlesByDueWords';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useHeaderVisibility } from '@/hooks/useHeaderVisibility';
import {
  useSentenceAudioPlayer,
  type WordTiming,
  type SentenceWordsMap,
} from '@/hooks/useSentenceAudioPlayer';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { analytics } from '@/services/analytics';
import { updateAudioState } from '@/store/audioSlice';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setFontScale } from '@/store/settingsSlice';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    transparentBackground: {
      backgroundColor: colors.transparent,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    },
  });

export default function ArticleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const queryClient = useQueryClient();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { handleScroll } = useHeaderVisibility();

  useNavigationWithDebounce();
  const audioPlayer = useSentenceAudioPlayer();
  const {
    currentWordId,
    currentPosition,
    isPlaying,
    currentSentenceIndex,
    startPlayback,
    stopPlayback,
    findWordById,
  } = audioPlayer;

  const articleId = useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

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
    refetchStudyWords,
  } = useArticleData(articleId, user?.id);

  const { dueWordRootIds = new Set<number>() } = useArticlesByDueWords(user?.id, 0);

  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        queryClient.invalidateQueries({ queryKey: ['studyWords', user.id] });
        refetchStudyWords?.();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [user?.id, queryClient, refetchStudyWords]);

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

  useEffect(() => {
    if (article && !isLoadingReadingList) {
      analytics.trackToggleReadingList(article.id, isInReadingList);
    }
  }, [article, isInReadingList, isLoadingReadingList]);

  // Re-add sentenceAudioData that was removed by mistake
  const sentenceAudioData = useMemo(() => {
    if (!sortedSentences || !sentenceWordsMap) {
      return [];
    }
    if (sortedSentences.length === 0) {
      return [];
    }
    const validSentences = sortedSentences.filter(sentence => {
      const audioUrl = sentence.audio_url?.trim();
      return (
        audioUrl &&
        (audioUrl.startsWith('http://') ||
          audioUrl.startsWith('https://') ||
          audioUrl.startsWith('file://'))
      );
    });
    if (validSentences.length === 0) {
      return [];
    }
    return validSentences.map(sentence => {
      const sentenceId = sentence.id;
      const words = sentenceWordsMap.get(sentenceId) || [];
      const wordTimings = words.reduce<WordTiming[]>((acc, word, index) => {
        const start = parseFloat(word.audio_start || '');
        const end = parseFloat(word.audio_end || '');
        if (!isNaN(start) && !isNaN(end) && start < end) {
          acc.push({
            wordId: word.id,
            startTime: start * 1000,
            endTime: end * 1000,
            position: index,
          });
        }
        return acc;
      }, []);
      return {
        sentenceId,
        audioUrl: sentence.audio_url || '',
        wordTimings,
      };
    });
  }, [sortedSentences, sentenceWordsMap]);

  const currentSentenceId = useMemo(() => {
    if (currentSentenceIndex !== null && sortedSentences && sortedSentences[currentSentenceIndex]) {
      return sortedSentences[currentSentenceIndex].id;
    }
    return null;
  }, [currentSentenceIndex, sortedSentences]);

  const articleContentRef = useRef<ArticleContentRef>(null);

  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    refetchStudyWords
  );

  const handleWordPress = useCallback(
    (word: SentenceWord) => {
      if (word.root) {
        handleRootPress(word.root.id);
      }
    },
    [handleRootPress]
  );

  const { handleArticlePress, getWordsForSentence } = useArticleRenderers(
    settings,
    selectedWordIds,
    sentenceWordsMap,
    handleWordPress,
    handleRootPress
  );

  // Add a ref to track the last scrolled word to prevent cycles
  const lastScrolledWordIdRef = useRef<number | null>(null);
  const lastScrolledSentenceIdRef = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      !currentWordId ||
      !articleContentRef.current ||
      !sentenceWordsMap ||
      currentWordId === lastScrolledWordIdRef.current
    ) {
      return;
    }

    const word = findWordById(currentWordId, sentenceWordsMap as SentenceWordsMap);
    if (!word) {
      return;
    }

    // Only scroll if we've moved to a different sentence, not on every word change
    if (word.sentence_id === lastScrolledSentenceIdRef.current) {
      lastScrolledWordIdRef.current = currentWordId;
      return;
    }

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Track this word ID and sentence ID to prevent multiple scrolls
    lastScrolledWordIdRef.current = currentWordId;
    lastScrolledSentenceIdRef.current = word.sentence_id;

    // Debounce the scroll to prevent excessive scrolling during rapid word changes
    scrollTimeoutRef.current = setTimeout(() => {
      if (articleContentRef.current) {
        articleContentRef.current.scrollToSentence(word.sentence_id);
      }
    }, 150); // Slightly longer delay to let sentence-level scrolling take precedence

    // Reset the tracking after a delay to allow future scrolls to the same word if needed
    const resetTimer = setTimeout(() => {
      if (lastScrolledWordIdRef.current === currentWordId) {
        lastScrolledWordIdRef.current = null;
      }
      // Don't reset sentence tracking as aggressively
    }, 2000); // Longer timeout for better stability

    return () => {
      clearTimeout(resetTimer);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentWordId, sentenceWordsMap, findWordById]);

  const [audioControlVisible, setAudioControlVisible] = useState(false);
  const [audioSessionActive, setAudioSessionActive] = useState(false);
  const isNavigatingRef = useRef(false);
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

  type SavedAudioState = {
    sentenceIndex: number | null;
    wordId: number | null;
    position: number | null;
    audioPositionMs?: number;
  };

  const shouldResumeFromSavedPosition = useCallback(
    (savedState: SavedAudioState) => {
      if (savedState.sentenceIndex === null) return false;
      if (savedState.sentenceIndex < 0) return false;
      return savedState.sentenceIndex >= 0 && savedState.sentenceIndex < sentenceAudioData.length;
    },
    [sentenceAudioData]
  );

  const resumeFromSavedPosition = useCallback(
    async (savedState: SavedAudioState) => {
      if (savedState.sentenceIndex === null) {
        throw new Error('Cannot resume playback with null sentence index');
      }
      dispatch(
        updateAudioState({
          wordId: savedState.wordId,
          position: savedState.position,
          isPlaying: true,
          sentenceId: savedState.sentenceIndex,
        })
      );
      const resumeSuccess = await audioPlayer.resumePlayback(
        savedState.sentenceIndex,
        savedState.audioPositionMs || 0
      );
      if (!resumeSuccess) {
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

  const startFreshPlayback = useCallback(async () => {
    pausedAudioStateRef.current = {
      sentenceIndex: null,
      wordId: null,
      position: null,
      audioPositionMs: 0,
    };
    await stopPlayback();
    dispatch(
      updateAudioState({
        wordId: null,
        position: null,
        isPlaying: true,
        sentenceId: 0,
      })
    );
    if (audioPlayer.setCurrentSentenceIndex) {
      audioPlayer.setCurrentSentenceIndex(0);
    }
    await audioPlayer.preloadAudioFiles(sentenceAudioData);
    const success = await startPlayback(sentenceAudioData, {
      sentenceOffset: 0,
      forceReset: true,
    });
    if (!success) {
      handleError(new Error('Failed to start audio playback'));
      setAudioControlVisible(false);
    }
  }, [audioPlayer, sentenceAudioData, startPlayback, dispatch, stopPlayback]);

  const handleStartAudio = useCallback(async () => {
    try {
      setAudioControlVisible(true);
      setAudioSessionActive(true);
      const savedState = pausedAudioStateRef.current;
      if (
        savedState.sentenceIndex === null ||
        savedState.sentenceIndex >= sentenceAudioData.length - 1
      ) {
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
      setAudioControlVisible(false);
    }
  }, [
    shouldResumeFromSavedPosition,
    resumeFromSavedPosition,
    startFreshPlayback,
    sentenceAudioData.length,
  ]);

  const handleBookmarkPress = useCallback(() => {
    if (articleId) {
      lightFeedback();
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList]);

  const [showEnglishLocal, setShowEnglishLocal] = useState(true);

  const handleEnglishToggle = useCallback(() => {
    setShowEnglishLocal(!showEnglishLocal);
  }, [showEnglishLocal]);

  const [showTextSizeSlider, setShowTextSizeSlider] = useState(false);

  const handleTextSizeToggle = useCallback(() => {
    setShowTextSizeSlider(!showTextSizeSlider);
  }, [showTextSizeSlider]);

  const handleFontScaleChange = useCallback(
    (value: number) => {
      dispatch(setFontScale(value));
    },
    [dispatch]
  );

  const handleBackPress = useCallback(() => {
    if (isPlaying) {
      stopPlayback().catch(error => {
        handleError(error);
      });
    }
    pausedAudioStateRef.current = {
      sentenceIndex: null,
      wordId: null,
      position: null,
    };
    setAudioControlVisible(false);
    setAudioSessionActive(false);
    if (audioPlayer.soundRef && audioPlayer.soundRef.current) {
      audioPlayer.soundRef.current.unloadAsync().catch(error => {
        handleError(error);
      });
    }
    isNavigatingRef.current = false;
    dispatch(
      updateAudioState({
        wordId: null,
        position: null,
        isPlaying: false,
        sentenceId: null,
      })
    );
    queryClient.cancelQueries();
    router.back();
  }, [isPlaying, stopPlayback, audioPlayer, router, dispatch, queryClient]);

  const renderWord = useCallback(
    (
      word: SentenceWord,
      isAudioHighlighted = false,
      wordRef?: React.RefObject<ComponentRef<typeof TouchableOpacity>>
    ) => {
      // Check if this word is due for review
      const isDueWord = word.root_id ? dueWordRootIds.has(word.root_id) : false;

      return (
        <ArabicWord
          key={word.id}
          isAudioHighlighted={isAudioHighlighted}
          isDueWord={isDueWord}
          word={word}
          wordRef={wordRef}
          settings={{
            showEnglish: false,
            fontScale: settings.fontScale,
            showTransliteration: false,
            showWordType: false,
          }}
          onPress={() => {
            if (word.root) {
              if (isDueWord) {
                lightFeedback();
              }
              handleRootPress(word.root.id);
            }
          }}
        />
      );
    },
    [dueWordRootIds, handleRootPress, settings.fontScale]
  );

  const renderSentenceItem = useCallback(
    (props: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(props.item.id);
      const isCurrentSentence = props.item.id === currentSentenceId;

      // Create stable settings object
      const sentenceSettings = {
        showEnglish: showEnglishLocal,
        fontScale: settings.fontScale,
        showTransliteration: false,
        showWordType: false,
      };

      return (
        <ArticleSentence
          key={props.item.id}
          colors={colors}
          containerStyle={styles.transparentBackground}
          currentPlayingPosition={isCurrentSentence ? currentPosition : null}
          currentPlayingSentenceId={isCurrentSentence ? currentSentenceId : null}
          currentPlayingWordId={isCurrentSentence ? currentWordId : null}
          renderWord={renderWord}
          settings={sentenceSettings}
          words={words}
          sentence={{
            id: props.item.id,
            english: props.item.english,
            arabic: props.item.arabic,
            audio_url: props.item.audio_url,
          }}
        />
      );
    },
    [
      getWordsForSentence,
      renderWord,
      showEnglishLocal,
      settings.fontScale,
      colors,
      styles.transparentBackground,
      currentSentenceId,
      currentWordId,
      currentPosition,
    ]
  );

  const handleStopPlayback = useCallback(async () => {
    try {
      pausedAudioStateRef.current = {
        sentenceIndex: null,
        wordId: null,
        position: null,
        audioPositionMs: 0,
      };
      setAudioControlVisible(false);
      setAudioSessionActive(false);
      await stopPlayback();
      if (audioPlayer.soundRef && audioPlayer.soundRef.current) {
        try {
          await audioPlayer.soundRef.current.unloadAsync();
        } catch (error) {
          handleError(error as Error);
        }
      }
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

  const handlePlayPress = useCallback(async () => {
    lightFeedback();
    if (audioSessionActive) {
      // Stop audio and close control panel
      await handleStopPlayback();
    } else {
      await handleStartAudio();
    }
  }, [audioSessionActive, handleStopPlayback, handleStartAudio]);

  // Simple pause/resume for audio control panel
  const handleAudioControlPause = useCallback(async () => {
    lightFeedback();
    if (isPlaying) {
      // Just pause, don't stop completely
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
      pausedAudioStateRef.current = {
        sentenceIndex: currentSentenceIndex,
        wordId: currentWordId,
        position: currentPosition,
        audioPositionMs: currentAudioPositionMs,
      };
      await audioPlayer.stopPlayback(false);
      dispatch(
        updateAudioState({
          wordId: currentWordId,
          position: currentPosition,
          isPlaying: false,
          sentenceId: currentSentenceIndex,
        })
      );
    } else {
      // Resume from where we left off
      await handleStartAudio();
    }
  }, [
    isPlaying,
    audioPlayer,
    currentSentenceIndex,
    currentWordId,
    currentPosition,
    dispatch,
    handleStartAudio,
  ]);

  const handleNextSentence = useCallback(async () => {
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    if (currentSentenceIndex === null || !sentenceAudioData.length) {
      isNavigatingRef.current = false;
      return;
    }
    if (currentSentenceIndex < sentenceAudioData.length - 1) {
      try {
        await stopPlayback();
        const nextSentenceIndex = currentSentenceIndex + 1;
        pausedAudioStateRef.current = {
          sentenceIndex: nextSentenceIndex,
          wordId: null,
          position: null,
          audioPositionMs: 0,
        };
        await audioPlayer.preloadAudioFiles(sentenceAudioData);
        const success = await startPlayback(sentenceAudioData, {
          sentenceOffset: nextSentenceIndex,
        });
        if (!success) {
          handleError(new Error('Failed to play next sentence'));
          setAudioControlVisible(false);
        }
      } catch (error) {
        handleError(error as Error);
        setAudioControlVisible(false);
      } finally {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      }
    } else {
      isNavigatingRef.current = false;
    }
  }, [currentSentenceIndex, sentenceAudioData, stopPlayback, startPlayback, audioPlayer]);

  const handlePreviousSentence = useCallback(async () => {
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    lightFeedback();
    if (currentSentenceIndex === null || !sentenceAudioData.length) {
      isNavigatingRef.current = false;
      return;
    }
    if (currentSentenceIndex > 0) {
      try {
        await stopPlayback();
        const prevSentenceIndex = currentSentenceIndex - 1;
        pausedAudioStateRef.current = {
          sentenceIndex: prevSentenceIndex,
          wordId: null,
          position: null,
          audioPositionMs: 0,
        };
        await audioPlayer.preloadAudioFiles(sentenceAudioData);
        const success = await startPlayback(sentenceAudioData, {
          sentenceOffset: prevSentenceIndex,
        });
        if (!success) {
          handleError(new Error('Failed to play previous sentence'));
          setAudioControlVisible(false);
        }
      } catch (error) {
        handleError(error as Error);
        setAudioControlVisible(false);
      } finally {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      }
    } else {
      isNavigatingRef.current = false;
    }
  }, [currentSentenceIndex, sentenceAudioData, stopPlayback, startPlayback, audioPlayer]);

  useEffect(() => {
    stopPlayback?.();
    setAudioControlVisible(false);
    setAudioSessionActive(false);
    pausedAudioStateRef.current = {
      sentenceIndex: null,
      wordId: null,
      position: null,
      audioPositionMs: 0,
    };
    isNavigatingRef.current = false;

    // Reset scroll tracking when article changes
    lastScrolledWordIdRef.current = null;
    lastScrolledSentenceIdRef.current = null;

    // Reset text size slider when article changes
    setShowTextSizeSlider(false);

    dispatch(
      updateAudioState({
        wordId: null,
        position: null,
        isPlaying: false,
        sentenceId: null,
      })
    );
    refetchReadingListStatus?.();
  }, [id]);

  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <StatusBar animated={true} style={isDarkMode ? 'light' : 'dark'} translucent={true} />

      <View style={styles.container}>
        {article && sortedSentences && sortedSentences.length > 0 ? (
          <ArticleContent
            ref={articleContentRef}
            article={article}
            colors={colors}
            englishToggleKey={showEnglishLocal ? 'en' : 'ar'}
            fontScale={settings.fontScale}
            handleScroll={handleScroll}
            id={id}
            isDarkMode={isDarkMode}
            isInReadingList={isInReadingList}
            isPlaying={audioSessionActive}
            otherArticles={otherArticles}
            renderSentenceItem={renderSentenceItem}
            showEnglish={showEnglishLocal}
            showTextSizeSlider={showTextSizeSlider}
            sortedSentences={sortedSentences}
            user={user}
            handleArticlePress={(articleId, isRelated) =>
              handleArticlePress(Number(articleId), isRelated)
            }
            onBackPress={handleBackPress}
            onBookmarkPress={handleBookmarkPress}
            onEnglishToggle={handleEnglishToggle}
            onFontScaleChange={handleFontScaleChange}
            onPlayPress={handlePlayPress}
            onTextSizeToggle={handleTextSizeToggle}
          />
        ) : null}
      </View>
      <AudioControlPanel
        currentSentenceIndex={currentSentenceIndex}
        isPlaying={isPlaying}
        isVisible={audioControlVisible}
        totalSentences={sentenceAudioData.length}
        onNext={handleNextSentence}
        onPlayPause={handleAudioControlPause}
        onPrevious={handlePreviousSentence}
      />
    </ThemedView>
  );
}
