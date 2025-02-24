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
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    elevation: LAYOUT.Z_INDEX.CARD,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: LAYOUT.OPACITY.OVERLAY,
    shadowRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
  },
});
