import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, Platform, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
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
  isPlaying: boolean;
  showEnglish: boolean;
  backButtonStyle?: AnimatedStyleProp<ViewStyle>;
  bookmarkButtonStyle?: AnimatedStyleProp<ViewStyle>;
  englishButtonStyle?: AnimatedStyleProp<ViewStyle>;
  playButtonStyle?: AnimatedStyleProp<ViewStyle>;
  colors: ThemeColors;
  user: { id: string } | null;
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
    overflow: 'hidden',
  },
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: LAYOUT.SPACING.SMALL,
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.HEADER,
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
    overflow: 'hidden',
  },
  buttonShadow: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: LAYOUT.OPACITY.LIGHT,
        shadowRadius: 4,
      },
      android: {
        elevation: LAYOUT.ELEVATION.SMALL,
      },
    }),
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  buttonOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
});

export const ArticleButtons: React.FC<ArticleButtonsProps> = ({
  onBackPress,
  onBookmarkPress,
  onPlayPress,
  onEnglishToggle,
  isInReadingList,
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
  // Modern blur-based button style with subtle backdrop
  const blurButtonStyle = {
    backgroundColor: 'transparent',
    borderWidth: 0,
  };

  // Semi-transparent overlay for better contrast
  const overlayStyle = {
    backgroundColor: isDarkMode
      ? 'rgba(26, 33, 27, 0.25)' // Much more transparent dark overlay
      : 'rgba(253, 254, 253, 0.35)', // Much more transparent light overlay
  };

  // Icon color with better contrast and subtle shadow
  const iconColor = colors.text;
  const iconShadowStyle = {
    textShadowColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(42, 52, 65, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  };

  const shadowColorStyle = Platform.OS === 'ios' ? { shadowColor: colors.shadow } : {};

  const IconWithShadow = ({
    name,
    size,
  }: {
    name: keyof typeof Ionicons.glyphMap;
    size: number;
  }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Shadow layer */}
      <Ionicons
        name={name}
        size={size}
        color={isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(42, 52, 65, 0.6)'}
        style={{
          position: 'absolute',
          top: 1,
          left: 0,
        }}
      />
      {/* Main icon */}
      <Ionicons name={name} size={size} color={iconColor} />
    </View>
  );

  const ButtonWrapper = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
    <View style={[style, blurButtonStyle, styles.buttonShadow, shadowColorStyle]}>
      <BlurView
        intensity={isDarkMode ? 35 : 25}
        tint={isDarkMode ? 'dark' : 'light'}
        style={styles.blurContainer}
      />
      <View style={[styles.buttonOverlay, overlayStyle]} />
      {children}
    </View>
  );

  return (
    <Animated.View style={styles.buttonContainer}>
      <View style={styles.leftButtonGroup}>
        <Animated.View style={backButtonStyle}>
          <ButtonWrapper style={styles.backButton}>
            <TouchableOpacity
              onPress={onBackPress}
              style={StyleSheet.absoluteFill}
              accessibilityLabel="Go back"
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <IconWithShadow name="arrow-back" size={24} />
              </View>
            </TouchableOpacity>
          </ButtonWrapper>
        </Animated.View>
      </View>

      <View style={styles.rightButtonGroup}>
        {user && (
          <Animated.View style={bookmarkButtonStyle}>
            <ButtonWrapper style={styles.iconButton}>
              <TouchableOpacity
                onPress={onBookmarkPress}
                style={StyleSheet.absoluteFill}
                accessibilityLabel={isInReadingList ? 'Remove bookmark' : 'Bookmark article'}
              >
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <IconWithShadow
                    name={isInReadingList ? 'bookmark' : 'bookmark-outline'}
                    size={22}
                  />
                </View>
              </TouchableOpacity>
            </ButtonWrapper>
          </Animated.View>
        )}

        {/* English Toggle Button */}
        <Animated.View style={englishButtonStyle}>
          <ButtonWrapper style={styles.iconButton}>
            <TouchableOpacity
              onPress={onEnglishToggle}
              style={StyleSheet.absoluteFill}
              accessibilityLabel={
                showEnglish ? 'Hide English translation' : 'Show English translation'
              }
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <IconWithShadow name={showEnglish ? 'eye' : 'eye-off'} size={22} />
              </View>
            </TouchableOpacity>
          </ButtonWrapper>
        </Animated.View>

        <Animated.View style={playButtonStyle}>
          <ButtonWrapper style={styles.iconButton}>
            <TouchableOpacity
              onPress={onPlayPress}
              style={StyleSheet.absoluteFill}
              accessibilityLabel={isPlaying ? 'Stop audio' : 'Play audio'}
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <IconWithShadow name={isPlaying ? 'stop' : 'play'} size={22} />
              </View>
            </TouchableOpacity>
          </ButtonWrapper>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default ArticleButtons;
