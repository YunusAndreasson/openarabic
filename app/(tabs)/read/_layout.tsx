import { Stack, router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';

import FilterButton from '@/components/FilterButton';
import { createNavigationOptions } from '@/constants/modal';
import { getFilterModalRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { FilterParams } from '@/types/navigation.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

/**
 * Get display title for filter screen based on route params
 */
function getFilterTitle(params: FilterParams): string {
  const { type, name } = params;

  if (type === 'bookmark') {
    return STRINGS.BOOKMARKS;
  }

  if (type === 'category' && name) {
    return capitalizeFirstLetter(decodeURIComponent(name));
  }

  if (type === 'category') {
    return STRINGS.CATEGORY;
  }

  return STRINGS.FILTER;
}

const FilterHeaderRight = ({ categoryId }: { categoryId: number }) => {
  const handlePress = useCallback(() => {
    router.push(getFilterModalRoute(categoryId));
  }, [categoryId]);

  return <FilterButton onPress={handlePress} />;
};

export default function ReadLayout(): JSX.Element {
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
        name="filterModal"
        options={createNavigationOptions(colors, {
          title: STRINGS.FILTERS,
        })}
      />
      <Stack.Screen
        name="account"
        options={createNavigationOptions(colors, {
          headerShown: false,
        })}
      />
      <Stack.Screen
        name="article"
        options={{
          headerShown: false, // Full-screen modal with drag indicator only
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="filter"
        options={({ route }) => {
          const params = route.params as FilterParams;
          const categoryId = parseInt(params.id ?? '', 10);

          return createNavigationOptions(colors, {
            title: getFilterTitle(params),
            headerRight: () => <FilterHeaderRight categoryId={categoryId} />,
          });
        }}
      />
    </Stack>
  );
}
