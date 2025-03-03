import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Dimensions, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { TransitionType, startAnimation, getAnimationStyles } from '../utils/animationUtils';
import type { StudyWord } from '../hooks/useSpacedRepetition';

interface WordReviewCardProps {
  word?: StudyWord;
  transitionType?: TransitionType;
  isVisible: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WordReviewCard = React.memo(
  ({ word, transitionType = 'fade', isVisible }: WordReviewCardProps) => {
    const colors = useColors();

    // Animation values
    const fadeOpacity = useRef(new Animated.Value(0)).current;
    const slidePosition = useRef(new Animated.Value(SCREEN_WIDTH)).current;

    const animationConfig = {
      fadeOpacity,
      slidePosition,
      screenWidth: SCREEN_WIDTH,
    };

    // Animation styles based on transition type
    const { containerStyle } = getAnimationStyles(animationConfig, transitionType);

    // Run animation when word changes or becomes visible
    useEffect(() => {
      if (word && isVisible) {
        startAnimation(animationConfig, transitionType);
      }
    }, [word, isVisible, transitionType]);

    // Handle case when no word is provided
    if (!word || !word.sentence_word) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
          },
          containerStyle, // Apply the appropriate animation style
        ]}
      >
        <View style={styles.wordContainer}>
          <ThemedText style={[styles.arabicWord, { color: colors.arabicText }]} skipDefaultColor>
            {word.sentence_word.word_form}
          </ThemedText>

          <ThemedText style={styles.englishWord}>{word.sentence_word.english}</ThemedText>

          {word.sentence_word.sentence?.arabic && (
            <View style={styles.sentenceContainer}>
              <ThemedText
                style={[styles.arabicSentence, { color: `${colors.arabicText}CC` }]}
                skipDefaultColor
              >
                {word.sentence_word.sentence.arabic}
              </ThemedText>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }
);

WordReviewCard.displayName = 'WordReviewCard';

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    margin: LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    minHeight: 200,
    ...LAYOUT.SHADOW.MEDIUM,
  },
  wordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicWord: {
    fontSize: 42,
    textAlign: 'center',
    fontFamily: 'NotoNaskhArabic',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  englishWord: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  sentenceContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    borderTopWidth: 1,
    borderTopColor: '#00000020',
    paddingTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  arabicSentence: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    textAlign: 'right',
    fontFamily: 'NotoNaskhArabic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.8,
  },
});
