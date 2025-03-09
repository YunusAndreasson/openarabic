import React, { useMemo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import Pill from './Pill';
import { Ionicons } from '@expo/vector-icons';
import { CompactArticleCardProps } from '../types/ui.types';
import { formatTimeAgo } from '../utils/dateUtils';
import { EnhancedImage } from './EnhancedImage';
import Animated from 'react-native-reanimated';
import { useCardAnimation } from '../hooks/animations';

// TimeAgo component to show when an article was published
const TimeAgo = ({ date }: { date: string }) => {
  const colors = useColors();
  const timeAgoText = formatTimeAgo(date);

  return (
    <View style={styles.timeAgoContainer}>
      <Ionicons name="time-outline" size={14} color={colors.tint} style={styles.timeIcon} />
      <ThemedText style={[styles.timeAgoText, { color: colors.tint }]} skipDefaultColor>
        {timeAgoText}
      </ThemedText>
    </View>
  );
};

// DifficultyIndicator component
const DifficultyIndicator = ({ level }: { level: number }) => {
  const colors = useColors();

  // Normalize level to be between 1-5
  const normalizedLevel = Math.max(1, Math.min(5, level));

  // Get difficulty label based on level
  const difficultyLabel = useMemo(() => {
    switch (normalizedLevel) {
      case 1:
        return 'Beginner';
      case 2:
        return 'Easy';
      case 3:
        return 'Intermediate';
      case 4:
        return 'Advanced';
      case 5:
        return 'Expert';
      default:
        return 'Intermediate';
    }
  }, [normalizedLevel]);

  return (
    <View style={styles.difficultyContainer}>
      <ThemedText style={styles.difficultyLabel}>{difficultyLabel}</ThemedText>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons
            key={`star-${star}`}
            name="star"
            size={10}
            color={star <= normalizedLevel ? colors.tint : colors.cardBorder}
            style={styles.starIcon}
          />
        ))}
      </View>
    </View>
  );
};

function CompactArticleCardComponent({
  article,
  onPress,
  showTimeAgo = false,
}: CompactArticleCardProps) {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = useCardAnimation();

  // Dynamically generated styles based on theme
  const dynamicStyles = useMemo(
    () => ({
      card: {
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
        shadowColor: colors.cardShadow,
      },
      authorText: {
        color: colors.authorText,
      },
    }),
    [colors]
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.pressable]}
    >
      <Animated.View style={animatedStyle}>
        <View style={[styles.card, dynamicStyles.card]}>
          <View style={styles.imageContainer}>
            <EnhancedImage
              source={article.image_url || 'https://picsum.photos/800/400'}
              style={styles.image}
              contentFit="cover"
              alt={`Image for article: ${article.title}`}
              onError={() => console.log(`Failed to load image for article: ${article.id}`)}
              showLoadingIndicator={true}
              transition={300}
            />
            {article.category && (
              <Pill
                id={article.category.id}
                label={article.category.name}
                variant="category"
                absolute
              />
            )}
          </View>
          <View style={styles.contentContainer}>
            <ThemedText style={styles.title} numberOfLines={2}>
              {article.title}
            </ThemedText>

            {article.author && (
              <ThemedText
                style={[styles.authorText, dynamicStyles.authorText]}
                numberOfLines={1}
                skipDefaultColor
              >
                By {article.author.name}
              </ThemedText>
            )}

            <View style={styles.cardFooter}>
              {showTimeAgo ? (
                <TimeAgo date={article.created_at} />
              ) : (
                <DifficultyIndicator level={article.difficulty_level} />
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Memoize the component to prevent unnecessary rerenders
export const CompactArticleCard = React.memo(CompactArticleCardComponent);

const styles = StyleSheet.create({
  pressable: {
    marginRight: LAYOUT.SPACING.SMALL,
    width: 220,
    marginLeft: 0,
  },
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 130,
    zIndex: LAYOUT.Z_INDEX.BASE,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  authorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.TINY,
  },
  difficultyContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  difficultyLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 0.85,
    marginBottom: 2,
    opacity: LAYOUT.OPACITY.PRESSED,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  // TimeAgo component styles
  timeAgoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.TINY,
    paddingLeft: 0,
  },
  timeIcon: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  timeAgoText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
  },
});
