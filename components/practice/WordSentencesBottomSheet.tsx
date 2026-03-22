import { memo, useCallback } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ArticleSentence } from '@/components/article/ArticleSentence';
import { BaseCard } from '@/components/common';
import { ColorDot, HeaderIconButton } from '@/components/ui';
import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import { useColors } from '@/hooks/theme/useColors';
import { useSentencesByWord } from '@/hooks/vocabulary/useSentencesByWord';
import type { StudyWord } from '@/types/vocabulary.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import { getStabilityProgressColor } from '@/utils/urgencyScore';


interface WordSentencesBottomSheetProps {
  /** Controls modal visibility */
  isVisible: boolean;
  /** Callback when modal is dismissed */
  onClose: () => void;
  /** The study word to show sentences for */
  word: StudyWord | null;
}

/**
 * Full-screen modal that shows example sentences containing a word from the dictionary.
 */
export const WordSentencesBottomSheet = memo<WordSentencesBottomSheetProps>(
  ({ isVisible, onClose, word }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    // Fetch sentences containing this word
    const { sentences, isLoading, isEmpty } = useSentencesByWord({
      rootId: word?.root_id,
      limit: 5,
      enabled: isVisible && !!word?.root_id,
    });

    // Use consolidated word audio playback hook
    const playWordAudio = useWordAudioPlayback({ showErrorToast: true });

    // Handle play audio
    const handlePlayAudio = useCallback(async () => {
      if (!word?.root) return;
      await playWordAudio({
        id: word.root_id,
        audio_url: word.root.audio_url,
        audio_url_en: word.root.audio_url_en,
        letters: word.root.letters,
        meaning: word.root.meaning,
      });
    }, [word, playWordAudio]);

    // Get text and colors
    const arabicText = word?.root?.letters || '';
    const englishText = capitalizeFirstLetter(word?.root?.meaning || '');
    const dotColorKey = getStabilityProgressColor(word?.fsrs_stability);

    return (
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <HeaderIconButton iconName="close" onPress={onClose} size="medium" />
            <View style={styles.headerSpacer} />
            {word?.root?.audio_url && (
              <HeaderIconButton iconName="play-circle" onPress={handlePlayAudio} size="medium" />
            )}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + LAYOUT.SPACING.SMALL },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Word Section - Arabic, English, and memory dot */}
            <View style={styles.wordSection}>
              <ThemedText
                type="arabic"
                weight="semibold"
                style={styles.arabicText}
              >
                {arabicText}
              </ThemedText>

              <View style={styles.englishRow}>
                <ColorDot color={colors[dotColorKey]} />
                <ThemedText type="body" variant="secondary" style={styles.englishText}>
                  {englishText}
                </ThemedText>
              </View>
            </View>

            {/* Loading State */}
            {isLoading && (
              <View style={styles.centeredContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            )}

            {/* Empty State */}
            {!isLoading && isEmpty && (
              <View style={styles.centeredContainer}>
                <ThemedText type="body" variant="secondary" align="center">
                  {STRINGS.NO_SENTENCE_EXAMPLES}
                </ThemedText>
              </View>
            )}

            {/* Sentences List */}
            {!isLoading &&
              !isEmpty &&
              sentences.map(sentence => (
                <BaseCard key={sentence.id} style={styles.sentenceCard} shadowSize="small">
                  <ArticleSentence
                    sentence={{
                      id: sentence.id,
                      english: sentence.english,
                      arabic: sentence.arabic,
                      audio_url: sentence.audio_url,
                    }}
                    words={sentence.sentence_words}
                    colors={colors}
                    highlightRootId={word?.root_id}
                    containerStyle={styles.sentenceContainer}
                  />
                </BaseCard>
              ))}
          </ScrollView>
        </View>
      </Modal>
    );
  },
);

WordSentencesBottomSheet.displayName = 'WordSentencesBottomSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  wordSection: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  arabicText: {
    textAlign: 'center',
  },
  englishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    includeFontPadding: false,
    lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1),
  },
  centeredContainer: {
    paddingVertical: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
  },
  sentenceCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sentenceContainer: {
    marginVertical: 0,
  },
});
