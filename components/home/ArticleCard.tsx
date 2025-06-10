import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

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
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

interface ArticleCardProps {
  title: string;
  author: string;
  onPress?: () => void;
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
  const scale = useSharedValue(1);

  React.useEffect(() => {
    // Animate scale when edit mode changes or when being dragged
    if (isBeingDragged) {
      scale.value = withSpring(1.05, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      scale.value = withSpring(editMode ? 0.95 : 1, {
        damping: 20,
        stiffness: 300,
      });
    }
  }, [editMode, isBeingDragged, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

            {/* Play Button - shows when not in edit mode */}
            {!editMode && onPlayPress && (
              <View style={styles.playButtonContainer}>
                <PlayButton
                  onPress={onPlayPress}
                  isPlaying={isPlaying}
                  isLoading={isLoadingAudio}
                />
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
