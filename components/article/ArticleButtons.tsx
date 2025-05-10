import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Platform, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimatedStyleProp } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';

interface ArticleButtonsProps {
  onBackPress: () => void;
  onBookmarkPress: () => void;
  onPlayPress: () => void;
  isInReadingList?: boolean;
  initialBookmarkIcon: 'bookmark-outline' | 'bookmark';
  isPlaying: boolean;
  backButtonStyle?: AnimatedStyleProp<ViewStyle>;
  bookmarkButtonStyle?: AnimatedStyleProp<ViewStyle>;
  playButtonStyle?: AnimatedStyleProp<ViewStyle>;
  colors: ThemeColors;
  user: any;
  isDarkMode: boolean;
}

const styles = StyleSheet.create({
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginRight: LAYOUT.SPACING.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    width: '100%',
    zIndex: 100,
  },
  leftButtonGroup: {
    flexDirection: 'row',
  },
  rightButtonGroup: {
    flexDirection: 'row',
  },
  iconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginLeft: LAYOUT.SPACING.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});

export const ArticleButtons: React.FC<ArticleButtonsProps> = ({
  onBackPress,
  onBookmarkPress,
  onPlayPress,
  isInReadingList,
  initialBookmarkIcon,
  isPlaying,
  backButtonStyle,
  bookmarkButtonStyle,
  playButtonStyle,
  colors,
  user,
  isDarkMode,
}) => {
  const [bookmarkIcon, setBookmarkIcon] = useState<'bookmark-outline' | 'bookmark'>(
    initialBookmarkIcon
  );

  useEffect(() => {
    setBookmarkIcon(isInReadingList ? 'bookmark' : 'bookmark-outline');
  }, [isInReadingList]);

  // Common button styles for translucent overlay effect
  const buttonStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
  };

  return (
    <Animated.View style={styles.buttonContainer}>
      <View style={styles.leftButtonGroup}>
        <Animated.View style={backButtonStyle}>
          <TouchableOpacity
            onPress={onBackPress}
            style={[styles.backButton, styles.buttonShadow, buttonStyle]}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.rightButtonGroup}>
        {user && (
          <Animated.View style={bookmarkButtonStyle}>
            <TouchableOpacity
              onPress={onBookmarkPress}
              style={[styles.iconButton, styles.buttonShadow, buttonStyle]}
              accessibilityLabel={
                isInReadingList ? 'Remove from reading list' : 'Add to reading list'
              }
            >
              <Ionicons name={bookmarkIcon} size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View style={playButtonStyle}>
          <TouchableOpacity
            onPress={onPlayPress}
            style={[styles.iconButton, styles.buttonShadow, buttonStyle]}
            accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default ArticleButtons;
