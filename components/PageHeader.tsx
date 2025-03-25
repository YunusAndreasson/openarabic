import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { PageHeaderProps } from '@/types/ui/layout.types';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Page header with styled blur effect
 */
const PageHeader = React.memo(({ title, onBackPress }: PageHeaderProps) => {
  const colors = useColors();
  const isDarkMode = colors.background === '#121212';
  const intensity = Platform.OS === 'ios' ? 80 : 100;
  const insets = useSafeAreaInsets();

  const handleBackPress = useCallback(() => {
    if (onBackPress) {
      onBackPress();
    }
  }, [onBackPress]);

  return (
    <View style={styles.wrapper}>
      <BlurView
        intensity={intensity}
        tint={isDarkMode ? 'dark' : 'light'}
        style={[
          styles.blurContainer,
          {
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)',
          },
          Platform.select({
            ios: {
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
              shadowRadius: LAYOUT.SPACING.SMALL / 2,
            },
            android: {
              elevation: 8,
            },
          }),
        ]}
      >
        <View
          style={[
            styles.container,
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
                  backgroundColor: pressed ? colors.textOverlay : 'transparent',
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
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  blurContainer: {
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    flexDirection: 'row',
    alignItems: 'center',
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
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
