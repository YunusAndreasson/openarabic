import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomControls from '@/components/BottomControls';
import EmptyState from '@/components/EmptyState';
import { ThemedView } from '@/components/ThemedView';
import { ArticleCard } from '@/components/home/ArticleCard';
import { useToast } from '@/components/providers/ToastProvider';
import { AUDIO_STATES, type AudioState } from '@/constants/audio';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useListenScreen, useListenUI } from '@/hooks/listen';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import type { ReadingListItem } from '@/types/readingList.types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
});

// Use responsive height calculation instead of hardcoded value
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.AUDIO_ITEM;

// Optimized component - removed loading states and simplified props
const ListenListItem = memo(
  ({
    item,
    editMode,
    onDelete,
    onPlayPress,
    drag,
    _isBeingDragged,
    audioState,
  }: {
    item: ReadingListItem;
    editMode: boolean;
    onDelete: (id: number) => void;
    onPlayPress: (id: number) => void;
    drag?: () => void;
    _isBeingDragged?: boolean;
    audioState: AudioState;
  }) => {
    return (
      <ArticleCard
        author={item.articles.author.name}
        title={item.articles.title}
        editMode={editMode}
        isBeingDragged={_isBeingDragged}
        onDelete={() => onDelete(item.article_id)}
        // Only play button triggers playback, hide when any audio is playing
        onPlayPress={
          !editMode && audioState !== AUDIO_STATES.PLAYING
            ? () => onPlayPress(item.article_id)
            : undefined
        }
        {...(drag
          ? {
              dragHandleProps: {
                onLongPress: drag,
                delayLongPress: 100,
              },
            }
          : {})}
      />
    );
  },
  (prevProps, nextProps) => {
    // Optimized comparison: only check props that actually change
    if (prevProps.editMode !== nextProps.editMode) return false;
    if (prevProps._isBeingDragged !== nextProps._isBeingDragged) return false;
    if (prevProps.audioState !== nextProps.audioState) return false;
    return prevProps.item.article_id === nextProps.item.article_id;
  }
);

ListenListItem.displayName = 'ListenListItem';

