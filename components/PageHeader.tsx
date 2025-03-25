import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { PageHeaderProps } from '@/types/ui/layout.types';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

/**
 * Page header with styled blur effect
 */
const PageHeader = React.memo(({ title, onBackPress }: PageHeaderProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  // Match tabbar intensity values for consistency
  const intensity = Platform.OS === 'ios' ? 55 : 80;
  const insets = useSafeAreaInsets();

  const handleBackPress = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    }
  }, [onBackPress]);

  // Consistent background color with tabbar
  const backgroundColor = isDarkMode ? colors.modalOverlay : colors.overlay;

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor, // Fallback background color
        borderBottomColor: colors.borderOverlay,
      },
      onBackPress && styles.wrapperWithBack,
    ],
    [backgroundColor, colors.borderOverlay, onBackPress]
  );

  // Memoize blur container styles for performance
  const blurContainerStyle = useMemo(
    () => [
      styles.blurContainer,
      {
        backgroundColor: colors.transparent, // Allow blur to work through
        borderBottomColor: colors.borderOverlay,
        borderBottomWidth: StyleSheet.hairlineWidth,
        ...(Platform.OS === 'ios' && {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
          shadowRadius: LAYOUT.SPACING.SMALL / 2,
        }),
      },
    ],
    [colors.borderOverlay, colors.shadow, colors.transparent]
  );

  return (
    <View style={containerStyle}>
      <BlurView
        intensity={intensity}
        tint={isDarkMode ? 'dark' : 'light'}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={blurContainerStyle}
      >
        <View
          style={[
            styles.contentContainer,
            {
              paddingTop: insets.top + LAYOUT.SPACING.TINY,
            },
          ]}
        >
          {onBackPress && (
            <Pressable
              onPress={handleBackPress}
              style={({ pressed }) => [
                styles.backButton,
                {
                  backgroundColor: pressed ? colors.textOverlay : colors.transparent,
                  opacity: pressed ? LAYOUT.OPACITY.PRESSED : 1,
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color={colors.tint} />
            </Pressable>
          )}
          <View style={[styles.titleContainer, onBackPress && styles.titleWithBack]}>
            <ThemedText type="heading3">{title}</ThemedText>
          </View>
        </View>
      </BlurView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
    width: '100%',
    borderBottomWidth: 0,
    overflow: 'hidden', // Ensure blur is contained
  },
  blurContainer: {
    width: '100%',
    height: '100%',
    borderBottomWidth: 0,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    ...Platform.select({
      android: {
        elevation: 8,
      },
    }),
  },
  contentContainer: {
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  titleContainer: {
    flexShrink: 1,
  },
  titleWithBack: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  backButton: {
    padding: LAYOUT.SPACING.SMALL,
    marginLeft: -LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  wrapperWithBack: {
    // Add any necessary styles for the wrapper when onBackPress is true
  },
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
