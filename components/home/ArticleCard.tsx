import { memo, useEffect, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import BaseCard from '@/components/BaseCard';
import { EnhancedImage } from '@/components/EnhancedImage';
import { ProgressCircle } from '@/components/ProgressCircle';
import { ThemedText } from '@/components/ThemedText';
import DeleteButton from '@/components/listen/DeleteButton';
import DragHandle, { type DragHandleProps } from '@/components/listen/DragHandle';
import PlayButton from '@/components/listen/PlayButton';
import { ARTICLE_CARD_SPRING, CARD_DRAG_SCALE, WORD_PRESS_SCALE } from '@/constants/animation';
import { getEnhancedOpacity, LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

// Playlist thumbnail size for elegant music app aesthetic
const PLAYLIST_IMAGE_SIZE = 48;

interface ArticleCardProps {
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
}

export const ArticleCard: FC<ArticleCardProps> = memo(
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
  }) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();
    // Play button icon should be dark in both modes
    const playIconColor = isDarkMode ? colors.black : colors.text;

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
      } else {
        startAnimation();
      }
    }, [editMode, isBeingDragged, startAnimation, setValue]);

    // Enhanced title and author styles with semantic colors
    const titleOpacity = getEnhancedOpacity(
      TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY,
      isDarkMode
    );
    const authorOpacity = getEnhancedOpacity(
      TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY,
      isDarkMode
    );

    // Helper function to get difficulty text
    const getDifficultyText = (level: number): string => {
      if (level <= 2) return STRINGS.BEGINNER;
      if (level === 3) return STRINGS.INTERMEDIATE;
      return STRINGS.ADVANCED;
    };

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
                  style={[styles.titleText, { opacity: titleOpacity }]}
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
                    style={[styles.authorText, { opacity: authorOpacity }]}
                    type="label"
                  >
                    {author}
                    {difficultyLevel && ` • ${getDifficultyText(difficultyLevel)}`}
                  </ThemedText>
                  {hasStartedReading && progressPercentage !== undefined && (
                    <View style={styles.progressContainer}>
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

              {/* Right side content - play button only (no chevron) */}
              {!editMode && onPlayPress && (
                <View style={styles.playButtonContainer}>
                  <PlayButton onPress={onPlayPress} isPlaying={false} iconColor={playIconColor} />
                </View>
              )}
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

ArticleCard.displayName = 'ArticleCard';

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
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.LARGE *
      TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.lineHeightMultiplier,
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
  progressContainer: {
    // Add touch-friendly padding around the progress circle
    padding: LAYOUT.SPACING.TINY,
  },
  progressCircle: {
    // Ensure perfect vertical centering with text using flexbox
    alignSelf: 'center',
  },
});
