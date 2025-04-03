import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArabicWord } from './ArabicWord';
import { Colors } from '../../constants/Colors';
import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import type { Tables } from '@/types/database.types';

interface ArticleSentenceProps {
  sentence: {
    id: string | number;
    english?: string;
  };
  words: any[]; // Words are passed as a separate prop
  renderWord?: (word: any) => React.ReactNode; // Function to render words
  onWordPress?: (word: any) => void; // Optional if renderWord is provided
  settings?: any;
  colors?: any;
  containerStyle?: any;
  scale?: number;
  baseSize?: number;
}

function ArticleSentenceComponent({
  sentence,
  words,
  renderWord,
  onWordPress,
  settings,
  colors: propColors,
  containerStyle,
  scale = 1,
  baseSize = 32,
}: ArticleSentenceProps) {
  const defaultColors = useColors();
  const colors = propColors || defaultColors;
  const { highlightSentence } = useLocalSearchParams<{ highlightSentence?: string }>();
  const isHighlighted = sentence.id != null && highlightSentence === sentence.id.toString();

  // Use highlight animation with Reanimated
  const highlightOpacity = useSharedValue(0);

  useEffect(() => {
    if (isHighlighted) {
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 1000 })
      );
    }
  }, [isHighlighted, highlightOpacity]);

  const animatedHighlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.View
        style={[
          styles.sentenceBackground,
          {
            backgroundColor: colors.tint ? `${colors.tint}40` : Colors.light.transparent,
          },
          animatedHighlightStyle,
        ]}
      />
      <View style={styles.wordsContainer}>
        {renderWord
          ? words.map(word => renderWord(word))
          : words.map((word, index) => (
              <ArabicWord
                key={`${word.id}-${index}`}
                word={word}
                onPress={onWordPress!}
                scale={scale}
                baseSize={baseSize}
              />
            ))}
      </View>
      {settings?.showEnglish && sentence.english && (
        <Animated.Text
          style={{
            fontFamily: 'Philosopher',
            color: colors.text,
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * (settings.fontScale || 1),
            opacity: 0.8,
            paddingLeft: LAYOUT.SPACING.SMALL,
            paddingBottom: LAYOUT.SPACING.SMALL,
          }}
        >
          {sentence.english}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    overflow: 'visible',
  },
  sentenceBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  wordsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL / 2,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingRight: LAYOUT.SPACING.SMALL,
    minHeight: 40,
    width: '100%',
  },
});

export const ArticleSentence = memo(ArticleSentenceComponent);
