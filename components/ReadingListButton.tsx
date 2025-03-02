import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { readingListService } from '../services/reading_list';
import { useAuth } from '../hooks/useAuth';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { LAYOUT } from '../constants/layout';
import { ThemedButton } from './ThemedButton';

interface ReadingListButtonProps {
  articleId: number;
  style?: StyleProp<ViewStyle>;
}

export function ReadingListButton({ articleId }: ReadingListButtonProps) {
  const [isInReadingList, setIsInReadingList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: isAuthLoading } = useAuth();

  const checkReadingListStatus = useCallback(async () => {
    if (!user) return;

    try {
      const status = await readingListService.isInReadingList(user.id, articleId);
      setIsInReadingList(status);
    } catch (error) {
      console.error('Error checking reading list status', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, articleId]);

  useEffect(() => {
    if (user && !isAuthLoading) {
      checkReadingListStatus();
    } else {
      setIsLoading(false);
    }
  }, [user, articleId, isAuthLoading, checkReadingListStatus]);

  const toggleReadingList = useCallback(async () => {
    if (!user) return;

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
    } catch (error) {
      console.error('Error toggling reading list', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, articleId, isInReadingList]);

  return (
    <View style={styles.container}>
      <ThemedButton
        variant={isInReadingList ? 'outlined' : 'filled'}
        title={isInReadingList ? 'In playlist' : 'Add to playlist'}
        icon={isInReadingList ? 'bookmark' : 'bookmark-outline'}
        onPress={toggleReadingList}
        disabled={!user || isLoading}
        loading={isLoading}
        style={styles.button}
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
