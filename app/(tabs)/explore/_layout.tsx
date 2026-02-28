import { Stack, router } from 'expo-router';
import type { JSX } from 'react';

import { CloseButton } from '@/components/ui';
import { HeaderProfile } from '@/components/HeaderProfile';
import { STRINGS } from '@/constants/strings';
import { createNavigationOptions, createTabHeaderOptions } from '@/utils/navigation';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab, UiAction } from '@/types/enums';
import type { FilterParams } from '@/types/navigation.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

/**
 * Get display title for filter screen based on route params
 */
function getFilterTitle(params: FilterParams): string {
  const { type, name } = params;

  if (name) {
    const decodedName = decodeURIComponent(name);
    const capitalizedName = capitalizeFirstLetter(decodedName);

    // For author names that might be long, truncate if necessary
    if (type === 'author' && capitalizedName.length > 20) {
      return capitalizedName.substring(0, 17) + '...';
    }

    return capitalizedName;
  }

  if (type === 'category') {
    return STRINGS.CATEGORY;
  }

  if (type === 'author') {
    return STRINGS.AUTHOR_ARTICLES;
  }

  return UiAction.FILTER;
}

export default function LibraryLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createTabHeaderOptions({
          title: AppTab.EXPLORE,
          rightComponent: () => <HeaderProfile size={32} />,
          colors,
        })}
      />
      <Stack.Screen
        name="account"
        options={createNavigationOptions(colors, {
          headerShown: false,
        })}
      />

      <Stack.Screen
        name="filter"
        options={({ route }) => {
          const params = route.params as FilterParams;

          return createNavigationOptions(colors, {
            title: getFilterTitle(params),
            headerLeft: () => <CloseButton onPress={() => router.back()} />,
          });
        }}
      />
    </Stack>
  );
}
