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

  const categoryStyle = useMemo(
    () => [
      styles.category,
      {
        color: colors.authorText,
      },
    ],
    [colors.authorText]
  );

  const playButtonContainerStyle = useMemo(
    () => [
      styles.playButtonContainer,
      {
        backgroundColor: colors.tint + '10',
        borderColor: colors.tint + '30',
      },
    ],
    [colors.tint]
  );

  const playButtonStyle = useMemo(
    () => ({
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    }),
    []
  );

  return (
    <CompactThemedCard onPress={onPress}>
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          <View style={playButtonContainerStyle}>
            <CompactAudioPlayButton
              audioUrl={audioUrl}
              size={20}
              style={playButtonStyle}
              iconColor={colors.tint}
              activeIconColor={colors.tint}
            />
          </View>
        </View>
        <View style={styles.textContainer}>
          <View style={styles.row}>
            <ThemedText numberOfLines={1} style={styles.title}>
              {title}
            </ThemedText>
          </View>
          <View style={styles.metaContainer}>
            <ThemedText style={categoryStyle} skipDefaultColor numberOfLines={1}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </ThemedText>
            <ThemedText
              style={[styles.author, { color: colors.authorText }]}
              skipDefaultColor
              numberOfLines={1}
            >
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
            <Ionicons name="close-circle" size={18} style={removeIconStyle} />
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
    paddingVertical: LAYOUT.SPACING.TINY + 1,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    minHeight: 48,
  },
  leftContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center',
  },
  playButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
  textContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.TINY,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    flex: 1,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  category: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL - 1,
    fontWeight: '400',
    marginRight: LAYOUT.SPACING.SMALL,
    opacity: 0.8,
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL - 1,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  removeButton: {
    padding: 2,
    alignSelf: 'center',
  },
  removeIconContainer: {
    width: 28,
    height: 28,
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
