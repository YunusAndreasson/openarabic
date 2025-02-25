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
        <View
          style={[
            styles.emptyContainer,
            { marginTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM },
          ]}
        >
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.MEDIUM },
        ]}
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
