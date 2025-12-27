import { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ArticleSentence } from '@/components/article/ArticleSentence';
import { BaseCard } from '@/components/common';
import { DoneButton, HeaderIconButton } from '@/components/ui';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
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
    const playWordAudio = useWordAudioPlayback({
      showErrorToast: true,
      errorMessage: 'Word audio playback failed',
    });

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
    const englishText = useMemo(
      () => capitalizeFirstLetter(word?.root?.meaning || ''),
      [word?.root?.meaning],
    );
    const dotColorKey = useMemo(
      () => getStabilityProgressColor(word?.fsrs_stability),
      [word?.fsrs_stability],
    );

    // Settings for ArticleSentence
    const sentenceSettings = useMemo(() => ({ showEnglish: true }), []);

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
            <DoneButton onPress={onClose} />
            <View style={styles.headerSpacer} />
            {word?.root?.audio_url && (
              <HeaderIconButton iconName="volume-high" onPress={handlePlayAudio} size="medium" />
            )}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Word Section - Arabic, English, and memory dot */}
            <View style={styles.wordSection}>
              <ThemedText
                type="arabic"
                arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XXLARGE}
                weight="semibold"
                style={styles.arabicText}
              >
                {arabicText}
              </ThemedText>

              <View style={styles.englishRow}>
                <View style={[styles.memoryDot, { backgroundColor: colors[dotColorKey] }]} />
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
                    settings={sentenceSettings}
                    colors={colors}
                    highlightRootId={word?.root_id as number}
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
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    includeFontPadding: false,
    lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.1),
  },
  memoryDot: {
    width: LAYOUT.SPACING.SMALL,
    height: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.SPACING.TINY,
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
