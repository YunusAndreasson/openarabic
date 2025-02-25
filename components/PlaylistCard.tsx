import React, { useMemo } from 'react';
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
  category,
  author,
  audioUrl,
  onRemove,
  onPress,
}: PlaylistCardProps): React.JSX.Element {
  const colors = useColors();

  const removeIconStyle = useMemo(
    () => [
      styles.removeIcon,
      {
        color: colors.tint,
        opacity: LAYOUT.OPACITY.DIMMED,
      },
    ],
    [colors.tint]
  );

  const categoryStyle = useMemo(() => [styles.category, { color: colors.tint }], [colors.tint]);

  return (
    <CompactThemedCard onPress={onPress}>
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          <CompactAudioPlayButton audioUrl={audioUrl} size={20} />
        </View>
        <View style={styles.textContainer}>
          <ThemedText numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          <View style={styles.metaContainer}>
            <ThemedText style={categoryStyle} skipDefaultColor numberOfLines={1}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </ThemedText>
            <ThemedText style={styles.author} numberOfLines={1}>
              {author}
            </ThemedText>
          </View>
        </View>
        <Pressable
          onPress={onRemove}
          style={styles.removeButton}
          hitSlop={12}
          accessibilityLabel="Remove from playlist"
          accessibilityRole="button"
        >
          <View style={[styles.removeIconContainer, { borderColor: colors.cardBorder + '40' }]}>
            <Ionicons name="close-circle" size={20} style={removeIconStyle} />
          </View>
        </Pressable>
      </View>
    </CompactThemedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  leftContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  removeButton: {
    padding: LAYOUT.SPACING.TINY,
    alignSelf: 'center',
  },
  removeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    backgroundColor: 'transparent',
  },
  removeIcon: {
    opacity: 0.8,
  },
});
