import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloatingButton from '@/components/FloatingButton';
import { LAYOUT } from '@/constants/layout';
import { ThemeColors } from '../../types/ui/theme.types';
import { AnimatedStyleProp } from 'react-native-reanimated';

const styles = StyleSheet.create({
  floatingButton: {
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  staticButtonsContainer: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER + 1, // Higher than other content
  },
  userButtonActive: {
    opacity: 1,
  },
  userButtonInactive: {
    opacity: 0.3,
  },
});

interface ArticleButtonsProps {
  backButtonStyle?: AnimatedStyleProp<ViewStyle>;
  bookmarkButtonStyle?: AnimatedStyleProp<ViewStyle>;
  playButtonStyle?: AnimatedStyleProp<ViewStyle>;
  onBackPress: () => void;
  onBookmarkPress: () => void;
  onPlayPress: () => void;
  colors: ThemeColors;
  isBookmarked: boolean;
  user: { id: string } | null;
  isInReadingList: boolean | undefined;
  initialBookmarkIcon: 'bookmark-outline' | 'bookmark';
  isPlaying: boolean;
  isDarkMode: boolean;
}

export const ArticleButtons = ({
  backButtonStyle,
  bookmarkButtonStyle,
  playButtonStyle,
  onBackPress,
  onBookmarkPress,
  onPlayPress,
  colors,
  user,
  isInReadingList,
  initialBookmarkIcon,
  isPlaying,
  isDarkMode,
}: ArticleButtonsProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.staticButtonsContainer}>
      {/* Back button */}
      <FloatingButton
        position="top-left"
        buttonType="back"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={backButtonStyle}
        onPress={onBackPress}
        iconName="chevron-back"
        accessibilityLabel="Return to previous screen"
        colors={colors}
        isDarkMode={isDarkMode}
        style={{
          ...styles.floatingButton,
          left: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
        }}
      />

      {/* ALWAYS show bookmark button regardless of user state */}
      <FloatingButton
        position="top-right"
        buttonType="bookmark"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={bookmarkButtonStyle}
        onPress={user ? onBookmarkPress : () => {}}
        iconName={user ? initialBookmarkIcon : 'bookmark-outline'}
        accessibilityLabel={isInReadingList ? 'Remove from reading list' : 'Add to reading list'}
        colors={colors}
        isDarkMode={isDarkMode}
        isBookmarked={user ? isInReadingList : false}
        style={{
          ...styles.floatingButton,
          right: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.TINY,
          ...(user ? styles.userButtonActive : styles.userButtonInactive),
        }}
      />

      {/* Play/Stop button */}
      <FloatingButton
        position="top-right"
        buttonType="play"
        top={insets.top + LAYOUT.SPACING.MEDIUM}
        animatedStyle={playButtonStyle}
        iconName={isPlaying ? 'stop' : 'play'}
        accessibilityLabel={isPlaying ? 'Stop audio' : 'Play audio'}
        onPress={onPlayPress}
        colors={colors}
        isDarkMode={isDarkMode}
        style={{
          ...styles.floatingButton,
          right: LAYOUT.BUTTON.HEIGHT.MEDIUM + LAYOUT.SPACING.MEDIUM + 10,
        }}
      />
    </View>
  );
};
