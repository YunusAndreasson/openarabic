import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import DeleteButton from '@/components/listen/DeleteButton';
import DragHandle from '@/components/listen/DragHandle';
import PlayButton from '@/components/listen/PlayButton';
import {
  LAYOUT,
  TYPOGRAPHY_HIERARCHY,
  getEnhancedOpacity,
  MIN_TOUCH_TARGET,
} from '@/constants/layout';
import { useTransformAnimation } from '@/hooks/animations';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

interface ArticleCardProps {
  title: string;
  author: string;
  onPress?: () => void;
  onLongPress?: () => void;
  active?: boolean;
  editMode?: boolean;
  onDelete?: () => void;
  dragHandleProps?: any;
  isBeingDragged?: boolean;
  // Play button props
  onPlayPress?: () => void;
  isPlaying?: boolean;
  isLoadingAudio?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  title,
  author,
  onPress,
  onLongPress,
  active = false,
  editMode = false,
  onDelete,
  dragHandleProps,
  isBeingDragged = false,
  onPlayPress,
  isPlaying = false,
  isLoadingAudio = false,
}) => {
  const isDarkMode = useIsDarkMode();

  const {
    animatedStyle,
    startAnimation,
    setValue,
  } = useTransformAnimation({
    type: 'scale',
    initialValue: 1,
    targetValue: 1,
    useSpring: true,
    damping: 20,
    stiffness: 300,
  });

  React.useEffect(() => {
    if (isBeingDragged) {
      setValue(1.05);
    } else if (editMode) {
      setValue(0.95);
    } else {
      startAnimation();
    }
  }, [editMode, isBeingDragged, startAnimation, setValue]);

  const activeCardStyle = React.useMemo(
    () =>
      active
        ? {
            elevation: LAYOUT.ELEVATION.MEDIUM,
            shadowOpacity: LAYOUT.OPACITY.MEDIUM,
          }
        : undefined,
    [active]
  );

  // Enhanced title and author styles with semantic colors
  const titleStyle = React.useMemo(
    () => ({
      marginBottom: LAYOUT.SPACING.TINY,
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.LARGE *
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.lineHeightMultiplier,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const authorStyle = React.useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
      letterSpacing:
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY, isDarkMode),
    }),
    [isDarkMode]
  );

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      {/* Drag Handle - shows on left in edit mode */}
      {editMode && (
        <View style={styles.dragHandleContainer}>
          <DragHandle
            onLongPress={dragHandleProps?.onLongPress}
            delayLongPress={dragHandleProps?.delayLongPress}
          />
        </View>
      )}

      <View style={styles.cardWrapper}>
        <BaseCard
          shadowSize={active ? 'medium' : 'small'}
          style={[styles.card, activeCardStyle]}
          onPress={editMode ? undefined : onPress}
          onLongPress={editMode ? undefined : onLongPress}
        >
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <ThemedText colorName="headingText" style={titleStyle} type="heading3">
                {title}
              </ThemedText>
              <ThemedText
                skipDefaultColor
                colorName="authorText"
                numberOfLines={1}
                style={authorStyle}
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
                    isPlaying={isPlaying}
                    isLoading={isLoadingAudio}
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
    minHeight: MIN_TOUCH_TARGET.SIZE,
    overflow: 'hidden',
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
    minHeight: MIN_TOUCH_TARGET.SIZE,
    padding: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
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
