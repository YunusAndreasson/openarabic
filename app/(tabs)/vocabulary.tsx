import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
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

export default function VocabularyScreen() {
  const { user } = useAuth();
  const colors = useColors();

  const { data: studyWords = [], isLoading } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id),
    enabled: !!user,
  });

  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null);
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

  const handleStartReview = useCallback(() => {
    router.push('/review');
  }, []);

  const buttonContainerStyle = useMemo(
    () => [
      styles.buttonContainer,
      {
        backgroundColor: colors.background,
        borderTopColor: colors.icon,
        shadowColor: colors.shadow,
      },
    ],
    [colors.background, colors.icon, colors.shadow]
  );

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.messageContainer}>
          <ThemedText style={styles.message}>Please sign in to view your vocabulary.</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.messageContainer}>
          <ThemedText style={styles.message}>Loading vocabulary...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!validStudyWords.length) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.message}>
            You haven't added any words to your study list yet.
          </ThemedText>
          <ThemedText style={styles.submessage}>
            Start reading articles and tap on words to add them to your vocabulary.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const hasDueWords = stats.dueWords > 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VocabularyStats {...stats} />
      </ScrollView>

      {hasDueWords && (
        <View style={buttonContainerStyle}>
          <ThemedButton
            title={`Review ${stats.dueWords} ${stats.dueWords === 1 ? 'word' : 'words'}`}
            icon="play-circle"
            onPress={handleStartReview}
            variant="filled"
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
    paddingTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM,
    paddingBottom:
      LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.SMALL * 2 + 44,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  message: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.SMALL + LAYOUT.BOTTOM_BAR.HEIGHT,
    borderTopWidth: 0.5,
    zIndex: LAYOUT.Z_INDEX.HEADER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
