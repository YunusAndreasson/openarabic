import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { CompactAudioPlayButton } from './CompactAudioPlayButton';
import { CompactThemedCard } from './CompactThemedCard';
import { LAYOUT } from '@/constants/layout';

interface PlaylistCardProps {
  title: string;
  category: string;
  author: string;
  audioUrl: string;
  onRemove: () => void;
  onPress?: () => void;
}

export default function PlaylistCard({
  title,
  author,
  audioUrl,
  onRemove,
  onPress,
}: PlaylistCardProps): React.JSX.Element {
  const colors = useColors();

  return (
    <CompactThemedCard onPress={onPress}>
      <View style={styles.leftContainer}>
        <CompactAudioPlayButton audioUrl={audioUrl} size={20} />
      </View>
      <View style={styles.textContainer}>
        <ThemedText numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.author} numberOfLines={1}>
          {author}
        </ThemedText>
      </View>
      <Pressable onPress={onRemove} style={styles.removeButton} hitSlop={12}>
        <Ionicons name="close-circle" size={20} color={colors.tint} style={styles.removeIcon} />
      </Pressable>
    </CompactThemedCard>
  );
}

const styles = StyleSheet.create({
  leftContainer: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
  textContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: 0.6,
  },
  removeButton: {
    padding: LAYOUT.SPACING.TINY,
    marginRight: -LAYOUT.SPACING.TINY,
  },
  removeIcon: {
    opacity: 0.8,
  },
});
