import { BaseCard, ProgressBar } from '@/components/common';
import { memo, type ComponentType } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EnhancedImage, IconButton } from '@/components/ui';
import { ThemedText } from '@/components/primitives/ThemedText';

import { DragHandle, type DragHandleProps } from './DragHandle';
import { TIMING_CONSTANTS } from '@/constants/animation';
import { STRINGS } from '@/constants/strings';
import { FONTS } from '@/constants/fonts';
import { getEnhancedOpacity, LAYOUT, TEXT_OPACITY, TEXT_STYLES } from '@/constants/layout';
import { useEditModeCardAnimation } from '@/hooks/cards';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { PressableLikeProps } from '@/types/ui/base.types';

// Bookmarks thumbnail size with 4:3 ratio for optimal vertical space in portrait mobile
// Uses centralized constants from layout.ts for consistency
const BOOKMARKS_IMAGE_WIDTH = LAYOUT.CARD.IMAGE.THUMBNAIL.WIDTH;
const BOOKMARKS_IMAGE_HEIGHT = LAYOUT.CARD.IMAGE.THUMBNAIL.HEIGHT;

interface PlaylistItemCardProps {
  title: string;
  secondaryText: string;
  onPress?: () => void;
  onPressIn?: () => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: DragHandleProps;
  isBeingDragged?: boolean;
  // Image for bookmarks-style display
  imageUrl?: string;
  // Unique article ID for recycling key
  articleId?: number;
  // Reading progress - always shown (0% = not started)
  progressPercentage?: number;
  // Compact mode — smaller title for constrained widths (e.g. horizontal scroll cards)
  compact?: boolean;
  // Pressable implementation, forwarded to BaseCard. Rows rendered inside the
  // article reader must pass react-native-gesture-handler's — see BaseCardProps.
  PressableComponent?: ComponentType<PressableLikeProps>;
}

export const PlaylistItemCard = memo(
  ({
    title,
    secondaryText,
    onPress,
    onPressIn,
    editMode = false,
    onDelete,
    dragHandleProps,
    isBeingDragged = false,
    imageUrl,
    articleId,
    progressPercentage,
    compact = false,
    PressableComponent,
  }: PlaylistItemCardProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();
    const { fontScale } = useWindowDimensions();
    // Larger system text is a request for readability; keep the article's full
    // title and byline available instead of preserving the compact line caps.
    const wrapText = fontScale > 1;

    // Edit mode animation (scales down when in edit mode or being dragged)
    const { animatedStyle } = useEditModeCardAnimation({
      editMode,
      isBeingDragged,
    });

    // Enhanced title and secondary text styles with semantic colors
    const titleOpacity = getEnhancedOpacity(TEXT_OPACITY.PRIMARY, isDarkMode);
    const secondaryOpacity = getEnhancedOpacity(TEXT_OPACITY.SECONDARY, isDarkMode);

    // Dynamic styles
    const titleTextStyle = [styles.titleText, { opacity: titleOpacity }];

    const secondaryTextStyle = [styles.secondaryText, { opacity: secondaryOpacity }];

    return (
      <Animated.View style={[styles.cardContainer, compact && styles.railContainer, animatedStyle]}>
        {/* Drag Handle - shows on left in edit mode */}
        {editMode && dragHandleProps && (
          <View style={styles.dragHandleContainer}>
            <DragHandle
              accessibilityLabel={STRINGS.PLAYLIST_A11Y_REORDER_ARTICLE.replace('{title}', title)}
              onLongPress={dragHandleProps.onLongPress}
              delayLongPress={dragHandleProps.delayLongPress}
            />
          </View>
        )}

        <View style={styles.cardWrapper}>
          <BaseCard
            contentStyle={compact ? styles.railFill : undefined}
            style={compact ? styles.railFill : undefined}
            onPress={editMode ? undefined : onPress}
            onPressIn={editMode ? undefined : onPressIn}
            PressableComponent={PressableComponent}
          >
            <View style={[styles.cardContent, compact && styles.railFill]}>
              {/* Article thumbnail - bookmarks style */}
              {imageUrl && (
                <View style={styles.imageContainer}>
                  <EnhancedImage
                    source={imageUrl}
                    style={styles.thumbnailImage}
                    transition={TIMING_CONSTANTS.TRANSITION_DELAY}
                    recyclingKey={articleId ? `article-${articleId}` : imageUrl}
                  />
                </View>
              )}

              <View style={styles.contentWrapper}>
                <View style={styles.textContent}>
                  <ThemedText
                    colorName="headingText"
                    style={titleTextStyle}
                    type={compact ? 'body' : 'heading3'}
                    weight={compact ? 'semibold' : undefined}
                    numberOfLines={wrapText ? undefined : 2}
                    ellipsizeMode="tail"
                  >
                    {title}
                  </ThemedText>
                  <View style={styles.secondaryRow}>
                    <ThemedText
                      skipDefaultColor
                      colorName="authorText"
                      numberOfLines={wrapText ? undefined : 1}
                      ellipsizeMode="tail"
                      style={secondaryTextStyle}
                      type="label"
                    >
                      {secondaryText}
                    </ThemedText>
                  </View>
                </View>
              </View>
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
            <IconButton
              accessibilityLabel={STRINGS.PLAYLIST_A11Y_REMOVE_ARTICLE.replace('{title}', title)}
              hapticType="selection"
              icon="trash"
              size="small"
              tone="destructive"
              onPress={onDelete}
            />
          </View>
        )}
      </Animated.View>
    );
  },
);

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
  // A rail stretches every slot to its tallest card, but a card only takes that
  // height if each layer down to its content agrees to grow. Without these a
  // one-line title sat 4pt shorter than the two-line title beside it, and the
  // row of cards had a ragged bottom edge.
  railContainer: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  railFill: {
    flexGrow: 1,
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
    fontFamily: FONTS.ENGLISH,
    letterSpacing: TEXT_STYLES.AUTHOR_BYLINE.letterSpacing,
    flex: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
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
