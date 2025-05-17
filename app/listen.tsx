import React, { JSX, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, WORD_AREA_MIN_HEIGHT } from '@/constants/layout';
import { useListen } from '@/hooks/useListen';
import { ListenHeader, CompletionScreen } from '@/components/listen';
import { WordDisplay } from '@/components/review';
import { useColors } from '@/hooks/useColors';
import { useWordSizing } from '@/hooks/useWordSizing';

/**
 * Screen that plays Arabic words followed by their English translations
 * with visual indication of which language is currently being spoken
 */
const fontConfig = {
  minFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 1.6,
  maxFontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE * 3.3,
  minScreenWidth: 320,
  maxScreenWidth: 500,
};

export default function ListenScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const fromVocabulary = params.fromVocabulary === 'true';

  const {
    currentArabicWord,
    currentEnglishMeaning,
    progress,
    maxProgress,
    progressAnimationKey,
    isComplete,
    isTransitioning,
    handleClose,
  } = useListen({ fromVocabulary });

  const colors = useColors();
  const wordFontSize = useWordSizing(currentArabicWord, fontConfig);

  // Use memoized handler to prevent re-renders
  const onCloseHandler = useCallback(() => {
    // Add a small delay to ensure cleanup is complete
    setTimeout(() => {
      handleClose();
    }, 50);
  }, [handleClose]);

  if (isComplete || isTransitioning) {
    return (
      <CompletionScreen
        onClose={onCloseHandler}
        title="Listening Complete!"
        subtitle="You've listened to all the vocabulary words in this session."
        buttonText="Close"
        buttonVariant="outlined"
        iconName="checkmark-circle-outline"
        iconSize={120}
        useThemedView
        buttonStyle={{ minWidth: 180 }}
      />
    );
  }

  return (
    <ThemedView style={styles.container} useSafeArea={true}>
      <View style={styles.contentContainer}>
        <ListenHeader
          progress={progress}
          maxProgress={maxProgress}
          animationKey={progressAnimationKey}
          onClose={handleClose}
        />

        <View style={styles.wordArea}>
          <WordDisplay
            word={currentArabicWord}
            translation={currentEnglishMeaning}
            fontSize={wordFontSize}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.noteContainer}>
            <Ionicons
              name="headset-outline"
              size={16}
              color={colors.tabIconDefault}
              style={styles.noteIcon}
            />
            <ThemedText style={styles.noteText}>Audio continues with screen off</ThemedText>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  wordArea: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: WORD_AREA_MIN_HEIGHT,
  },
  footer: {
    width: '100%',
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIcon: {
    marginRight: LAYOUT.SPACING.TINY,
    opacity: 0.6,
  },
  noteText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: 0.6,
  },
});
