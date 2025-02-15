import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Image, Pressable, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
}: ThemedCardProps): React.JSX.Element {
  const colors = useColors();
  const [imageLoading, setImageLoading] = useState(true);

  const handlePressIn = useCallback(() => {}, []);
  const handlePressOut = useCallback(() => {}, []);
  const handleLoadStart = useCallback(() => setImageLoading(true), []);
  const handleLoadEnd = useCallback(() => setImageLoading(false), []);

  const themedStyles = {
    card: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
      shadowColor: colors.text,
    },
    loadingContainer: {
      backgroundColor: colors.cardBackground,
    },
    gradient: {
      colors: ['transparent', 'transparent', colors.cardBackground] as const,
    },
    categoryBackground: {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    category: {
      color: colors.tint,
    },
    author: {
      color: colors.authorText,
    },
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={[styles.card, themedStyles.card]}>
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={[styles.loadingContainer, themedStyles.loadingContainer]}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          )}
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
          />
          <LinearGradient
            colors={themedStyles.gradient.colors}
            locations={[0, 0.6, 1]}
            style={styles.gradient}
          />
          <View style={styles.categoryContainer}>
            <BlurView intensity={35} tint="dark" style={styles.categoryPill}>
              <View style={[styles.categoryBackground, themedStyles.categoryBackground]}>
                <ThemedText style={[styles.category, themedStyles.category]} type="defaultSemiBold">
                  {category.toUpperCase()}
                </ThemedText>
              </View>
            </BlurView>
          </View>
        </View>
        <View style={styles.contentContainer}>
          <ThemedText style={styles.title} type="subtitle" numberOfLines={2}>
            {title}
          </ThemedText>
          <View style={styles.authorContainer}>
            <ThemedText style={[styles.author, themedStyles.author]} skipDefaultColor>
              {author}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: 20,
    borderWidth: 0.5,
    overflow: 'hidden',
    elevation: 6,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 160,
  },
  categoryContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    overflow: 'hidden',
    borderRadius: 8,
  },
  categoryPill: {
    borderRadius: 8,
  },
  categoryBackground: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  category: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 24,
  },
  title: {
    marginBottom: 12,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  author: {
    fontSize: 14,
    opacity: 0.9,
    letterSpacing: 0.2,
  },
});
