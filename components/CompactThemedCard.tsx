import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import Animated from 'react-native-reanimated';
import { useCardAnimation } from '@/hooks/animations';

interface CompactThemedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}

export function CompactThemedCard({ children, onPress, style }: CompactThemedCardProps) {
  const colors = useColors();
  const { animatedStyle, handlePressIn, handlePressOut } = useCardAnimation();

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          {
            shadowColor: colors.cardShadow,
            borderColor: colors.cardBorder,
          },
          style,
        ]}
      >
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>{children}</View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    overflow: 'hidden',
    elevation: 3,
    ...LAYOUT.SHADOW.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    padding: LAYOUT.CARD.PADDING.SMALL,
  },
});
