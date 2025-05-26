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
  onEnglishToggle: () => void;
  isInReadingList?: boolean;
  initialBookmarkIcon: 'bookmark-outline' | 'bookmark';
  isPlaying: boolean;
  showEnglish: boolean;
  backButtonStyle?: AnimatedStyleProp<ViewStyle>;
  bookmarkButtonStyle?: AnimatedStyleProp<ViewStyle>;
  englishButtonStyle?: AnimatedStyleProp<ViewStyle>;
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
    paddingHorizontal: 0,
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
        shadowOpacity: LAYOUT.OPACITY.LIGHT,
        shadowRadius: 3,
      },
      android: {
        elevation: LAYOUT.ELEVATION.SMALL,
      },
    }),
  },
});

export const ArticleButtons: React.FC<ArticleButtonsProps> = ({
  onBackPress,
  onBookmarkPress,
  onPlayPress,
  onEnglishToggle,
  isInReadingList,
  initialBookmarkIcon,
  isPlaying,
  showEnglish,
  backButtonStyle,
  bookmarkButtonStyle,
  englishButtonStyle,
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

  // Neutral button style - matches pill inactive state
  const neutralButtonStyle = {
    backgroundColor: isDarkMode ? colors.elevation2 : colors.elevation1,
    borderWidth: 0, // Remove border for cleaner pill-like appearance
  };

  // Determine icon colors - matches pill text colors
  const neutralIconColor = colors.text; // Use theme text color
  const activeIconColor = colors.tint; // Use theme tint color for active state

  const shadowColorStyle = Platform.OS === 'ios' ? { shadowColor: colors.black } : {};

  return (
    <Animated.View style={styles.buttonContainer}>
      <View style={styles.leftButtonGroup}>
        <Animated.View style={backButtonStyle}>
          <TouchableOpacity
            onPress={onBackPress}
            style={[
              styles.backButton,
              neutralButtonStyle, // Back button should be neutral for navigation
              styles.buttonShadow,
              shadowColorStyle,
            ]}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={neutralIconColor} />
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
                neutralButtonStyle, // Always use neutral style, even when bookmarked
                styles.buttonShadow,
                shadowColorStyle,
              ]}
              accessibilityLabel={
                isInReadingList ? 'Remove from reading list' : 'Add to reading list'
              }
            >
              <Ionicons
                name={bookmarkIcon}
                size={22}
                color={neutralIconColor} // Always use neutral icon color
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* English Toggle Button */}
        <Animated.View style={englishButtonStyle}>
          <TouchableOpacity
            onPress={onEnglishToggle}
            style={[
              styles.iconButton,
              neutralButtonStyle, // Always use neutral style like other buttons
              styles.buttonShadow,
              shadowColorStyle,
            ]}
            accessibilityLabel={
              showEnglish ? 'Hide English translation' : 'Show English translation'
            }
          >
            <Ionicons
              name={showEnglish ? 'document-text' : 'document-text-outline'}
              size={22}
              color={neutralIconColor}
            />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={playButtonStyle}>
          <TouchableOpacity
            onPress={onPlayPress}
            style={[
              styles.iconButton,
              neutralButtonStyle, // Always use neutral style, not active when playing
              styles.buttonShadow,
              shadowColorStyle,
            ]}
            accessibilityLabel={isPlaying ? 'Stop audio' : 'Play audio'}
          >
            <Ionicons
              name={isPlaying ? 'stop' : 'play'}
              size={22}
              color={neutralIconColor} // Always use neutral icon color
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default ArticleButtons;
