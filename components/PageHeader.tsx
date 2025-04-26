import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BlurTint } from 'expo-blur';
import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { PageHeaderProps } from '@/types/ui/layout.types';

import { ThemedText } from './ThemedText';

/**
 * Page header with styled blur effect
 */
const PageHeader = memo(({ title, onBackPress }: PageHeaderProps) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const intensity = 55;
  const insets = useSafeAreaInsets();

  const handleBackPress = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    }
  }, [onBackPress]);

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: colors.transparent,
        borderBottomColor: colors.borderOverlay,
        zIndex: LAYOUT.Z_INDEX.HEADER - 1,
      },
      onBackPress && styles.wrapperWithBack,
    ],
    [colors.transparent, colors.borderOverlay, onBackPress]
  );

  const headerStyle = useMemo(
    () => [
      styles.blurContainer,
      {
        backgroundColor: Platform.OS === 'ios' ? colors.transparent : colors.background,
        borderBottomColor: colors.borderOverlay,
        borderBottomWidth: StyleSheet.hairlineWidth,
        ...(Platform.OS === 'ios' 
          ? {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
          shadowRadius: LAYOUT.SPACING.SMALL / 2,
            }
          : {
              elevation: 8,
        }),
      },
    ],
    [colors.borderOverlay, colors.shadow, colors.transparent, colors.background]
  );

  const HeaderContainer = Platform.OS === 'ios' ? BlurView : View;
  const blurProps = Platform.OS === 'ios' ? {
    intensity,
    tint: (isDarkMode ? 'dark' : 'light') as BlurTint,
  } : {};

  return (
    <View style={containerStyle}>
      <HeaderContainer
        style={headerStyle}
        {...blurProps}
      >
        <View
          style={[
            styles.contentContainer,
            {
              paddingTop: insets.top + LAYOUT.SPACING.TINY,
            },
          ]}
        >
          <View style={styles.headerRow}>
            {onBackPress ? (
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
            ) : null}
            <View style={[styles.titleContainer, onBackPress && styles.titleWithBack]}>
              <ThemedText type="heading3">{title}</ThemedText>
            </View>
          </View>
        </View>
      </HeaderContainer>
    </View>
  );
});

const styles = StyleSheet.create({
  backButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginLeft: -LAYOUT.SPACING.SMALL,
    padding: LAYOUT.SPACING.SMALL,
  },
  blurContainer: {
    borderBottomWidth: 0,
    height: '100%',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  container: {
    borderBottomWidth: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    width: '100%',
  },
  contentContainer: {
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  titleContainer: {
    flexGrow: 1,
    flexShrink: 1,
  },
  titleWithBack: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  wrapperWithBack: {
    // Add any necessary styles for the wrapper when onBackPress is true
  },
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
