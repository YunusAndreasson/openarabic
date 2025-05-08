/* eslint-disable react-native/no-unused-styles */
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { ComponentRef, JSX } from 'react';
import { StyleSheet, View, AppState } from 'react-native';
import type { TouchableOpacity } from 'react-native';

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
import { useHeaderVisibility } from '@/hooks/useHeaderVisibility';

import type { Article } from '../../types/articles.types';

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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const settings = useAppSelector(state => state.settings);
  const isDarkMode = useIsDarkMode();
  const queryClient = useQueryClient();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { isHeaderVisible, handleScroll, animatedStyle } = useHeaderVisibility();

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
    otherCategoryArticles,
    refetchStudyWords,
  } = useArticleData(articleId, user?.id);

  useEffect(() => {
    if (user?.id) {
      queryClient.fetchQuery({
        queryKey: ['studyWords', user.id],
        queryFn: () => studyWordsFSRSService.getFSRSWords(user.id),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2,
      });
    }
  }, [user, queryClient]);

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

  const backButtonStyle = animatedStyle;
  const bookmarkButtonStyle = animatedStyle;
  const playButtonStyle = animatedStyle;

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

  const articleContentRef = useRef<ArticleContentRef>(null);

  // Compute initialBookmarkIcon based on isInReadingList
  const initialBookmarkIcon: 'bookmark-outline' | 'bookmark' = isInReadingList
    ? 'bookmark'
    : 'bookmark-outline';

  const { handleToggleReadingList, handleRootPress } = useArticleMutations(
    user?.id,
    refetchReadingListStatus,
    refetchStudyWords
  );

  // Correct word press handler for useArticleRenderers
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

  useEffect(() => {
    if (!currentWordId || !articleContentRef.current || !sentenceWordsMap) {
      return;
    }
    const word = findWordById(currentWordId, sentenceWordsMap as SentenceWordsMap);
    if (!word) {
      return;
    }
    articleContentRef.current.scrollToSentence(word.sentence_id);
  }, [currentWordId, sentenceWordsMap, findWordById]);

  const isLoading = useMemo(() => {
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

  const [audioControlVisible, setAudioControlVisible] = useState(false);
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

  const handlePauseAudio = useCallback(async () => {
    try {
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
    } catch (error) {
      handleError(error as Error);
    }
  }, [audioPlayer, currentSentenceIndex, currentWordId, currentPosition, dispatch]);

  const handleStartAudio = useCallback(async () => {
    try {
      setAudioControlVisible(true);
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

  const handlePlayPress = useCallback(async () => {
    lightFeedback();
    if (isPlaying) {
      await handlePauseAudio();
    } else {
      await handleStartAudio();
    }
  }, [isPlaying, handlePauseAudio, handleStartAudio]);

  const handleBookmarkPress = useCallback(() => {
    if (articleId) {
      lightFeedback();
      handleToggleReadingList(articleId, Boolean(isInReadingList));
    }
  }, [articleId, isInReadingList, handleToggleReadingList]);

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

  const renderSentenceItem = useCallback(
    (props: { item: Tables<'article_sentences'> }) => {
      const words = getWordsForSentence(props.item.id);
      const isCurrentSentence = props.item.id === currentSentenceIndex;
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
          colors={colors}
          containerStyle={styles.transparentBackground}
          currentPlayingSentenceId={isCurrentSentence ? currentSentenceIndex : null}
          currentPlayingWordId={isCurrentSentence ? currentWordId : null}
          currentPlayingPosition={isCurrentSentence ? currentPosition : null}
        />
      );
    },
    [
      getWordsForSentence,
      renderWord,
      settings,
      colors,
      styles.transparentBackground,
      currentSentenceIndex,
      currentWordId,
      currentPosition,
    ]
  );

  const renderArticleCard = useCallback(
    (articleData: Article) => (
      <ThemedCard
        key={articleData.id}
        variant="compact"
        article={articleData}
        onPress={() => handleArticlePress(Number(articleData.id), true)}
      />
    ),
    [handleArticlePress]
  );

  const handleStopPlayback = useCallback(async () => {
    lightFeedback();
    try {
      pausedAudioStateRef.current = {
        sentenceIndex: null,
        wordId: null,
        position: null,
        audioPositionMs: 0,
      };
      setAudioControlVisible(false);
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

  const handleNextSentence = useCallback(async () => {
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    lightFeedback();
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
    pausedAudioStateRef.current = {
      sentenceIndex: null,
      wordId: null,
      position: null,
      audioPositionMs: 0,
    };
    isNavigatingRef.current = false;
    dispatch(
      updateAudioState({
        wordId: null,
        position: null,
        isPlaying: false,
        sentenceId: null,
      })
    );
    refetchReadingListStatus?.();
    refetchStudyWords?.();
  }, [id]);

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
            otherArticles={otherArticles}
            otherCategoryArticles={otherCategoryArticles}
            renderArticleCard={renderArticleCard}
            currentPlayingSentenceId={currentSentenceIndex}
            handleArticlePress={(articleId, isRelated) =>
              handleArticlePress(Number(articleId), isRelated)
            }
          />
        ) : null}
      </View>
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
