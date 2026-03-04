import { Stack, router } from 'expo-router';
import type { JSX } from 'react';

import { CloseButton } from '@/components/ui';
import { HeaderProfile } from '@/components/HeaderProfile';
import { STRINGS } from '@/constants/strings';
import { createNavigationOptions, createTabHeaderOptions } from '@/utils/navigation';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab } from '@/types/enums';
import type { FilterParams } from '@/types/navigation.types';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

/**
 * Get display title for filter screen based on route params
 */
function getFilterTitle(params: FilterParams): string {
  const { name } = params;

  if (name) {
    return capitalizeFirstLetter(decodeURIComponent(name));
  }

  return STRINGS.CATEGORY;
}

export default function LibraryLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createTabHeaderOptions({
          title: AppTab.EXPLORE,
          rightComponent: () => <HeaderProfile />,
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
