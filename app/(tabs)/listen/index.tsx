import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomControls from '@/components/BottomControls';
import EmptyState from '@/components/EmptyState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ArticleCard } from '@/components/home/ArticleCard';
import NowPlayingCard from '@/components/listen/NowPlayingCard';
import SleepTimer from '@/components/listen/SleepTimer';
import { useToast } from '@/components/providers/ToastProvider';
import { AUDIO_STATES, type AudioState } from '@/constants/audio';
import { LAYOUT } from '@/constants/layout';
import { useListenScreen, useListenUI } from '@/hooks/listen';
import type { ReadingListItem } from '@/hooks/listen/useListenScreen';
import { useColors } from '@/hooks/theme/useColors';
import { useAppSelectorMemo } from '@/store/hooks';
import { selectionFeedback } from '@/utils/haptics';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  footerNote: {
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  footerNoteText: {
    textAlign: 'center',
    opacity: 0.3,
  },
});

// Define a constant for item height calculation
const ITEM_HEIGHT = 120;

// Memory-optimized component for reading list items
const ListenListItem = memo(
  ({
    item,
    isActive,
    editMode,
    onPress,
    onDelete,
    onPlayPress,
    drag,
    _isBeingDragged,
    isStartingPlayback,
    audioState,
  }: {
    item: ReadingListItem;
    isActive: boolean;
    editMode: boolean;
    onPress: (id: number) => void;
    onDelete: (id: number) => void;
    onPlayPress: (id: number) => void;
    drag?: () => void;
    _isBeingDragged?: boolean;
    isStartingPlayback?: boolean;
    audioState: AudioState;
  }) => {
    return (
      <ArticleCard
        author={item.articles.author.name}
        title={item.articles.title}
        editMode={editMode}
        isBeingDragged={_isBeingDragged}
        // Primary action: tap to play audio (when available) or open article (when no audio)
        onPress={!editMode ? () => onPlayPress(item.article_id) : undefined}
        // Secondary action: long press to open article (when not in edit mode)
        onLongPress={!editMode ? () => onPress(item.article_id) : undefined}
        onDelete={() => onDelete(item.article_id)}
        // Show play button as visual indicator when audio is available, but hide when any audio is playing
        onPlayPress={
          !editMode && audioState !== AUDIO_STATES.PLAYING
            ? () => onPlayPress(item.article_id)
            : undefined
        }
        isLoadingAudio={isStartingPlayback && isActive} // Show loading when this article is starting
        dragHandleProps={{
          onLongPress: drag,
          delayLongPress: 100,
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    // Optimize: Check most likely to change first, and use early return pattern
    if (prevProps.editMode !== nextProps.editMode) return false;
    if (prevProps.isActive !== nextProps.isActive) return false;
    if (prevProps._isBeingDragged !== nextProps._isBeingDragged) return false;
    if (prevProps.isStartingPlayback !== nextProps.isStartingPlayback) return false;
    if (prevProps.audioState !== nextProps.audioState) return false;
    // Check if audio availability changed
    if (!!prevProps.item.articles?.audio_url !== !!nextProps.item.articles?.audio_url) return false;
    // Item ID should rarely change, so check last
    return prevProps.item.article_id === nextProps.item.article_id;
  }
);

ListenListItem.displayName = 'ListenListItem';

export default function ListenScreen(): JSX.Element {
  const colors = useColors();
  const editMode = useAppSelectorMemo(state => state.listen.editMode);
  const { showToast } = useToast();

  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [isPlayAllLoading, setIsPlayAllLoading] = useState(false);

  const {
    sortedReadingList,
    sortedEnhancedTracks,
    shouldShowInitialLoading,
    isStartingPlayback,
    setPlaybackMode,
    duration,
    position,
    metadata,
    audioState,
    actions,
    isReadingListLoading,
    isReadingListFetching,
    sleepTimer,
    handleSleepTimerSet,
    handleSleepTimerCancel,
    handlePlayAll,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  } = useListenScreen();

  const listenMetadata = useMemo(
    () => ({
      articleId: metadata.articleId || null,
      articleTitle: metadata.articleTitle || null,
    }),
    [metadata.articleId, metadata.articleTitle]
  );

  const {
    canShowEmpty,
    flashListExtraData,
    currentArticle,
    handleArticlePress,
    handleNowPlayingPress,
    handleDragEnd,
  } = useListenUI({
    sortedReadingList,
    metadata: listenMetadata,
    audioState,
    isStartingPlayback,
  });

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    if (enhancedTracksError) {
      showToast('Failed to load audio tracks', 4000, 'error');
    }
  }, [enhancedTracksError, showToast]);

  // Check if we have any texts to show controls for
  const hasArticles = sortedReadingList.length > 0;

  // Check if we have any articles with audio available
  const hasAudioArticles = sortedEnhancedTracks.length > 0;

  // Check if player should be visible (when playing or stopped with content)
  const shouldShowPlayer = useMemo(() => {
    return (
      (audioState === AUDIO_STATES.PLAYING || audioState === AUDIO_STATES.STOPPED) &&
      !!currentArticle
    );
  }, [audioState, currentArticle]);

  // Since data is preloaded, only show empty state when we definitively have no articles
  // and we've waited long enough to prevent flashing
  const shouldShowEmpty =
    !hasArticles && canShowEmpty && !isReadingListLoading && !isReadingListFetching;

  const listContainerStyle = useMemo(
    () => ({
      paddingTop: headerHeight + LAYOUT.SPACING.MEDIUM,
      paddingBottom: hasArticles
        ? insets.bottom +
          LAYOUT.BOTTOM_BAR.HEIGHT +
          LAYOUT.SPACING.TINY +
          (shouldShowPlayer ? 120 + LAYOUT.SPACING.TINY : LAYOUT.SPACING.TINY)
        : insets.bottom + LAYOUT.SPACING.TINY,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    }),
    [headerHeight, insets.bottom, hasArticles, shouldShowPlayer]
  );

  // Render item for both FlashList and DraggableFlatList
  const renderItem: (
    params: { item: ReadingListItem; index?: number } | RenderItemParams<ReadingListItem>
  ) => JSX.Element = useCallback(
    params => {
      const { item } = params;
      const isActive =
        audioState === AUDIO_STATES.PLAYING &&
        !!metadata.articleId &&
        parseInt(metadata.articleId ?? '', 10) === item.article_id;

      if (editMode && 'drag' in params) {
        // DraggableFlatList render
        const { drag, isActive: isDragging } = params;
        return (
          <ListenListItem
            isActive={isActive}
            editMode={editMode}
            item={item}
            onPress={handleArticlePress}
            onDelete={handleDelete}
            onPlayPress={handleArticlePlay}
            drag={drag}
            _isBeingDragged={isDragging}
            isStartingPlayback={isStartingPlayback}
            audioState={audioState}
          />
        );
      } else {
        // FlashList render
        return (
          <ListenListItem
            isActive={isActive}
            editMode={editMode}
            item={item}
            onPress={handleArticlePress}
            onDelete={handleDelete}
            onPlayPress={handleArticlePlay}
            isStartingPlayback={isStartingPlayback}
            audioState={audioState}
          />
        );
      }
    },
    [
      audioState,
      metadata.articleId,
      editMode,
      handleArticlePress,
      handleDelete,
      handleArticlePlay,
      isStartingPlayback,
    ]
  );

  // Show loading screen only during initial uncached load
  if (shouldShowInitialLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator color={colors.tint} size="large" />
        <ThemedText style={{ marginTop: LAYOUT.SPACING.MEDIUM }}>Loading your playlist</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView includeBottomInset={false} style={styles.flexOne} useSafeArea={false}>
        {editMode ? (
          // Use DraggableFlatList in edit mode
          (<DraggableFlatList<ReadingListItem>
            data={sortedReadingList}
            keyExtractor={item => `${item.article_id}`}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={listContainerStyle}
            ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />}
            ListEmptyComponent={
              shouldShowEmpty ? (
                <EmptyState
                  colors={colors}
                  description="Your listening playlist is empty"
                  icon="headset-outline"
                  iconSize={72}
                  submessage="Bookmark articles from the Read tab to build your playlist"
                  title="No Articles Saved"
                  containerStyle={{
                    paddingTop: LAYOUT.SPACING.XLARGE,
                    paddingBottom: LAYOUT.SPACING.LARGE,
                  }}
                />
              ) : null
            }
            ListFooterComponent={
              hasArticles ? (
                <View style={styles.footerNote}>
                  <ThemedText style={styles.footerNoteText} type="caption" variant="secondary">
                    Long press to open article for reading
                  </ThemedText>
                </View>
              ) : null
            }
          />)
        ) : (
          // Use FlashList in normal mode
          (<FlashList<ReadingListItem>
            data={sortedReadingList}
            drawDistance={ITEM_HEIGHT * 5}
            estimatedItemSize={ITEM_HEIGHT}
            extraData={flashListExtraData}
            keyExtractor={item => `${item.article_id}`}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={listContainerStyle}
            ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />}
            ListEmptyComponent={
              shouldShowEmpty ? (
                <EmptyState
                  colors={colors}
                  description="Your listening playlist is empty"
                  icon="headset-outline"
                  iconSize={72}
                  submessage="Bookmark articles from the Read tab to build your playlist"
                  title="No Articles Saved"
                  containerStyle={{
                    paddingTop: LAYOUT.SPACING.XLARGE,
                    paddingBottom: LAYOUT.SPACING.LARGE,
                  }}
                />
              ) : null
            }
            ListHeaderComponent={null}
            ListFooterComponent={
              hasArticles ? (
                <View style={styles.footerNote}>
                  <ThemedText style={styles.footerNoteText} type="caption" variant="secondary">
                    Long press to open article for reading
                  </ThemedText>
                </View>
              ) : null
            }
            overrideItemLayout={layout => {
              layout.size = ITEM_HEIGHT;
            }}
            renderItem={renderItem}
          />)
        )}
      </ThemedView>
      {/* Only show bottom controls when there are texts with audio to play but no active player */}
      {hasArticles && hasAudioArticles && !shouldShowPlayer && !isStartingPlayback && (
        <BottomControls
          primaryDisabled={isPlayAllLoading}
          primaryLoading={isPlayAllLoading}
          primaryDisablePressAnimation={true}
          primaryLabel="Play All"
          primaryVariant="filled"
          showTimerButton={false}
          primaryAccessibilityLabel="Play all texts"
          onPrimaryPress={() => handlePlayAll(setIsPlayAllLoading)}
        />
      )}
      {/* Now Playing Card - shows when starting playback or playing */}
      <NowPlayingCard
        article={currentArticle}
        duration={isStartingPlayback ? 0 : duration * 1000}
        isTimerActive={sleepTimer.state.isActive}
        isVisible={
          shouldShowPlayer ||
          isStartingPlayback ||
          (audioState === AUDIO_STATES.LOADING && !!metadata.articleId)
        }
        progress={isStartingPlayback ? 0 : position * 1000}
        showTimerButton={true}
        onPress={handleNowPlayingPress}
        onStop={() => {
          selectionFeedback();
          if (isStartingPlayback) {
            // If still starting, allow canceling
            setPlaybackMode('none');
          }
          actions.stopPlayback();
        }}
        onTimerPress={() => {
          selectionFeedback();
          setShowSleepTimer(true);
        }}
      />
      {/* Sleep Timer Modal - only show when there are texts and timer is active/visible */}
      {hasArticles && (
        <SleepTimer
          isActive={sleepTimer.state.isActive}
          isVisible={showSleepTimer}
          remainingTime={sleepTimer.state.remainingTime}
          onClose={() => setShowSleepTimer(false)}
          onTimerCancel={handleSleepTimerCancel}
          onTimerSet={handleSleepTimerSet}
        />
      )}
    </ThemedView>
  );
}
