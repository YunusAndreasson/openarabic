import { BaseCard } from '@common/BaseCard';
import { ProgressCircle } from '@common/ProgressCircle';
import { useEffect, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';


import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import DeleteButton from '@/components/bookmarks/DeleteButton';
import DragHandle, { type DragHandleProps } from '@/components/bookmarks/DragHandle';
import PlayButton from '@/components/bookmarks/PlayButton';
import { CARD_DRAG_SCALE, SPRING_CONFIG, WORD_PRESS_SCALE } from '@/constants/animation';
import { getEnhancedOpacity, LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useTransformAnimation } from '@/hooks/animations';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

// Bookmarks thumbnail size for elegant music app aesthetic
const BOOKMARKS_IMAGE_SIZE = 48;

interface ListenListItemCardProps {
  title: string;
  secondaryText: string;
  onPress?: () => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: DragHandleProps;
  isBeingDragged?: boolean;
  // Play button props
  onPlayPress?: () => void;
  // Image for bookmarks-style display
  imageUrl?: string;
  // Unique article ID for recycling key
  articleId?: number;
  // Reading progress - always shown (0% = not started)
  progressPercentage?: number;
  // Avoid running mount animations when rendering many list items at once
  shouldAnimateOnMount?: boolean;
}

export const ListenListItemCard: FC<ListenListItemCardProps> = ({
  title,
  secondaryText,
  onPress,
  editMode = false,
  onDelete,
  dragHandleProps,
  isBeingDragged = false,
  onPlayPress,
  imageUrl,
  articleId,
  progressPercentage,
  shouldAnimateOnMount = true,
}) => {
    const isDarkMode = useIsDarkMode();

    const { animatedStyle, startAnimation, setValue } = useTransformAnimation({
      type: 'scale',
      initialValue: 1,
      targetValue: 1,
      useSpring: true,
      damping: SPRING_CONFIG.RESPONSIVE.damping,
      stiffness: SPRING_CONFIG.RESPONSIVE.stiffness,
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

  // Enhanced title and secondary text styles with semantic colors
  const titleOpacity = getEnhancedOpacity(
    TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY,
    isDarkMode
  );
  const secondaryOpacity = getEnhancedOpacity(
    TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY,
    isDarkMode
  );

  // Dynamic styles
  const titleTextStyle = [styles.titleText, { opacity: titleOpacity }];

  const secondaryTextStyle = [styles.secondaryText, { opacity: secondaryOpacity }];

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
            {/* Article thumbnail - bookmarks style */}
            {imageUrl && (
              <View style={styles.imageContainer}>
                <EnhancedImage
                  source={imageUrl}
                  style={styles.thumbnailImage}
                  transition={150}
                  recyclingKey={articleId ? `article-${articleId}` : imageUrl}
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
              <View style={styles.secondaryRow}>
                <ThemedText
                  skipDefaultColor
                  colorName="authorText"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={secondaryTextStyle}
                  type="label"
                >
                  {secondaryText}
                </ThemedText>
              </View>
            </View>

            {/* Right side content: play button (if available) and progress status */}
            <View style={styles.rightSideContainer}>
              {!editMode && onPlayPress && (
                <View style={styles.playButtonContainer}>
                  <PlayButton onPress={onPlayPress} />
                </View>
              )}
              <View style={styles.progressRightContainer}>
                <ProgressCircle
                  percentage={progressPercentage ?? 0}
                  size={28}
                  strokeWidth={4}
                  style={styles.progressCircle}
                />
              </View>
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
};

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
  secondaryText: {
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
    flex: 1,
  },
  secondaryRow: {
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
    height: BOOKMARKS_IMAGE_SIZE,
    width: BOOKMARKS_IMAGE_SIZE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  progressCircle: {
    // Ensure perfect vertical centering with text using flexbox
    alignSelf: 'center',
  },
});
