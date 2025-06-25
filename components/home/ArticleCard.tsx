import { useEffect, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import DeleteButton from '@/components/listen/DeleteButton';
import DragHandle, { type DragHandleProps } from '@/components/listen/DragHandle';
import PlayButton from '@/components/listen/PlayButton';
import { ARTICLE_CARD_SPRING, CARD_DRAG_SCALE, WORD_PRESS_SCALE } from '@/constants/animation';
import {
  getEnhancedOpacity,
  LAYOUT,
  MIN_TOUCH_TARGET,
  TYPOGRAPHY_HIERARCHY,
} from '@/constants/layout';
import { useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

interface ArticleCardProps {
  title: string;
  author: string;
  onPress?: () => void;
  onLongPress?: () => void;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: DragHandleProps;
  isBeingDragged?: boolean;
  // Play button props
  onPlayPress?: () => void;
  isLoadingAudio?: boolean;
}

export const ArticleCard: FC<ArticleCardProps> = ({
  title,
  author,
  onPress,
  onLongPress,
  editMode = false,
  onDelete,
  dragHandleProps,
  isBeingDragged = false,
  onPlayPress,
  isLoadingAudio = false,
}) => {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();
  // Play button has tint background: white icon in light mode, dark icon in dark mode
  const playIconColor = isDarkMode ? colors.black : colors.white;

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
  const titleOpacity = getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode);
  const authorOpacity = getEnhancedOpacity(
    TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY,
    isDarkMode
  );

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
        <BaseCard
          shadowSize="small"
          style={styles.card}
          {...(editMode ? {} : onPress ? { onPress } : {})}
          {...(editMode ? {} : onLongPress ? { onLongPress } : {})}
        >
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <ThemedText
                colorName="headingText"
                style={[styles.titleText, { opacity: titleOpacity }]}
                type="heading3"
              >
                {title}
              </ThemedText>
              <ThemedText
                skipDefaultColor
                colorName="authorText"
                numberOfLines={1}
                style={[styles.authorText, { opacity: authorOpacity }]}
                type="label"
              >
                {author}
              </ThemedText>
            </View>

            {/* Play Button - always reserve space when not in edit mode */}
            {!editMode && (
              <View style={styles.playButtonContainer}>
                {onPlayPress ? (
                  <PlayButton
                    onPress={onPlayPress}
                    isPlaying={false}
                    isLoading={isLoadingAudio}
                    iconColor={playIconColor}
                  />
                ) : (
                  <View style={styles.playButtonPlaceholder} />
                )}
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
};

const styles = StyleSheet.create({
  card: {
    minHeight: MIN_TOUCH_TARGET.LARGE,
  },
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
    minHeight: MIN_TOUCH_TARGET.LARGE,
    padding: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
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
  },
  playButtonContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  playButtonPlaceholder: {
    height: MIN_TOUCH_TARGET.MEDIUM,
    width: MIN_TOUCH_TARGET.MEDIUM,
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
});
