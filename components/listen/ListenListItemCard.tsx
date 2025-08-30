import { memo, useEffect, useMemo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import BaseCard from '@common/BaseCard';
import { ProgressCircle } from '@common/ProgressCircle';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import DeleteButton from '@/components/listen/DeleteButton';
import DragHandle, { type DragHandleProps } from '@/components/listen/DragHandle';
import PlayButton from '@/components/listen/PlayButton';
import { ARTICLE_CARD_SPRING, CARD_DRAG_SCALE, WORD_PRESS_SCALE } from '@/constants/animation';
import { Theme } from '@/constants/colors';
import { getEnhancedOpacity, LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useCurrentTheme, useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { difficultyLevelToLabel } from '@/utils/articles/difficulty';

// Playlist thumbnail size for elegant music app aesthetic
const PLAYLIST_IMAGE_SIZE = 48;

interface ListenListItemCardProps {
  title: string;
  author: string;
  difficultyLevel?: number;
  onPress?: () => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: DragHandleProps;
  isBeingDragged?: boolean;
  // Play button props
  onPlayPress?: () => void;
  // Image for playlist-style display
  imageUrl?: string;
  // Reading progress
  progressPercentage?: number;
  hasStartedReading?: boolean;
  // Avoid running mount animations when rendering many list items at once
  shouldAnimateOnMount?: boolean;
}

export const ListenListItemCard: FC<ListenListItemCardProps> = memo(
  ({
    title,
    author,
    difficultyLevel,
    onPress,
    editMode = false,
    onDelete,
    dragHandleProps,
    isBeingDragged = false,
    onPlayPress,
    imageUrl,
    progressPercentage,
    hasStartedReading,
    shouldAnimateOnMount = true,
  }) => {
    const isDarkMode = useIsDarkMode();
    const currentTheme = useCurrentTheme();
    const colors = useColors();
    // Play button icon should be dark in both modes, but white in sepia for better contrast
    const playIconColor =
      currentTheme === Theme.Sepia ? colors.white : isDarkMode ? colors.black : colors.text;

    const { animatedStyle, startAnimation, setValue } = useTransformAnimation({
      type: 'scale',
      initialValue: 1,
      targetValue: 1,
      useSpring: true,
      damping: ARTICLE_CARD_SPRING.damping,
      stiffness: ARTICLE_CARD_SPRING.stiffness,
    });

    useEffect(() => {
      if (isBeingDragged) {
        setValue(CARD_DRAG_SCALE);
      } else if (editMode) {
        setValue(WORD_PRESS_SCALE);
      } else if (shouldAnimateOnMount) {
        startAnimation();
      } else {
        // Ensure we are at the target value without triggering an animation
        setValue(1);
      }
    }, [editMode, isBeingDragged, shouldAnimateOnMount, startAnimation, setValue]);

    // Enhanced title and author styles with semantic colors
    const titleOpacity = getEnhancedOpacity(
      TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY,
      isDarkMode
    );
    const authorOpacity = getEnhancedOpacity(
      TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY,
      isDarkMode
    );

    // Memoize dynamic styles for better performance
    const titleTextStyle = useMemo(
      () => [styles.titleText, { opacity: titleOpacity }],
      [titleOpacity]
    );

    const authorTextStyle = useMemo(
      () => [styles.authorText, { opacity: authorOpacity }],
      [authorOpacity]
    );

    // Helper function to get difficulty text
    const getDifficultyText = (level: number): string => difficultyLevelToLabel(level, STRINGS);

    return (
      <Animated.View style={[styles.cardContainer, animatedStyle]}>
        {/* Drag Handle - shows on left in edit mode */}
        {editMode && dragHandleProps && (
          <View style={styles.dragHandleContainer}>
            <DragHandle
              onLongPress={dragHandleProps.onLongPress}
              delayLongPress={dragHandleProps.delayLongPress}
            />
          </View>
        )}

        <View style={styles.cardWrapper}>
          <BaseCard shadowSize="small" onPress={editMode ? undefined : onPress}>
            <View style={styles.cardContent}>
              {/* Article thumbnail - playlist style */}
              {imageUrl && (
                <View style={styles.imageContainer}>
                  <EnhancedImage
                    source={imageUrl}
                    style={styles.thumbnailImage}
                    cachePolicy="memory-disk"
                    transition={0}
                    recyclingKey={imageUrl}
                  />
                </View>
              )}

              <View style={styles.textContent}>
                <ThemedText
                  colorName="headingText"
                  style={titleTextStyle}
                  type="heading3"
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {title}
                </ThemedText>
                <View style={styles.authorRow}>
                  <ThemedText
                    skipDefaultColor
                    colorName="authorText"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={authorTextStyle}
                    type="label"
                  >
                    {author}
                    {difficultyLevel && ` • ${getDifficultyText(difficultyLevel)}`}
                  </ThemedText>
                </View>
              </View>

              {/* Right side content: play button (if available) and progress status */}
              <View style={styles.rightSideContainer}>
                {!editMode && onPlayPress && (
                  <View style={styles.playButtonContainer}>
                    <PlayButton onPress={onPlayPress} isPlaying={false} iconColor={playIconColor} />
                  </View>
                )}
                {hasStartedReading && progressPercentage !== undefined && (
                  <View style={styles.progressRightContainer}>
                    <ProgressCircle
                      percentage={progressPercentage}
                      size={28}
                      strokeWidth={4}
                      style={styles.progressCircle}
                    />
                  </View>
                )}
              </View>
            </View>
          </BaseCard>
        </View>

        {/* Delete Button - shows on right in edit mode */}
        {editMode && onDelete && (
          <View style={styles.deleteButtonContainer}>
            <DeleteButton onPress={onDelete} />
          </View>
        )}
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.title === nextProps.title &&
      prevProps.author === nextProps.author &&
      prevProps.difficultyLevel === nextProps.difficultyLevel &&
      prevProps.editMode === nextProps.editMode &&
      prevProps.isBeingDragged === nextProps.isBeingDragged &&
      prevProps.imageUrl === nextProps.imageUrl &&
      prevProps.progressPercentage === nextProps.progressPercentage &&
      prevProps.hasStartedReading === nextProps.hasStartedReading &&
      prevProps.onPress === nextProps.onPress &&
      prevProps.onDelete === nextProps.onDelete &&
      prevProps.onPlayPress === nextProps.onPlayPress &&
      prevProps.dragHandleProps === nextProps.dragHandleProps
    );
  }
);

ListenListItemCard.displayName = 'ListenListItemCard';

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  cardWrapper: {
    flex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    minHeight: LAYOUT.CARD.HEIGHT.LIST_ITEM,
    padding: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
  },
  authorText: {
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  playButtonContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  rightSideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  progressRightContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  dragHandleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  deleteButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: LAYOUT.SPACING.SMALL,
  },
  imageContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  thumbnailImage: {
    height: PLAYLIST_IMAGE_SIZE,
    width: PLAYLIST_IMAGE_SIZE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  progressCircle: {
    // Ensure perfect vertical centering with text using flexbox
    alignSelf: 'center',
  },
});
