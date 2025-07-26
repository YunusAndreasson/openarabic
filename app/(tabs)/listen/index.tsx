import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useMemo } from 'react';
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

// Memoized separator component for both DraggableFlatList and FlashList
const ItemSeparator = () => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />;

// Memoized list item with optimized comparison
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
        // Entire card triggers playback when not in edit mode and not playing
        onPress={
          !editMode && audioState !== AUDIO_STATES.PLAYING
            ? () => onPlayPress(item.article_id)
            : undefined
        }
        // Play button also triggers playback, hide when any audio is playing
        onPlayPress={
          !editMode && audioState !== AUDIO_STATES.PLAYING
            ? () => onPlayPress(item.article_id)
            : undefined
        }
        // Add article image for playlist-style appearance
        imageUrl={String(item.articles.image_url)}
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
  const { editMode, reset } = useEditMode('listen');
  const { showToast } = useToast();

  // Reset edit mode when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Reset edit mode when navigating away from the screen
        if (editMode) {
          reset();
        }
      };
    }, [editMode, reset])
  );

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
  const { canShowEmpty, handleDragEnd } = useListenUI({
    sortedReadingList,
    editMode,
  });

  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (enhancedTracksError) {
      showToast(STRINGS.FAILED_TO_LOAD_AUDIO_TRACKS, 4000, 'error');
    }
  }, [enhancedTracksError, showToast]);

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

  // Memoize bottom controls style to prevent recreating object on every render
  const bottomControlsStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      // Compensate for BottomControls internal padding (MEDIUM=12px + SMALL=8px = 20px)
      bottom:
        LAYOUT.BOTTOM_BAR.HEIGHT +
        LAYOUT.SPACING.TINY -
        LAYOUT.SPACING.MEDIUM -
        LAYOUT.SPACING.SMALL, // 4px - 12px - 8px = -16px above tab bar
      left: 0,
      right: 0,
      opacity: hasArticles ? 1 : 0,
      pointerEvents: hasArticles ? ('auto' as const) : ('none' as const),
    }),
    [hasArticles]
  );

  // Memoize shared components to prevent recreation
  const EmptyStateComponent = useMemo(
    () =>
      shouldShowEmpty ? (
        <EmptyState
          colors={colors}
          description={STRINGS.PLAYLIST_EMPTY_DESCRIPTION}
          icon="headset-outline"
          iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
          title={STRINGS.PLAYLIST_EMPTY_TITLE}
          containerStyle={{
            paddingTop: LAYOUT.SPACING.XLARGE,
            paddingBottom: LAYOUT.SPACING.LARGE,
          }}
        />
      ) : null,
    [shouldShowEmpty, colors]
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
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={EmptyStateComponent}
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
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={EmptyStateComponent}
            ListHeaderComponent={null}
            overrideItemLayout={layout => {
              layout.size = ITEM_HEIGHT;
            }}
            renderItem={renderItem}
          />
        )}
      </ThemedView>

      {/* Bottom controls positioned above tab bar to match mini-player location */}
      <View style={bottomControlsStyle}>
        <BottomControls
          primaryDisabled={false}
          primaryLoading={false}
          primaryDisablePressAnimation={true}
          primaryLabel={STRINGS.PLAY_ALL}
          primaryVariant="filled"
          showTimerButton={false}
          onPrimaryPress={handlePlayAll}
        />
      </View>
    </ThemedView>
  );
}
