import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

import { useToast } from '@/components/providers/ToastProvider';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import type { FilterParams, ArticleParams } from '@/types/navigation.types';
import { lightFeedback } from '@/utils/haptics';

/**
 * Determines the appropriate title for the filter screen based on parameters
 */
function getFilterTitle(params: FilterParams): string {
  // Use the dynamic title if available, otherwise fall back to type-based title
  return params.headerTitle || (params.type === 'author' ? 'Author' : 'Category');
}

/**
 * Beautiful centered header title component for articles
 */
const ArticleHeaderTitle = React.memo(({ title }: { title: string }) => {
  const colors = useColors();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingHorizontal: 8,
        maxWidth: '100%',
      }}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: colors.text,
          textAlign: 'center',
        }}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {title}
      </Text>
    </View>
  );
});

/**
 * Header right component for article screens with listening list toggle
 */
const ArticleHeaderRight = React.memo(({ articleId }: { articleId: number }) => {
  const { user } = useAuth();
  const colors = useColors();
  const { showToast } = useToast();

  const { isInReadingList, refetchReadingListStatus, isLoadingReadingList } = useArticleData(
    articleId,
    user!.id
  );

  const { handleToggleReadingList } = useArticleMutations(user?.id, refetchReadingListStatus);

  // Early return if no user
  if (!user) {
    return null;
  }

  const handlePress = () => {
    lightFeedback();
    handleToggleReadingList(articleId, isInReadingList);

    // Show toast message
    if (isInReadingList) {
      showToast('Removed from listening list', 3000, 'success');
    } else {
      showToast('Added to listening list', 3000, 'success');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isLoadingReadingList}
      style={{
        padding: 8,
        marginRight: 4,
        opacity: isLoadingReadingList ? 0.6 : 1,
      }}
      accessibilityLabel={isInReadingList ? 'Remove from listening list' : 'Add to listening list'}
      accessibilityRole="button"
    >
      <Ionicons
        name={isInReadingList ? 'headset' : 'headset-outline'}
        size={24}
        color={colors.tint}
      />
    </TouchableOpacity>
  );
});

export default function ReadLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Use tab header for main screen with HeaderProfile
        }}
      />
      <Stack.Screen
        name="filter"
        options={({ route }) => ({
          headerShown: true,
          title: getFilterTitle(route.params as FilterParams),
          headerTitleAlign: 'left',
          headerTransparent: false,
          presentation: 'modal',
          gestureEnabled: true,
        })}
      />
      <Stack.Screen
        name="article"
        options={({ route }) => {
          const params = route.params as ArticleParams;
          const articleId = parseInt(params.id, 10); // We know this will always be valid

          return {
            headerShown: true,
            headerTitle: () => <ArticleHeaderTitle title={params.headerTitle!} />,
            headerBackTitle: 'Read',
            headerTitleAlign: 'center',
            headerTransparent: false,
            headerRight: () => <ArticleHeaderRight articleId={articleId} />,
            presentation: 'modal',
            gestureEnabled: true,
          };
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          headerShown: false, // Let account layout handle its own header
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
