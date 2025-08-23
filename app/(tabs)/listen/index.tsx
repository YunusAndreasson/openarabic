import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@common/EmptyState';
import ListSeparator from '@common/ListSeparator';
import BottomControls from '@listen/BottomControls';

import { ThemedView } from '@/components/ThemedView';
import { ListenListItemCard } from '@/components/listen/ListenListItemCard';
import { useToast } from '@/components/providers/ToastProvider';
import { AUDIO_STATES, type AudioState } from '@/constants/audio';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useListenScreen, useListenUI } from '@/hooks/listen';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useStableBoolean } from '@/hooks/ui/useStableBoolean';
import type { ReadingListItem } from '@/types/readingList.types';
import { generateImageUrl } from '@/utils/imageUtils';
import { overrideFixedHeight } from '@/utils/list';

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
const ItemSeparator = memo(() => <ListSeparator height={LAYOUT.SPACING.MEDIUM} />);

// Memoized key extractor to prevent inline function creation
const keyExtractor = (item: ReadingListItem) => `${item.article_id}`;

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
    // Memoize event handlers to prevent inline function creation
    const handleDelete = useCallback(() => {
      onDelete(item.article_id);
    }, [onDelete, item.article_id]);

    const handlePress = useCallback(() => {
      if (!editMode && audioState !== AUDIO_STATES.PLAYING) {
        onPlayPress(item.article_id);
      }
    }, [editMode, audioState, onPlayPress, item.article_id]);

    const handlePlayPress = useCallback(() => {
      if (!editMode && audioState !== AUDIO_STATES.PLAYING) {
        onPlayPress(item.article_id);
      }
    }, [editMode, audioState, onPlayPress, item.article_id]);

    // Memoize drag handle props to prevent object recreation
    const dragHandleProps = useMemo(() => {
      if (!drag) return undefined;
      return {
        onLongPress: drag,
        delayLongPress: 100,
      };
    }, [drag]);

    return (
      <ListenListItemCard
        author={item.articles.author.name}
        title={item.articles.title}
        editMode={editMode}
        isBeingDragged={_isBeingDragged}
        onDelete={handleDelete}
        // Entire card triggers playback when not in edit mode and not playing
        onPress={!editMode && audioState !== AUDIO_STATES.PLAYING ? handlePress : undefined}
        // Play button also triggers playback, hide when any audio is playing
        onPlayPress={!editMode && audioState !== AUDIO_STATES.PLAYING ? handlePlayPress : undefined}
        // Add article image for playlist-style appearance
        imageUrl={generateImageUrl(item.articles.image_url)}
        dragHandleProps={dragHandleProps}
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

  // STABILIZATION: Add local loading state for PLAY ALL button
  const [isPlayAllLoading, setIsPlayAllLoading] = useState(false);
  const playAllTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // STABILIZATION: Debounced button state to prevent flickering
  const hasArticles = sortedReadingList.length > 0;
  const stableHasArticles = useStableBoolean(hasArticles, 100);

  useEffect(() => {
    if (enhancedTracksError) {
      showToast(STRINGS.FAILED_TO_LOAD_AUDIO_TRACKS, 4000, 'error');
    }
  }, [enhancedTracksError, showToast]);

  // STABILIZATION: handled by useStableBoolean

  // STABILIZATION: Enhanced handlePlayAll with loading state and debouncing
  const handlePlayAllStable = useCallback(async () => {
    // Prevent multiple rapid presses
    if (isPlayAllLoading) return;

    // Clear existing timeout
    if (playAllTimeoutRef.current) {
      clearTimeout(playAllTimeoutRef.current);
    }

    try {
      setIsPlayAllLoading(true);
      await handlePlayAll();
    } finally {
      // Add minimum loading time to prevent flickering
      playAllTimeoutRef.current = setTimeout(() => {
        setIsPlayAllLoading(false);
      }, 500);
    }
  }, [handlePlayAll, isPlayAllLoading]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (playAllTimeoutRef.current) {
        clearTimeout(playAllTimeoutRef.current);
      }
    };
  }, []);

  // Simplified state calculations
  const shouldShowEmpty = !stableHasArticles && canShowEmpty && !isReadingListLoading;

  // Proper spacing accounting for bottom controls and tab bar
  const listContainerStyle = useMemo(
    () => ({
      paddingTop: headerHeight + LAYOUT.SPACING.MEDIUM,
      // Account for BottomControls height + tab bar + safe area when controls are visible
      paddingBottom: stableHasArticles
        ? LAYOUT.BOTTOM_BAR.HEIGHT +
          LAYOUT.SPACING.XLARGE +
          Math.max(insets.bottom, LAYOUT.SPACING.SMALL)
        : LAYOUT.SPACING.MEDIUM,
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    }),
    [headerHeight, stableHasArticles, insets.bottom]
  );

  // STABILIZATION: Memoize bottom controls style with stable conditions
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
      // STABILIZATION: Use stable hasArticles state and prevent rapid opacity changes
      opacity: stableHasArticles ? 1 : 0,
      pointerEvents: stableHasArticles ? ('auto' as const) : ('none' as const),
    }),
    [stableHasArticles]
  );

  // Memoize shared components to prevent recreation
  const EmptyStateComponent = useMemo(
    () =>
      shouldShowEmpty ? (
        <EmptyState
          colors={colors}
          description={STRINGS.PLAYLIST_EMPTY_DESCRIPTION}
          hideArticlesButton={true}
          icon="headset"
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

  // Memoize the key extractor to prevent inline function creation
  const memoizedKeyExtractor = useCallback(keyExtractor, []);

  // Removed FlashList extraData: row components already receive stable props via renderItem

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
            keyExtractor={memoizedKeyExtractor}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            // iOS best practice: Allow natural bounce behavior for tactile feedback
            bounces={true}
            alwaysBounceVertical={true}
            overScrollMode="always"
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={listContainerStyle}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={EmptyStateComponent}
            removeClippedSubviews
            initialNumToRender={6}
            windowSize={7}
          />
        ) : (
          <FlashList<ReadingListItem>
            data={sortedReadingList}
            drawDistance={ITEM_HEIGHT * 3}
            estimatedItemSize={ITEM_HEIGHT}
            estimatedListSize={{ height: ITEM_HEIGHT * 10, width: SCREEN_WIDTH }}
            keyExtractor={memoizedKeyExtractor}
            removeClippedSubviews={true}
            // iOS best practice: Allow natural bounce behavior for tactile feedback
            bounces={true}
            alwaysBounceVertical={true}
            overScrollMode="always"
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={listContainerStyle}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={EmptyStateComponent}
            ListHeaderComponent={null}
            overrideItemLayout={overrideFixedHeight(ITEM_HEIGHT)}
            renderItem={renderItem}
          />
        )}
      </ThemedView>

      {/* STABILIZATION: Bottom controls with stable state and loading indicator */}
      <View style={bottomControlsStyle}>
        <BottomControls
          primaryDisabled={isPlayAllLoading}
          primaryLoading={isPlayAllLoading}
          primaryDisablePressAnimation={true}
          primaryLabel={STRINGS.PLAY_ALL}
          onPrimaryPress={handlePlayAllStable}
        />
      </View>
    </ThemedView>
  );
}
