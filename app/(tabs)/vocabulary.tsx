import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyStats } from '@/components/VocabularyStats';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { router } from 'expo-router';
import { ThemedButton } from '@/components/ThemedButton';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { Ionicons } from '@expo/vector-icons';

// Define types for our components
interface StatsType {
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
}

interface StudyWord {
  sentence_word?: {
    word: string;
    translation: string;
  } | null;
  next_review_at: string;
  interval_days: number;
}

// Helper function to get a motivational message based on stats
const getMotivationalMessage = (stats: StatsType): string => {
  if (stats.dueWords > 0) {
    return `You have ${stats.dueWords} words to review today. Keep up the good work!`;
  } else if (stats.totalWords === 0) {
    return 'Start building your vocabulary today!';
  } else if (stats.masteredWords === stats.totalWords) {
    return "Amazing! You've mastered all your words. Add more to keep learning!";
  } else {
    return 'Great job! All caught up with your reviews for today.';
  }
};

// Streak component to show consecutive days of practice
const StreakCard = ({ streak = 5, colors }: { streak?: number; colors: any }) => {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.statContent}>
        <View style={styles.statTextContainer}>
          <ThemedText style={styles.statValue}>{streak}</ThemedText>
          <ThemedText style={styles.statLabel}>Day Streak</ThemedText>
        </View>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.text + '10', borderColor: colors.cardBorder + '40' },
          ]}
        >
          <Ionicons name="flame" size={24} color={colors.icon} />
        </View>
      </View>
    </View>
  );
};

// Enhanced empty state component
const EnhancedEmptyState = ({ colors }: { colors: any }) => {
  return (
    <View style={styles.enhancedEmptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.text + '10' }]}>
        <Ionicons
          name="book-outline"
          size={48}
          color={colors.text}
          style={{ opacity: LAYOUT.OPACITY.DIMMED }}
        />
      </View>
      <ThemedText style={styles.emptyTitle}>Build Your Vocabulary</ThemedText>
      <ThemedText style={styles.emptyMessage}>
        You haven't added any words to your study list yet.
      </ThemedText>
      <ThemedText style={styles.emptySubmessage}>
        Start reading articles and tap on words to add them to your vocabulary.
      </ThemedText>
      <TouchableOpacity
        style={[styles.emptyActionButton, { backgroundColor: colors.text + '10' }]}
        onPress={() => router.push('/(tabs)')}
      >
        <ThemedText style={styles.emptyActionText}>Browse Articles</ThemedText>
        <Ionicons name="arrow-forward" size={16} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
};

export default function VocabularyScreen() {
  const { user } = useAuth();
  const colors = useColors();

  const { data: studyWords = [], isLoading } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id),
    enabled: !!user,
  });

  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null) as StudyWord[];
  }, [studyWords]);

  const stats = useMemo(() => {
    const now = new Date();
    const dueWords = validStudyWords.filter(word => new Date(word.next_review_at) <= now);
    const masteredWords = validStudyWords.filter(word => word.interval_days >= 30);
    const learningWords = validStudyWords.filter(word => word.interval_days < 30);

    return {
      totalWords: validStudyWords.length,
      dueWords: dueWords.length,
      masteredWords: masteredWords.length,
      learningWords: learningWords.length,
    };
  }, [validStudyWords]);

  const motivationalMessage = useMemo(() => getMotivationalMessage(stats), [stats]);

  const handleStartReview = useCallback(() => {
    router.push('/review');
  }, []);

  // Memoize styles to prevent unnecessary rerenders
  const buttonContainerStyle = useMemo(() => [styles.buttonContainer], []);

  if (!user) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <View
          style={[
            styles.messageContainer,
            { marginTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM },
          ]}
        >
          <ThemedText style={styles.message}>Please sign in to view your vocabulary.</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <View
          style={[
            styles.messageContainer,
            { marginTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM },
          ]}
        >
          <ThemedText style={styles.message}>Loading vocabulary...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!validStudyWords.length) {
    return (
      <ThemedView style={styles.container} contentContainerStyle={{ padding: 0 }}>
        <EnhancedEmptyState colors={colors} />
      </ThemedView>
    );
  }

  const hasDueWords = stats.dueWords > 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: LAYOUT.CONTENT_SPACING.TOP }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Motivational message */}
        <View style={styles.messageHeader}>
          <ThemedText style={styles.motivationalText}>{motivationalMessage}</ThemedText>
        </View>

        {/* Progress card - now at the top by itself */}
        <View style={styles.progressCardContainer}>
          <VocabularyStats
            totalWords={stats.totalWords}
            masteredWords={stats.masteredWords}
            dueWords={stats.dueWords}
            learningWords={stats.learningWords}
          />
        </View>

        {/* Stats section - now includes streak card as one of the square cards */}
        <View style={styles.statsGrid}>
          <StreakCard streak={5} colors={colors} />

          {/* Stat cards - manually create them to match the streak card */}
          {[
            { label: 'Due Today', value: stats.dueWords, icon: 'time-outline' },
            { label: 'Mastered', value: stats.masteredWords, icon: 'checkmark-circle-outline' },
            { label: 'Learning', value: stats.learningWords, icon: 'school-outline' },
          ].map((stat, index) => (
            <View
              key={index}
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.statContent}>
                <View style={styles.statTextContainer}>
                  <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
                  <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
                </View>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.text + '10', borderColor: colors.cardBorder + '40' },
                  ]}
                >
                  <Ionicons name={stat.icon as any} size={24} color={colors.icon} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {hasDueWords && (
        <View style={buttonContainerStyle}>
          <ThemedButton
            title={`Review ${stats.dueWords} ${stats.dueWords === 1 ? 'word' : 'words'}`}
            icon="play-circle"
            onPress={handleStartReview}
            variant="filled"
            style={styles.reviewButton}
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom:
      LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.SMALL * 2 + 44,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  messageHeader: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  motivationalText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  progressCardContainer: {
    width: '100%',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  statCard: {
    width: '48%',
    height: 90,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  statContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  submessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.TINY,
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  enhancedEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  emptyTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  emptySubmessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    opacity: LAYOUT.OPACITY.DISABLED,
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
  },
  emptyActionText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.SMALL + LAYOUT.BOTTOM_BAR.HEIGHT,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewButton: {
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.LARGE,
    minHeight: LAYOUT.BUTTON.HEIGHT.LARGE,
  },
});
