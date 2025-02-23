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
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          shadowColor: '#000000',
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.container}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 6,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginVertical: LAYOUT.CARD.MARGIN.SMALL,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.CARD.PADDING.SMALL,
    paddingHorizontal: LAYOUT.CARD.PADDING.SMALL,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
