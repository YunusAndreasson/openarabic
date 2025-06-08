import { Stack } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/hooks/theme/useColors';
import type { ArticleParams } from '@/types/navigation.types';

interface FilterParams {
  type: string;
  id?: string;
}

/**
 * Get display title for filter screen based on route params
 */
function getFilterTitle(params: FilterParams): string {
  const { type, id } = params;

  if (type === 'category' && id) {
    return 'Category';
  }

  return 'Filter';
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

export default function ReadLayout() {
  const colors = useColors();

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
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
          headerTintColor: colors.headingText,
        })}
      />
      <Stack.Screen
        name="article"
        options={({ route }) => {
          const params = route.params as ArticleParams;

          return {
            headerShown: true,
            headerTitle: () => <ArticleHeaderTitle title={params.headerTitle!} />,
            headerBackTitle: 'Read',
            headerTitleAlign: 'center',
            headerTransparent: false,
            presentation: 'modal',
            gestureEnabled: true,
            animation: 'fade',
            animationDuration: 300,
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.tint,
            headerBackTitleStyle: {
              fontSize: 16,
            },
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
