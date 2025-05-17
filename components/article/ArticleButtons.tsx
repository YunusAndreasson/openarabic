import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Platform, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
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
    backgroundColor: colors.buttonOverlayActive,
    borderColor: colors.buttonBorderOverlay,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  };

  const iconColor = isDarkMode ? colors.white : colors.black;

  const shadowColorStyle = Platform.OS === 'ios' ? { shadowColor: colors.black } : {};

  return (
    <Animated.View style={styles.buttonContainer}>
      <View style={styles.leftButtonGroup}>
        <Animated.View style={backButtonStyle}>
          <TouchableOpacity
            onPress={onBackPress}
            style={[
              styles.backButton,
              { backgroundColor: colors.buttonOverlay },
              styles.buttonShadow,
              shadowColorStyle,
              buttonStyle,
            ]}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.rightButtonGroup}>
        {user && (
          <Animated.View style={bookmarkButtonStyle}>
            <TouchableOpacity
              onPress={onBookmarkPress}
              style={[
                styles.iconButton,
                { backgroundColor: colors.buttonOverlay },
                styles.buttonShadow,
                shadowColorStyle,
                buttonStyle,
              ]}
              accessibilityLabel={
                isInReadingList ? 'Remove from reading list' : 'Add to reading list'
              }
            >
              <Ionicons name={bookmarkIcon} size={22} color={iconColor} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <Animated.View style={playButtonStyle}>
          <TouchableOpacity
            onPress={onPlayPress}
            style={[
              styles.iconButton,
              { backgroundColor: colors.buttonOverlay },
              styles.buttonShadow,
              shadowColorStyle,
              buttonStyle,
            ]}
            accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={iconColor} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default ArticleButtons;
