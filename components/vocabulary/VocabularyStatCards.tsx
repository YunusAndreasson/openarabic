import React, { memo, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import { ThemedText } from '@/components/ThemedText';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import { useAuth } from '../../hooks/useAuth';
import { useStreakData } from '../../hooks/useStreakData';
import { useVocabularyChartData } from '../../hooks/useVocabularyChartData';
import { lightFeedback } from '../../utils/haptics';

import { LearningGauge } from './LearningGauge';
import { InfoModal, type InfoModalType } from './InfoModal';
import { StatCard } from './StatCard';
import { StreakCard } from './StreakCard';
import { MasteryChart } from './charts/MasteryChart';
import { EfficiencyChart } from './charts/EfficiencyChart';
import { RetrievabilityChart } from './charts/RetrievabilityChart';
import { DifficultyChart } from './charts/DifficultyChart';

interface VocabularyStatCardsProps {
  masteredWords?: number;
  learningWords?: number;
  dueWords?: number;
  onStatPress?: (category: StatCategory) => void;
  studyWords?: StudyWord[];
}

interface StatCardConfig {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  category: StatCategory;
}

// Section Header Component
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onInfoPress?: () => void;
  isFirstSection?: boolean;
}

const SectionHeader = memo(
  ({ title, subtitle, onInfoPress, isFirstSection = false }: SectionHeaderProps) => {
    const colors = useColors();

    return (
      <View style={[styles.sectionHeader, isFirstSection && styles.firstSectionHeader]}>
        <View style={styles.titleGroup}>
          <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText type="caption" variant="secondary" style={styles.sectionSubtitle}>
              {subtitle}
            </ThemedText>
          )}
        </View>
        {onInfoPress && (
          <TouchableOpacity
            onPress={onInfoPress}
            style={[styles.infoIcon, { backgroundColor: colors.textOverlay }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }
);
SectionHeader.displayName = 'SectionHeader';

export const VocabularyStatCards = memo(
  ({
    masteredWords = 0,
    learningWords = 0,
    dueWords = 0,
    onStatPress,
    studyWords = [],
  }: VocabularyStatCardsProps) => {
    const colors = useColors();
    const { user } = useAuth();
    const [modalType, setModalType] = useState<InfoModalType | null>(null);

    // Get optimized chart data from database views
    const { userStats } = useVocabularyChartData(user?.id);

    // Get streak data
    const { currentStreak, longestStreak, lastSevenDaysActivity } = useStreakData(user?.id);

    // Validate input data with safe defaults
    const validatedInput = useMemo(
      () => ({
        masteredWords: Math.max(0, masteredWords),
        learningWords: Math.max(0, learningWords),
        dueWords: Math.max(0, dueWords),
        studyWords: Array.isArray(studyWords) ? studyWords : [],
      }),
      [masteredWords, learningWords, dueWords, studyWords]
    );

    // Use database stats when available, fallback to props
    const stats = useMemo(
      () => ({
        masteredWords: userStats?.masteredWords ?? validatedInput.masteredWords,
        learningWords: userStats?.learningWords ?? validatedInput.learningWords,
        dueWords: userStats?.dueWords ?? validatedInput.dueWords,
        totalWords:
          userStats?.totalWords ?? validatedInput.masteredWords + validatedInput.learningWords,
      }),
      [userStats, validatedInput]
    );

    // Calculate FSRS-based metrics from study words for components that still need them
    const fsrsMetrics = useMemo(() => {
      if (!validatedInput.studyWords.length) {
        return {
          totalWords: stats.totalWords,
          needsAttention: 0,
        };
      }

      let needsAttention = 0;

      validatedInput.studyWords.forEach(word => {
        // Words that need attention based on FSRS metrics
        const difficulty = word.fsrs_difficulty ?? 5.0;
        const lapses = word.fsrs_lapses ?? 0;
        const stability = word.fsrs_stability ?? 0;
        const state = word.fsrs_state;

        const isHighDifficultyWithLapses = difficulty > 6.0 && lapses > 0;
        const isStrugglingInLearning = (state === 1 || state === 2) && lapses > 1;
        const isUnstableAndDifficult = stability < 7 && difficulty > 5.0 && lapses > 0;

        if (isHighDifficultyWithLapses || isStrugglingInLearning || isUnstableAndDifficult) {
          needsAttention++;
        }
      });

      return {
        totalWords: Math.max(validatedInput.studyWords.length, stats.totalWords),
        needsAttention,
      };
    }, [validatedInput.studyWords, stats.totalWords]);

    // Calculate validated data with proper consistency checks
    const validatedData = useMemo(() => {
      const total = Math.max(fsrsMetrics.totalWords, 1);

      // Ensure data consistency - words can't exceed total
      const validMastered = Math.min(stats.masteredWords, total);
      const validLearning = Math.min(stats.learningWords, total);
      const validDue = Math.min(stats.dueWords, total);

      return {
        total,
        mastered: validMastered,
        learning: validLearning,
        due: validDue,
        needsAttention: fsrsMetrics.needsAttention,
      };
    }, [fsrsMetrics, stats]);

    // Prepare stat cards configuration with proper icons and colors
    const statCards: StatCardConfig[] = useMemo(
      () => [
        {
          value: validatedData.due,
          label: 'Due',
          icon: 'alarm-outline',
          iconColor: colors.warning,
          bgColor: colors.buttonOverlay,
          borderColor: colors.warning + '40',
          category: 'due',
        },
        {
          value: validatedData.learning,
          label: 'Learning',
          icon: 'school-outline',
          iconColor: colors.info,
          bgColor: colors.buttonOverlay,
          borderColor: colors.info + '40',
          category: 'learning',
        },
        {
          value: validatedData.mastered,
          label: 'Mastered',
          icon: 'checkmark-circle-outline',
          iconColor: colors.success,
          bgColor: colors.buttonOverlay,
          borderColor: colors.success + '40',
          category: 'mastered',
        },
        {
          value: validatedData.needsAttention,
          label: 'Hard',
          icon: 'alert-circle',
          iconColor: colors.error,
          bgColor: colors.buttonOverlay,
          borderColor: colors.error + '40',
          category: 'needsAttention',
        },
      ],
      [validatedData, colors]
    );

    // Handle info modal
    const handleInfoPress = (type: InfoModalType) => {
      lightFeedback();
      setModalType(type);
    };

    const handleCloseModal = () => {
      setModalType(null);
    };

    return (
      <View style={styles.container}>
        {/* Recommendation Section */}
        <View style={styles.sectionWrapper}>
          <SectionHeader
            title="Recommendation"
            subtitle="Smart guidance for optimal learning"
            onInfoPress={() => handleInfoPress('recommendation')}
            isFirstSection={true}
          />
          <LearningGauge
            dueWords={validatedData.due}
            learningWords={validatedData.learning}
            totalWords={validatedData.total}
            masteredWords={validatedData.mastered}
            hideTitle={true}
            onInfoPress={() => handleInfoPress('recommendation')}
          />
        </View>

        {/* Progress Section */}
        <View style={styles.sectionWrapper}>
          <SectionHeader title="Progress" subtitle="Current status of your vocabulary learning" />
          <View style={styles.statsGrid}>
            {statCards.map(card => (
              <StatCard
                key={`vocab-stat-card-${card.category}`}
                value={card.value}
                label={card.label}
                icon={card.icon}
                iconColor={card.iconColor}
                bgColor={card.bgColor}
                borderColor={card.borderColor}
                category={card.category}
                onPress={onStatPress}
              />
            ))}
          </View>
        </View>

        {/* Consistency Section */}
        <View style={styles.sectionWrapper}>
          <SectionHeader
            title="Consistency"
            subtitle="Daily practice habits and learning streaks"
            onInfoPress={() => handleInfoPress('streak')}
          />
          <StreakCard
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            lastSevenDaysActivity={lastSevenDaysActivity}
            onInfoPress={() => handleInfoPress('streak')}
            hideTitle={true}
          />
        </View>

        {/* Individual Chart Sections */}
        <View style={styles.chartSection}>
          <SectionHeader
            title="Mastery"
            subtitle="How well you know each word over time"
            onInfoPress={() => handleInfoPress('mastery')}
          />
          <MasteryChart
            studyWords={validatedInput.studyWords}
            onInfoPress={() => handleInfoPress('mastery')}
            hideTitle={true}
          />
        </View>

        <View style={styles.chartSection}>
          <SectionHeader
            title="Efficiency"
            subtitle="How quickly you learn new vocabulary"
            onInfoPress={() => handleInfoPress('efficiency')}
          />
          <EfficiencyChart
            studyWords={validatedInput.studyWords}
            onInfoPress={() => handleInfoPress('efficiency')}
            hideTitle={true}
          />
        </View>

        <View style={styles.chartSection}>
          <SectionHeader
            title="Retention"
            subtitle="How long you remember words without practice"
            onInfoPress={() => handleInfoPress('retrievability')}
          />
          <RetrievabilityChart
            studyWords={validatedInput.studyWords}
            onInfoPress={() => handleInfoPress('retrievability')}
            hideTitle={true}
          />
        </View>

        <View style={styles.chartSection}>
          <SectionHeader
            title="Difficulty"
            subtitle="Which words are hardest for you to remember"
            onInfoPress={() => handleInfoPress('difficulty')}
          />
          <DifficultyChart
            studyWords={validatedInput.studyWords}
            onInfoPress={() => handleInfoPress('difficulty')}
            hideTitle={true}
          />
        </View>

        {/* Info Modal */}
        <InfoModal type={modalType} visible={modalType !== null} onClose={handleCloseModal} />
      </View>
    );
  }
);

VocabularyStatCards.displayName = 'VocabularyStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'space-between',
  },
  chartGrid: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
  sectionWrapper: {
    // Remove gap, let SectionHeader handle spacing
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.XXLARGE,
  },
  firstSectionHeader: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
  titleGroup: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  sectionTitle: {
    marginBottom: 0,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2,
  },
  sectionSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    marginTop: LAYOUT.SPACING.TINY,
  },
  infoIcon: {
    padding: LAYOUT.SPACING.SMALL,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  chartSection: {
    // Individual chart sections get standard spacing
  },
  streakCardContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
