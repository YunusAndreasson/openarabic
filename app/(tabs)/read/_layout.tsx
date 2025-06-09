import { Stack } from 'expo-router';
import React from 'react';

import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';
import type { ArticleParams, FilterParams } from '@/types/navigation.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

/**
 * Get display title for filter screen based on route params
 */
function getFilterTitle(params: FilterParams): string {
  const { type, name } = params;

  if (type === 'category' && name) {
    return capitalizeFirstLetter(decodeURIComponent(name));
  }

  if (type === 'category') {
    return 'Category';
  }

  return 'Filter';
}

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
        options={({ route }) =>
          createNavigationOptions(colors, {
            title: getFilterTitle(route.params as FilterParams),
          })
        }
      />
      <Stack.Screen
        name="article"
        options={({ route }) => {
          const params = route.params as ArticleParams;

          return createNavigationOptions(colors, {
            title: params.headerTitle || 'Article',
          });
        }}
      />
      <Stack.Screen
        name="account"
        options={createNavigationOptions(colors, {
          headerShown: false,
        })}
      />
    </Stack>
  );
}
