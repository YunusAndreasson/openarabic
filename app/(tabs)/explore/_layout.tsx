import { Stack } from 'expo-router';
import { useCallback, type JSX } from 'react';

import { CloseButton } from '@/components/ui';
import { HeaderProfile } from '@/components/explore/HeaderProfile';
import { STRINGS } from '@/constants/strings';
import { createNavigationOptions, createTabHeaderOptions } from '@/utils/navigation';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab } from '@/types/enums';
import type { FilterParams } from '@/types/navigation.types';
import { getCategoryDisplayName } from '@/utils/stringUtils';

/**
 * Get display title for filter screen based on route params
 */
function getFilterTitle(params: FilterParams | undefined): string {
  const name = params?.name;

  if (name) {
    return getCategoryDisplayName(decodeURIComponent(name));
  }

  return STRINGS.CATEGORY;
}

const renderHeaderProfile = () => <HeaderProfile />;
const renderCloseButton = () => <CloseButton />;

export default function LibraryLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createTabHeaderOptions({
          title: AppTab.EXPLORE,
          rightComponent: renderHeaderProfile,
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
        options={useCallback(
          ({ route }) => {
            // `route.params` is `object | undefined` — a screen reached without
            // its query string really does arrive with nothing here, which the
            // previous `as FilterParams` cast asserted away and then destructured.
            const params: FilterParams | undefined = route.params;

            return createNavigationOptions(colors, {
              title: getFilterTitle(params),
              headerRight: renderCloseButton,
            });
          },
          [colors],
        )}
      />
    </Stack>
  );
}
