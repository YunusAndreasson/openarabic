import React, { memo, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { StudyWord, VocabularyStats, StatCategory } from '@/types/vocabulary.types';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import { useAuth } from '../../hooks/useAuth';
import { useStreakData } from '../../hooks/useStreakData';
import { lightFeedback } from '../../utils/haptics';

import { LearningGauge } from './LearningGauge';
import { InfoModal, type InfoModalType } from './InfoModal';
import { StatCard } from './StatCard';
import { StreakCard } from './StreakCard';
import { MasteryChart } from './charts/MasteryChart';
import { EfficiencyChart } from './charts/EfficiencyChart';
import { RetrievabilityChart } from './charts/RetrievabilityChart';
import { DifficultyChart } from './charts/DifficultyChart';

interface VocabularyStatCardsProps
  extends Pick<VocabularyStats, 'dueWords' | 'masteredWords' | 'learningWords'> {
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
    const streakData = useStreakData(user?.id);

    // Modal state for info dialogs
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<InfoModalType | null>(null);

    // Handle info icon presses
    const handleInfoPress = (type: InfoModalType) => {
      lightFeedback();
      setModalType(type);
      setModalVisible(true);
    };

    const handleCloseModal = () => {
      setModalVisible(false);
      setModalType(null);
    };

    // Validate input data to prevent inconsistencies
    const validatedInput = useMemo(() => {
      const validStudyWords = Array.isArray(studyWords) ? studyWords.filter(Boolean) : [];
      return {
        masteredWords: Math.max(0, masteredWords),
        learningWords: Math.max(0, learningWords),
        dueWords: Math.max(0, dueWords),
        studyWords: validStudyWords,
      };
    }, [masteredWords, learningWords, dueWords, studyWords]);

    // Calculate FSRS-based metrics from study words
    const fsrsMetrics = useMemo(() => {
      if (!validatedInput.studyWords.length) {
        return {
          totalWords: 0,
          needsAttention: 0,
        };
      }

      let needsAttention = 0;

      validatedInput.studyWords.forEach(word => {
        // Words that need attention based on FSRS metrics
        const difficulty = word.fsrs_difficulty ?? 0.3;
        const lapses = word.fsrs_lapses ?? 0;
        const stability = word.fsrs_stability ?? 0;
        const state = word.fsrs_state;

        const isHighDifficultyWithLapses = difficulty > 0.6 && lapses > 0;
        const isStrugglingInLearning = (state === 1 || state === 2) && lapses > 1;
        const isUnstableAndDifficult = stability < 7 && difficulty > 0.5 && lapses > 0;

        if (isHighDifficultyWithLapses || isStrugglingInLearning || isUnstableAndDifficult) {
          needsAttention++;
        }
      });

      return {
        totalWords: validatedInput.studyWords.length,
        needsAttention,
      };
    }, [validatedInput.studyWords]);

    // Calculate validated data with proper consistency checks
    const validatedData = useMemo(() => {
      const total = Math.max(fsrsMetrics.totalWords, 1);

      // Ensure data consistency - words can't exceed total
      const validMastered = Math.min(validatedInput.masteredWords, total);
      const validLearning = Math.min(validatedInput.learningWords, total);
      const validDue = Math.min(validatedInput.dueWords, total);

      return {
        total,
        mastered: validMastered,
        learning: validLearning,
        due: validDue,
        needsAttention: fsrsMetrics.needsAttention,
      };
    }, [fsrsMetrics, validatedInput]);

    // Prepare stat cards configuration
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
          label: 'Difficult',
          icon: 'alert-circle',
          iconColor: colors.error,
          bgColor: colors.buttonOverlay,
          borderColor: colors.error + '40',
          category: 'needsAttention',
        },
      ],
      [validatedData, colors]
    );

    return (
      <View style={styles.container}>
        {/* Learning Gauge - Primary guidance */}
        <LearningGauge
          dueWords={validatedData.due}
          learningWords={validatedData.learning}
          totalWords={validatedData.total}
          masteredWords={validatedData.mastered}
        />

        {/* Stat Cards - Detailed breakdown */}
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

        {/* Streak Insights */}
        <StreakCard
          currentStreak={streakData.currentStreak}
          longestStreak={streakData.longestStreak}
          lastSevenDaysActivity={streakData.lastSevenDaysActivity}
          onInfoPress={() => handleInfoPress('streak')}
        />

        {/* Mastery Chart */}
        <MasteryChart
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('mastery')}
        />

        {/* Efficiency Chart */}
        <EfficiencyChart
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('efficiency')}
        />

        {/* Retrievability Chart */}
        <RetrievabilityChart
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('retrievability')}
        />

        {/* Difficulty Chart */}
        <DifficultyChart
          studyWords={validatedInput.studyWords}
          onInfoPress={() => handleInfoPress('difficulty')}
        />

        {/* Info Modal */}
        <InfoModal visible={modalVisible} type={modalType} onClose={handleCloseModal} />
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
});
