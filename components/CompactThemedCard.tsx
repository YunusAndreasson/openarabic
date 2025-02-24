import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';

interface CompactThemedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
}

export function CompactThemedCard({ children, onPress }: CompactThemedCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { shadowColor: colors.shadow },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    overflow: 'hidden',
    elevation: LAYOUT.Z_INDEX.CARD,
    ...LAYOUT.SHADOW.MEDIUM,
  },
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
});
