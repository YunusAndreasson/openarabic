import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { StudyWord, StatCategory } from '@/types/vocabulary.types';
import SectionTitle from '@/components/SectionTitle';

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

    // Handle info modal - memoized for performance
    const handleInfoPress = useCallback((type: InfoModalType) => {
      lightFeedback();
      setModalType(type);
    }, []);

    const handleCloseModal = useCallback(() => {
      setModalType(null);
    }, []);

    // Memoized info press handlers to prevent unnecessary re-renders
    const handleRecommendationInfo = useCallback(
      () => handleInfoPress('recommendation'),
      [handleInfoPress]
    );
    const handleStreakInfo = useCallback(() => handleInfoPress('streak'), [handleInfoPress]);
    const handleMasteryInfo = useCallback(() => handleInfoPress('mastery'), [handleInfoPress]);
    const handleEfficiencyInfo = useCallback(
      () => handleInfoPress('efficiency'),
      [handleInfoPress]
    );
    const handleRetrievabilityInfo = useCallback(
      () => handleInfoPress('retrievability'),
      [handleInfoPress]
    );
    const handleDifficultyInfo = useCallback(
      () => handleInfoPress('difficulty'),
      [handleInfoPress]
    );

    return (
      <View>
        {/* Recommendation Section */}
        <View>
          <SectionTitle title="Recommendation" isFirstSection={true} />
          <LearningGauge
            dueWords={validatedData.due}
            learningWords={validatedData.learning}
            totalWords={validatedData.total}
            masteredWords={validatedData.mastered}
            hideTitle={true}
            onInfoPress={handleRecommendationInfo}
          />
        </View>

        {/* Progress Section */}
        <View>
          <SectionTitle title="Progress" />
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
        <View>
          <SectionTitle title="Consistency" />
          <StreakCard
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            lastSevenDaysActivity={lastSevenDaysActivity}
            onInfoPress={handleStreakInfo}
            hideTitle={true}
          />
        </View>

        {/* Individual Chart Sections */}
        <View>
          <SectionTitle
            title="Mastery"
            subtitle="How well you know each word over time"
            onInfoPress={handleMasteryInfo}
          />
          <MasteryChart
            studyWords={validatedInput.studyWords}
            onInfoPress={handleMasteryInfo}
            onStatPress={onStatPress}
            hideTitle={true}
          />
        </View>

        <View>
          <SectionTitle
            title="Efficiency"
            subtitle="How quickly you learn new vocabulary"
            onInfoPress={handleEfficiencyInfo}
          />
          <EfficiencyChart
            studyWords={validatedInput.studyWords}
            onInfoPress={handleEfficiencyInfo}
            hideTitle={true}
          />
        </View>

        <View>
          <SectionTitle
            title="Retention"
            subtitle="How long you remember words without practice"
            onInfoPress={handleRetrievabilityInfo}
          />
          <RetrievabilityChart
            studyWords={validatedInput.studyWords}
            onInfoPress={handleRetrievabilityInfo}
            onStatPress={onStatPress}
            hideTitle={true}
          />
        </View>

        <View style={styles.lastSection}>
          <SectionTitle
            title="Difficulty"
            subtitle="Which words are hardest for you to remember"
            onInfoPress={handleDifficultyInfo}
          />
          <DifficultyChart
            studyWords={validatedInput.studyWords}
            onInfoPress={handleDifficultyInfo}
            onDifficultyPress={onStatPress}
            onStatPress={onStatPress}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'space-between',
  },
  lastSection: {
    marginBottom: LAYOUT.SPACING.XXLARGE,
  },
});
