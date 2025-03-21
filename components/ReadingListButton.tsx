import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { readingListService } from '../services/readingList';
import { useAuth } from '../hooks/useAuth';
import { successFeedback } from '@/utils/haptics';
import Toast from 'react-native-toast-message';
import { LAYOUT } from '../constants/layout';
import { ThemedButton } from './ThemedButton';
import { ReadingListButtonProps } from '@/types/ui.types';

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
        successFeedback();
      }

      setIsInReadingList(!isInReadingList);
      Toast.show({
        type: isInReadingList ? 'info' : 'success',
        text1: isInReadingList ? 'Removed from playlist' : 'Added to playlist',
        position: 'bottom',
      });
    } catch (error) {
      console.error('Error toggling reading list', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update playlist',
        position: 'bottom',
      });
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
