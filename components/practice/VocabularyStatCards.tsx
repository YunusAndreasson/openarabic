/**
 * VocabularyStatCards Component
 *
 * Displays practice session options using a scientifically-grounded 3-phase color system
 * that coordinates with the Memory Capacity Gauge to guide optimal learning behavior.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { useToast } from '@/components/providers/ToastProvider';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';
import { selectionFeedback } from '@/utils/haptics';

import { MemoryRetentionGauge } from './charts/MemoryRetentionGauge';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
  onInfoPress?: () => void;
  studyWords?: StudyWord[];
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: 'alert-circle' | 'school' | 'checkmark-circle';
  onPress?: () => void;
}

const StatCard = memo<StatCardProps>(({ label, value, color, icon, onPress }) => {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    includeOpacity: true,
  });

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  if (!onPress) {
    return (
      <BaseCard shadowSize="small" style={styles.statCard}>
        <View style={[styles.iconContainer, { backgroundColor: color + '14' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <ThemedText type="heading2" weight="bold" style={[styles.statValue, { color }]}>
          {value}
        </ThemedText>
        <ThemedText type="caption" colorName="textTertiary" style={styles.statLabel}>
          {label}
        </ThemedText>
      </BaseCard>
    );
  }

  return (
    <BaseCard shadowSize="small" style={styles.statCard}>
      <AnimatedPressable
        style={[styles.pressableContent, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={LAYOUT.HIT_SLOP.SMALL}
        android_ripple={{ color: colors.navigationRipple, radius: MIN_TOUCH_TARGET.SMALL / 2 }}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '14' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <ThemedText type="heading2" weight="bold" style={[styles.statValue, { color }]}>
          {value}
        </ThemedText>
        <ThemedText type="caption" colorName="textTertiary" style={styles.statLabel}>
          {label}
        </ThemedText>
      </AnimatedPressable>
    </BaseCard>
  );
});

StatCard.displayName = 'StatCard';

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onInfoPress,
    studyWords = [],
  }: VocabularyStatCardsProps) => {
    const colors = useColors();
    const { showToast } = useToast();

    const validatedInput = {
      masteredWords: Math.max(0, masteredWords),
      learningWords: Math.max(0, learningWords),
      dueWords: Math.max(0, dueWords),
      studyWords: Array.isArray(studyWords) ? studyWords : [],
    };

    // Navigation handlers to existing dictionary modal with filter param
    const handleDuePress = () => {
      if (validatedInput.dueWords === 0) {
        selectionFeedback();
        showToast(STRINGS.VOCAB_STAT_NO_DUE_WORDS, 3000, 'info');
      } else {
        router.push(`${ROUTE_PATHS.PRACTICE_DICTIONARY}?filter=due`);
      }
    };
    const handleLearningPress = () => {
      if (validatedInput.learningWords === 0) {
        selectionFeedback();
        showToast(STRINGS.VOCAB_STAT_NO_LEARNING_WORDS, 3000, 'info');
      } else {
        router.push(`${ROUTE_PATHS.PRACTICE_DICTIONARY}?filter=learning`);
      }
    };
    const handleMasteredPress = () => {
      if (validatedInput.masteredWords === 0) {
        selectionFeedback();
        showToast(STRINGS.VOCAB_STAT_NO_MASTERED_WORDS, 3000, 'info');
      } else {
        router.push(`${ROUTE_PATHS.PRACTICE_DICTIONARY}?filter=mastered`);
      }
    };

    // Memoize stats array to prevent recreation
    const stats = [
      {
        label: STRINGS.VOCAB_STAT_DUE,
        value: validatedInput.dueWords,
        color: colors.error,
        icon: 'alert-circle' as const,
        onPress: handleDuePress,
      },
      {
        label: STRINGS.VOCAB_STAT_LEARNING,
        value: validatedInput.learningWords,
        color: colors.warning,
        icon: 'school' as const,
        onPress: handleLearningPress,
      },
      {
        label: STRINGS.VOCAB_STAT_MASTERED,
        value: validatedInput.masteredWords,
        color: colors.success,
        icon: 'checkmark-circle' as const,
        onPress: handleMasteredPress,
      },
    ];

    return (
      <View style={styles.container}>
        <MemoryRetentionGauge studyWords={validatedInput.studyWords} onInfoPress={onInfoPress} />

        {/* Stats row below gauge */}
        <View style={styles.statsRow}>
          {stats.map(stat => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              icon={stat.icon}
              onPress={stat.onPress}
            />
          ))}
        </View>
      </View>
    );
  }
);

VocabularyStatCards.displayName = 'VocabularyStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.LARGE,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  pressableContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  statValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  statLabel: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});

export default VocabularyStatCards;
