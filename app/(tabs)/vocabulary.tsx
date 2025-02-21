import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyStats } from '@/components/VocabularyStats';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsService } from '@/services/study_words';
import { router } from 'expo-router';
import { ThemedButton } from '@/components/ThemedButton';

export default function VocabularyScreen() {
  const { user } = useAuth();

  const { data: studyWords = [], isLoading } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id),
    enabled: !!user,
  });

  // Filter out study words with missing sentence_word data
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

  const handleStartReview = () => {
    router.push('/review');
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Please sign in to view your vocabulary.</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Loading vocabulary...</ThemedText>
      </ThemedView>
    );
  }

  if (!validStudyWords.length) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>
          You haven't added any words to your study list yet.
        </ThemedText>
        <ThemedText style={styles.submessage}>
          Start reading articles and tap on words to add them to your vocabulary.
        </ThemedText>
      </ThemedView>
    );
  }

  const hasDueWords = stats.dueWords > 0;

  return (
    <ThemedView style={styles.container}>
      <VocabularyStats {...stats} />
      {hasDueWords ? (
        <ThemedButton
          title={`Review ${stats.dueWords} Words`}
          icon="play-circle"
          onPress={handleStartReview}
          style={styles.reviewButton}
        />
      ) : (
        <ThemedText style={styles.message}>No words due for review.</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 24,
    marginHorizontal: 24,
  },
  submessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginHorizontal: 24,
    opacity: 0.7,
  },
  reviewButton: {
    marginTop: 24,
  },
});
