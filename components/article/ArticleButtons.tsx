import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, Platform, TouchableOpacity } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

interface ArticleButtonsProps {
  onBackPress?: () => void; // Made optional since we don't want back button anymore
  onBookmarkPress: () => void;
  onPlayPress?: () => void;
  onEnglishToggle: () => void;
  onTextSizeToggle: () => void;
  isInReadingList?: boolean;
  isPlaying: boolean;
  showEnglish: boolean;
  showTextSizeSlider: boolean;
  bookmarkButtonStyle?: AnimatedStyleProp<ViewStyle>;
  englishButtonStyle?: AnimatedStyleProp<ViewStyle>;
  playButtonStyle?: AnimatedStyleProp<ViewStyle>;
  textSizeButtonStyle?: AnimatedStyleProp<ViewStyle>;
  colors: ThemeColors;
  user: { id: string } | null;
  isDarkMode: boolean;
}

const styles = StyleSheet.create({
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: LAYOUT.SPACING.SMALL,
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  buttonOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  buttonShadow: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: LAYOUT.OPACITY.SUBTLE,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
    overflow: 'hidden',
    width: LAYOUT.BUTTON.HEIGHT.MEDIUM,
  },

  rightButtonGroup: {
    flexDirection: 'row',
  },
});

// IconWithShadow moved outside ArticleButtons
const IconWithShadow = ({
  name,
  size,
  isDarkMode,
  colors,
  iconColor,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size: number;
  isDarkMode: boolean;
  colors: ThemeColors;
  iconColor: string;
}) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    {/* More subtle shadow layer */}
    <Ionicons
      color={isDarkMode ? withOpacity(colors.black, 0.4) : withOpacity(colors.shadow, 0.3)}
      name={name}
      size={size}
      style={{
        position: 'absolute',
        top: 0.5,
        left: 0,
      }}
    />
    {/* Main icon with reduced opacity */}
    <Ionicons color={iconColor} name={name} size={size} />
  </View>
);

// ButtonWrapper moved outside ArticleButtons
const ButtonWrapper = ({
  children,
  style,
  blurButtonStyle,
  overlayStyle,
  buttonShadow,
  shadowColorStyle,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  blurButtonStyle: any;
  overlayStyle: any;
  buttonShadow: any;
  shadowColorStyle: any;
}) => (
  <View style={[style, blurButtonStyle, buttonShadow, shadowColorStyle]}>
    <View style={[styles.buttonOverlay, overlayStyle]} />
    {children}
  </View>
);

export const ArticleButtons: React.FC<ArticleButtonsProps> = ({
  onBookmarkPress,
  onPlayPress,
  onEnglishToggle,
  onTextSizeToggle,
  isInReadingList,
  isPlaying,
  showEnglish,
  showTextSizeSlider,
  bookmarkButtonStyle,
  englishButtonStyle,
  playButtonStyle,
  textSizeButtonStyle,
  colors,
  user,
  isDarkMode,
}) => {
  // Modern blur-based button style with subtle backdrop
  const blurButtonStyle = {
    backgroundColor: Colors.light.transparent,
    borderWidth: 0,
  };

  // More subtle semi-transparent overlay to reduce visual prominence
  const overlayStyle = {
    backgroundColor: isDarkMode
      ? withOpacity(colors.background, 0.18)
      : withOpacity(colors.background, 0.25),
  };

  // More subtle icon color with reduced contrast for better text focus
  const iconColor = isDarkMode ? withOpacity(colors.white, 0.75) : withOpacity(colors.text, 0.75);

  const shadowColorStyle = Platform.OS === 'ios' ? { shadowColor: colors.shadow } : {};

  return (
    <Animated.View style={styles.buttonContainer}>
      <View style={styles.rightButtonGroup}>
        {user && (
          <Animated.View style={bookmarkButtonStyle}>
            <ButtonWrapper
              style={styles.iconButton}
              blurButtonStyle={blurButtonStyle}
              overlayStyle={overlayStyle}
              buttonShadow={styles.buttonShadow}
              shadowColorStyle={shadowColorStyle}
            >
              <TouchableOpacity
                accessibilityLabel={isInReadingList ? 'Remove bookmark' : 'Add bookmark'}
                style={StyleSheet.absoluteFill}
                onPress={onBookmarkPress}
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
                    isDarkMode={isDarkMode}
                    colors={colors}
                    iconColor={iconColor}
                  />
                </View>
              </TouchableOpacity>
            </ButtonWrapper>
          </Animated.View>
        )}

        {/* English Toggle Button */}
        <Animated.View style={englishButtonStyle}>
          <ButtonWrapper
            style={styles.iconButton}
            blurButtonStyle={blurButtonStyle}
            overlayStyle={overlayStyle}
            buttonShadow={styles.buttonShadow}
            shadowColorStyle={shadowColorStyle}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              accessibilityLabel={
                showEnglish ? 'Hide English translation' : 'Show English translation'
              }
              onPress={onEnglishToggle}
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <IconWithShadow
                  name={showEnglish ? 'eye' : 'eye-off'}
                  size={22}
                  isDarkMode={isDarkMode}
                  colors={colors}
                  iconColor={iconColor}
                />
              </View>
            </TouchableOpacity>
          </ButtonWrapper>
        </Animated.View>

        {/* Text Size Button */}
        <Animated.View style={textSizeButtonStyle}>
          <ButtonWrapper
            style={styles.iconButton}
            blurButtonStyle={blurButtonStyle}
            overlayStyle={overlayStyle}
            buttonShadow={styles.buttonShadow}
            shadowColorStyle={shadowColorStyle}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              accessibilityLabel={
                showTextSizeSlider ? 'Hide text size controls' : 'Show text size controls'
              }
              onPress={onTextSizeToggle}
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <IconWithShadow
                  name="text"
                  size={22}
                  isDarkMode={isDarkMode}
                  colors={colors}
                  iconColor={iconColor}
                />
              </View>
            </TouchableOpacity>
          </ButtonWrapper>
        </Animated.View>

        {onPlayPress && (
          <Animated.View style={playButtonStyle}>
            <ButtonWrapper
              style={styles.iconButton}
              blurButtonStyle={blurButtonStyle}
              overlayStyle={overlayStyle}
              buttonShadow={styles.buttonShadow}
              shadowColorStyle={shadowColorStyle}
            >
              <TouchableOpacity
                accessibilityLabel={isPlaying ? 'Stop audio' : 'Play audio'}
                style={StyleSheet.absoluteFill}
                onPress={onPlayPress}
              >
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <IconWithShadow
                    name={isPlaying ? 'stop' : 'play'}
                    size={22}
                    isDarkMode={isDarkMode}
                    colors={colors}
                    iconColor={iconColor}
                  />
                </View>
              </TouchableOpacity>
            </ButtonWrapper>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
};

export default ArticleButtons;
