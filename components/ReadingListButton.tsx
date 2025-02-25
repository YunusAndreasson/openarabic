import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { readingListService } from '../services/reading_list';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../hooks/useColors';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { LAYOUT } from '../constants/layout';
import { ThemedButton } from './ThemedButton';

interface ReadingListButtonProps {
  articleId: number;
  style?: any;
}

export function ReadingListButton({ articleId, style }: ReadingListButtonProps) {
  const [isInReadingList, setIsInReadingList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();

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
      console.error('Error checking reading list status');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReadingList = async (event: any) => {
    if (!user) {
      return;
    }

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
      console.error('Error toggling reading list');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedButton
        variant={isInReadingList ? 'outlined' : 'filled'}
        title={isInReadingList ? 'In playlist' : 'Add to playlist'}
        icon={isInReadingList ? 'bookmark' : 'bookmark-outline'}
        onPress={toggleReadingList}
        disabled={!user || isLoading}
        loading={isLoading}
        style={[styles.button, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
  button: {
    width: '100%',
  },
});
