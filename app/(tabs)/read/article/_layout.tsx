import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';

import { useToast } from '@/components/providers/ToastProvider';
import { Colors } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback } from '@/utils/haptics';

function ArticleHeaderRight() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const { showToast } = useToast();

  const articleId = React.useMemo(() => {
    if (!id) return undefined;
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? undefined : parsed;
  }, [id]);

  const { article, isInReadingList, refetchReadingListStatus, isLoadingReadingList } =
    useArticleData(articleId, user?.id);

  const { handleToggleReadingList } = useArticleMutations(user?.id, refetchReadingListStatus);

  // Show loading state for authenticated users
  if (!user) {
    return null;
  }

  // Show placeholder while loading
  if (!article) {
    return (
      <TouchableOpacity
        disabled
        style={{
          padding: 8,
          marginRight: 4,
          opacity: 0.3,
        }}
      >
        <Ionicons name="headset-outline" size={24} color={colors.tint} />
      </TouchableOpacity>
    );
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
}

export default function ArticleLayout(): JSX.Element {
  const colorScheme = useColorScheme();

  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.title || '',
          headerBackTitle: 'Read',
          headerTitleAlign: 'left',
          headerTransparent: false,
          headerRight: () => <ArticleHeaderRight />,
          headerStyle: {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontSize: LAYOUT.HEADER.TITLE.SECONDARY.fontSize,
            fontWeight: LAYOUT.HEADER.TITLE.SECONDARY.fontWeight as any,
            color: Colors[colorScheme ?? 'light'].text,
          },
          headerTintColor: Colors[colorScheme ?? 'light'].tint,
        })}
      />
    </Stack>
  );
}
