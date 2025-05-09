import React, { memo, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';

import BaseCard from '@/components/BaseCard';
import SectionTitle from '@/components/SectionTitle';
import { ThemedText } from '@/components/ThemedText';
import { LoadingContainer } from '@/components/Loader';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useSimpleAudioPlayer } from '@/hooks/useSimpleAudioPlayer';
import type { StudyWord } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';

interface StrugglingWordsProps {
  words: StudyWord[];
  isLoading?: boolean;
}

interface WordCardProps {
  word: StudyWord;
  onPlayAudio: (url: string | null) => void;
}

const WordCard = memo(({ word, onPlayAudio }: WordCardProps) => {
  const colors = useColors();

  // Get the Arabic text from the root
  const arabicText = word.root?.letters || '';
  // Get the English translation from the root
  const englishText = word.root?.meaning || '';

  const handlePress = () => {
    lightFeedback();
    // Play the audio from the root if available
    if (word.root?.audio_url) {
      onPlayAudio(word.root.audio_url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.75}>
      <BaseCard style={styles.wordCard} shadowSize="small">
        <View style={styles.wordCardContent}>
          <ThemedText
            type="arabic"
            style={styles.arabicText}
            arabicFontSize={26}
            colorName="arabicText"
          >
            {arabicText}
          </ThemedText>
          <ThemedText type="caption" colorName="textTertiary" style={styles.englishText}>
            {englishText}
          </ThemedText>
        </View>
      </BaseCard>
    </TouchableOpacity>
  );
});

WordCard.displayName = 'WordCard';

const StrugglingWordsSection = memo(({ words = [], isLoading = false }: StrugglingWordsProps) => {
  const displayedWords = useMemo(() => words.slice(0, 10), [words]);
  const { playAudio } = useSimpleAudioPlayer();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SectionTitle title="Words You Struggle With" />
        <View style={styles.loadingContainer}>
          <LoadingContainer />
        </View>
      </View>
    );
  }

  if (displayedWords.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionTitle title="Words You Struggle With" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayedWords.map(word => (
          <WordCard key={`word-${word.root_id}`} word={word} onPlayAudio={playAudio} />
        ))}
      </ScrollView>
    </View>
  );
});

StrugglingWordsSection.displayName = 'StrugglingWordsSection';

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  scrollContent: {
    paddingVertical: LAYOUT.SPACING.TINY,
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  wordCard: {
    width: 130,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  wordCardContent: {
    padding: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicText: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  englishText: {
    textAlign: 'center',
  },
  loadingContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StrugglingWordsSection;
