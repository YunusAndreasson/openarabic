import { BaseCard } from '@/components/common/BaseCard';
import { ProgressBar } from '@/components/common/ProgressBar';
import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EnhancedImage } from '@/components/ui/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';

import { DeleteButton } from './DeleteButton';
import { DragHandle, type DragHandleProps } from './DragHandle';
import { PlayButton } from './PlayButton';
import {
  FONT_WEIGHTS,
  getEnhancedOpacity,
  LAYOUT,
  TEXT_OPACITY,
  TEXT_STYLES,
} from '@/constants/layout';
import { useEditModeCardAnimation } from '@/hooks/cards';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

// Bookmarks thumbnail size with 4:3 ratio for optimal vertical space in portrait mobile
// Uses centralized constants from layout.ts for consistency
const BOOKMARKS_IMAGE_WIDTH = LAYOUT.CARD.IMAGE.THUMBNAIL.WIDTH;
const BOOKMARKS_IMAGE_HEIGHT = LAYOUT.CARD.IMAGE.THUMBNAIL.HEIGHT;

interface PlaylistItemCardProps {
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

export const PlaylistItemCard: FC<PlaylistItemCardProps> = ({
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
  const colors = useColors();

  // Edit mode animation (scales down when in edit mode or being dragged)
  const { animatedStyle } = useEditModeCardAnimation({
    editMode,
    isBeingDragged,
    shouldAnimateOnMount,
  });

  // Enhanced title and secondary text styles with semantic colors
  const titleOpacity = getEnhancedOpacity(TEXT_OPACITY.PRIMARY, isDarkMode);
  const secondaryOpacity = getEnhancedOpacity(TEXT_OPACITY.SECONDARY, isDarkMode);

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

            <View style={styles.contentWrapper}>
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
            </View>

            {/* Right side content: play button (if available) */}
            {!editMode && onPlayPress && (
              <View style={styles.playButtonContainer}>
                <PlayButton onPress={onPlayPress} />
              </View>
            )}
          </View>

          {/* Reading Progress Indicator - at bottom edge (media app style) */}
          {progressPercentage !== undefined && progressPercentage > 0 && (
            <ProgressBar
              progress={progressPercentage}
              height={LAYOUT.SPACING.TINY}
              fillColor={colors.readingProgressIndicator}
              backgroundColor={colors.readingProgressBackground}
              style={styles.progressBar}
            />
          )}
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

PlaylistItemCard.displayName = 'PlaylistItemCard';

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
    padding: LAYOUT.SPACING.SMALL, // 2025: tighter padding for compact list items
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  textContent: {
    justifyContent: 'center',
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
    letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing,
  },
  secondaryText: {
    fontWeight: FONT_WEIGHTS.MEDIUM,
    letterSpacing: TEXT_STYLES.AUTHOR_BYLINE.letterSpacing,
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
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderBottomRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
    marginRight: LAYOUT.SPACING.SMALL, // 2025: tighter gap between image and text
    alignSelf: 'flex-start',
  },
  thumbnailImage: {
    height: BOOKMARKS_IMAGE_HEIGHT,
    width: BOOKMARKS_IMAGE_WIDTH,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});
