import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Animated, TouchableOpacity } from 'react-native';
import { readingListService } from '../services/reading_list';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

interface ReadingListButtonProps {
  articleId: number;
  style?: any;
}

export function ReadingListButton({ articleId }: ReadingListButtonProps) {
  const [isInReadingList, setIsInReadingList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (user && !isAuthLoading) {
      checkReadingListStatus();
    } else {
      setIsLoading(false);
    }
  }, [user, articleId, isAuthLoading]);

  const checkReadingListStatus = async () => {
    try {
      const status = await readingListService.isInReadingList(user!.id, articleId);
      setIsInReadingList(status);
    } catch {
      throw new Error('Error checking reading list status');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReadingList = async () => {
    if (!user) {
      return;
    }

    animatePress();
    setIsLoading(true);
    try {
      if (isInReadingList) {
        await readingListService.removeFromReadingList(user.id, articleId);
      } else {
        await readingListService.addToReadingList(user.id, articleId);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: 'success',
          text1: 'Added to playlist',
          text2: 'Ready for listening on the go',
          position: 'bottom',
          visibilityTime: 3000,
        });
      }
      setIsInReadingList(!isInReadingList);
    } catch {
      throw new Error('Error toggling reading list');
    } finally {
      setIsLoading(false);
    }
  };

  const wrapperStyles = [
    styles.buttonWrapper,
    {
      transform: [{ scale: scaleAnim }],
      backgroundColor: colors.background,
      shadowColor: colors.text,
      borderColor: isInReadingList ? colors.tint : colors.background,
      borderWidth: 1,
    },
  ];

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: isInReadingList ? colors.cardBackground : colors.tint,
    },
  ];

  const textStyles = [
    styles.buttonText,
    {
      color: isInReadingList ? colors.tint : colors.background,
      opacity: isInReadingList ? 0.9 : 1,
    },
  ];

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <Animated.View style={wrapperStyles}>
          <TouchableOpacity
            style={buttonStyles}
            onPress={toggleReadingList}
            disabled={!user || isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons
                name={isInReadingList ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isInReadingList ? colors.tint : colors.background}
              />
              <ThemedText style={textStyles} skipDefaultColor>
                {isInReadingList ? 'In playlist' : 'Add to playlist'}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    minHeight: 52,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
