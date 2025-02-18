import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { CompactAudioPlayButton } from './CompactAudioPlayButton';

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
  category,
  author,
  audioUrl,
  onRemove,
  onPress,
}: PlaylistCardProps): React.JSX.Element {
  const colors = useColors();

  return (
    <Pressable style={[styles.card, { backgroundColor: colors.cardBackground }]} onPress={onPress}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  leftContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  author: {
    fontSize: 13,
    opacity: 0.6,
  },
  removeButton: {
    padding: 6,
    marginRight: -6,
  },
  removeIcon: {
    opacity: 0.8,
  },
});