export default function ListenScreen(): JSX.Element {
  const colors = useColors(); // Only used for EmptyState
  const { editMode } = useEditMode('listen');
  const { showToast } = useToast();
  const hasNavigatedToModal = useRef(false);

  // Add audioPlayer for modal guard
  const audioPlayer = useSimpleAudioPlayer();

  // Simplified destructuring - only get what we actually use
  const {
    sortedReadingList,
    audioState,
    isReadingListLoading,
    handlePlayAll,
    handleArticlePlay,
    handleDelete,
    enhancedTracksError,
  } = useListenScreen();

  // Simplified UI hook call - removed unused parameters
  const { canShowEmpty, handleNowPlayingPress, handleDragEnd } = useListenUI({
    sortedReadingList,
    editMode,
  });

  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  // Auto-navigate to modal when audio starts playing from other sources
  useEffect(() => {
    // Only open Now Playing modal if the playing article is in the reading list (Listen screen context)
    const currentArticleId = audioPlayer?.metadata?.articleId
      ? parseInt(audioPlayer.metadata.articleId, 10)
      : null;
    const isFromReadingList = sortedReadingList.some(item => item.article_id === currentArticleId);

    if (audioState === AUDIO_STATES.PLAYING && !hasNavigatedToModal.current && isFromReadingList) {
      hasNavigatedToModal.current = true;
      handleNowPlayingPress();
    }

    if (audioState === AUDIO_STATES.IDLE) {
      hasNavigatedToModal.current = false;
    }
  }, [audioState, handleNowPlayingPress, sortedReadingList, audioPlayer?.metadata?.articleId]);

  useEffect(() => {
    if (enhancedTracksError) {
      showToast(STRINGS.FAILED_TO_LOAD_AUDIO_TRACKS, 4000, 'error');
    }
  }, [enhancedTracksError, showToast]);

  // Optimized Play All handler - open modal immediately
  const handlePlayAllWithModal = useCallback(async () => {
    hasNavigatedToModal.current = true;
    handleNowPlayingPress();
    await handlePlayAll();
  }, [handlePlayAll, handleNowPlayingPress]);

  // Simplified state calculations
  const hasArticles = sortedReadingList.length > 0;
  const shouldShowEmpty = !hasArticles && canShowEmpty && !isReadingListLoading;

  // Proper spacing accounting for bottom controls and tab bar
  const listContainerStyle = useMemo(
    () => ({
      paddingTop: headerHeight + LAYOUT.SPACING.MEDIUM,
      // Account for BottomControls height + tab bar + safe area when controls are visible
      paddingBottom: hasArticles
        ? LAYOUT.BOTTOM_BAR.HEIGHT +
          LAYOUT.SPACING.XLARGE +
          Math.max(insets.bottom, LAYOUT.SPACING.SMALL)
        : LAYOUT.SPACING.MEDIUM,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    }),
    [headerHeight, hasArticles, insets.bottom]
  );

  // Optimized render function - simplified logic
  const renderItem = useCallback(
    (params: { item: ReadingListItem; index?: number } | RenderItemParams<ReadingListItem>) => {
      const { item } = params;

      if (editMode && 'drag' in params) {
        const { drag, isActive: isDragging } = params;
        return (
          <ListenListItem
            editMode={editMode}
            item={item}
            onDelete={handleDelete}
            onPlayPress={handleArticlePlay}
            drag={drag}
            _isBeingDragged={isDragging}
            audioState={audioState}
          />
        );
      } else {
        return (
          <ListenListItem
            editMode={editMode}
            item={item}
            onDelete={handleDelete}
            onPlayPress={handleArticlePlay}
            audioState={audioState}
          />
        );
      }
    },
    [audioState, editMode, handleDelete, handleArticlePlay]
  );

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView includeBottomInset={false} style={styles.flexOne} useSafeArea={false}>
        {editMode ? (
          <DraggableFlatList<ReadingListItem>
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
                  description={STRINGS.LISTENING_PLAYLIST_EMPTY}
                  icon="headset-outline"
                  iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
                  submessage="Save articles from Read to build your playlist"
                  title={STRINGS.NO_ARTICLES_SAVED}
                  containerStyle={{
                    paddingTop: LAYOUT.SPACING.XLARGE,
                    paddingBottom: LAYOUT.SPACING.LARGE,
                  }}
                />
              ) : null
            }
          />
        ) : (
          <FlashList<ReadingListItem>
            data={sortedReadingList}
            drawDistance={ITEM_HEIGHT * 5}
            estimatedItemSize={ITEM_HEIGHT}
            extraData={{ audioState, editMode }} // Simplified extraData
            keyExtractor={item => `${item.article_id}`}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={listContainerStyle}
            ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />}
            ListEmptyComponent={
              shouldShowEmpty ? (
                <EmptyState
                  colors={colors}
                  description={STRINGS.LISTENING_PLAYLIST_EMPTY}
                  icon="headset-outline"
                  iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
                  submessage="Save articles from Read to build your playlist"
                  title={STRINGS.NO_ARTICLES_SAVED}
                  containerStyle={{
                    paddingTop: LAYOUT.SPACING.XLARGE,
                    paddingBottom: LAYOUT.SPACING.LARGE,
                  }}
                />
              ) : null
            }
            ListHeaderComponent={null}
            overrideItemLayout={layout => {
              layout.size = ITEM_HEIGHT;
            }}
            renderItem={renderItem}
          />
        )}
      </ThemedView>

      {/* Bottom controls positioned above tab bar */}
      <View
        style={{
          position: 'absolute',
          bottom: LAYOUT.BOTTOM_BAR.HEIGHT, // Position above tab bar
          left: 0,
          right: 0,
          opacity: hasArticles ? 1 : 0,
          pointerEvents: hasArticles ? 'auto' : 'none',
        }}
      >
        <BottomControls
          primaryDisabled={false}
          primaryLoading={false}
          primaryDisablePressAnimation={true}
          primaryLabel={STRINGS.PLAY_ALL}
          primaryVariant="filled"
          showTimerButton={false}
          onPrimaryPress={handlePlayAllWithModal}
        />
      </View>
    </ThemedView>
  );
}
