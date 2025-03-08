import React, { useState, memo, useMemo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, TextStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { SentenceWord } from '@/types/vocabulary.types';
import { WordDetailsModal } from './WordDetailsModal';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface ArabicWordProps {
  word: SentenceWord;
  isSelected: boolean;
  onPress: (word: SentenceWord) => void;
  scale?: number;
  baseSize?: number;
}

function ArabicWordComponent({
  word,
  isSelected,
  onPress,
  scale = 1,
  baseSize = 32,
}: ArabicWordProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Create a shared value for the scale effect
  const scaleAnim = useSharedValue(1);

  // Apply scale animation when isSelected changes
  React.useEffect(() => {
    scaleAnim.value = withSpring(isSelected ? 1.02 : 1, {
      damping: 8,
      stiffness: 40,
    });
  }, [isSelected, scaleAnim]);

  const handlePress = useCallback(() => {
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleStudyPress = useCallback(() => {
    onPress(word);

    // Invalidate the dueWords query to refresh the vocabulary screen
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });
    }
  }, [onPress, word, queryClient, user]);

  // Determine the text color based on whether the word is selected for study
  const textColor = isSelected ? colors.tint : colors.text;

  // Memoize the text style to prevent unnecessary re-renders
  const textStyle = useMemo(
    () => ({
      ...getArabicTextStyle(baseSize * scale, {
        color: textColor,
        fontWeight: isSelected ? '600' : ('normal' as TextStyle['fontWeight']),
        textShadowColor: isSelected ? colors.textShadowLight : 'transparent',
        textShadowRadius: isSelected ? 1 : 0,
        textShadowOffset: { width: 0, height: 0 },
      }),
    }),
    [textColor, baseSize, scale, isSelected, colors.textShadowLight]
  );

  // Memoize the underline style
  const underlineStyle = useMemo(
    () => ({
      ...styles.underline,
      width: `${Math.min(100, word.word_form.length * 90)}%` as any,
      backgroundColor: isDarkMode
        ? colors.borderOverlay // Use borderOverlay color in dark mode
        : colors.textOverlay, // Use textOverlay color in light mode
    }),
    [isDarkMode, colors.borderOverlay, colors.textOverlay, word.word_form.length]
  );

  // Create animated container style with scale transform
  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
    };
  });

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.wordContainer}>
        <Animated.View style={[styles.wordWrapper, animatedContainerStyle]}>
          <ThemedText style={textStyle} skipDefaultColor>
            {word.word_form}
          </ThemedText>

          {/* Enhanced underline for selected words */}
          {isSelected && <View style={underlineStyle} />}
        </Animated.View>
      </TouchableOpacity>
      <WordDetailsModal
        visible={modalVisible}
        onClose={handleModalClose}
        word={word}
        isSelected={isSelected}
        onStudyPress={handleStudyPress}
      />
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ArabicWord = memo(ArabicWordComponent);

const styles = StyleSheet.create({
  wordContainer: {
    marginHorizontal: LAYOUT.SPACING.TINY / 2,
    marginVertical: LAYOUT.SPACING.TINY / 2,
  },
  wordWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  arabicText: {
    fontFamily: 'NotoNaskhArabic',
  },
  underline: {
    height: 1.5,
    position: 'absolute',
    bottom: -1.5,
    alignSelf: 'center',
    borderRadius: LAYOUT.SPACING.TINY,
  },
});
