import { Stack } from 'expo-router';
import { useCallback, type JSX } from 'react';

import { ExploreSearchButton } from '@/components/explore/ExploreSearchButton';
import { CloseButton } from '@/components/ui';
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

const renderCloseButton = () => <CloseButton />;
const renderSearchButton = () => <ExploreSearchButton />;

export default function LibraryLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        // Search is the one action this screen has: the account avatar that used
        // to sit here is now the Account tab, and everything else Explore does,
        // it does by being browsed.
        options={createTabHeaderOptions({
          title: AppTab.EXPLORE,
          rightComponent: renderSearchButton,
        })}
      />
      <Stack.Screen
        name="search"
        // Pushed, not the modal `filter` gets: search is a place inside the
        // library rather than something presented over it, and the back button
        // is the way out. `useNativeTitle` keeps the title a plain string —
        // UIKit hangs the search controller off a real UILabel.
        options={createNavigationOptions(colors, {
          title: STRINGS.SEARCH_TEXTS_TITLE,
          isRegularScreen: true,
          useNativeTitle: true,
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
