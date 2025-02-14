import React from 'react';
import { StyleSheet, View, Image, Pressable } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import { ThemedText } from './ThemedText';

interface ThemedCardProps {
  imageUrl: string;
  title: string;
  category: string;
  author: string;
  onPress?: () => void;
}

export default function ThemedCard({
  imageUrl,
  title,
  category,
  author,
  onPress,
}: ThemedCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.cardBorder,
            shadowColor: colors.text,
          },
        ]}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.contentContainer}>
          <ThemedText
            style={[styles.category, { color: colors.categoryText }]}
            type="defaultSemiBold"
          >
            {category.toUpperCase()}
          </ThemedText>
          <ThemedText style={styles.title} type="subtitle">
            {title}
          </ThemedText>
          <ThemedText style={[styles.author, { color: colors.authorText }]}>By {author}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 200,
  },
  contentContainer: {
    padding: 16,
  },
  category: {
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    marginBottom: 8,
  },
  author: {
    fontSize: 14,
  },
});
