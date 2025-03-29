import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import FloatingButton from '@/components/FloatingButton';
import { LAYOUT } from '@/constants/layout';
import { Tables } from '@/types/database.types';

const styles = StyleSheet.create({
  staticButtonsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER + 1, // Higher than other content
  },
  floatingButton: {
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  userButtonActive: {
    opacity: 1,
  },
  userButtonInactive: {
    opacity: 0.3,
  },
});

type ArticleButtonsProps = {
  backButtonStyle: any;
  bookmarkButtonStyle: any;
  playButtonStyle: any;
  handleBackPress: () => void;
  handleBookmarkPress: () => void;
  handlePlayPress: () => void;
  isInReadingList: boolean | undefined;
  initialBookmarkIcon: 'bookmark-outline' | 'bookmark';
  isPlaying: boolean;
  colors: any;
  isDarkMode: boolean;
  user: any;
};

export const ArticleButtons = ({
  backButtonStyle,
  bookmarkButtonStyle,
  playButtonStyle,
  handleBackPress,
  handleBookmarkPress,
  handlePlayPress,
  isInReadingList,
  initialBookmarkIcon,
  isPlaying,
  colors,
  isDarkMode,
  user,
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
        onPress={handleBackPress}
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
        onPress={user ? () => handleBookmarkPress() : () => {}}
        iconName={initialBookmarkIcon}
        accessibilityLabel={isInReadingList ? 'Remove from reading list' : 'Add to reading list'}
        colors={colors}
        isDarkMode={isDarkMode}
        isBookmarked={isInReadingList}
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
        onPress={handlePlayPress}
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
