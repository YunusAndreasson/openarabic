import { Stack, router } from 'expo-router';
import type { JSX } from 'react';
import { View } from 'react-native';

import { HeaderProfile } from '@/components/HeaderProfile';
import { DoneButton } from '@/components/ui/DoneButton';
import { STRINGS } from '@/constants/strings';
import { createNavigationOptions } from '@/utils/navigation';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab, UiAction } from '@/types/enums';
import type { FilterParams } from '@/types/navigation.types';
import { createTabHeaderOptions } from '@/utils/navigation/createTabHeaderOptions';
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

const FilterHeaderLeft = () => {
  // Always show Done button on the left for all filter screens
  return <DoneButton onPress={() => router.back()} />;
};

// Minimal spacer to maintain layout balance
const FilterHeaderRight = () => <View style={{ width: 20, height: 44 }} />;

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
            headerLeft: () => <FilterHeaderLeft />,
            headerRight: () => <FilterHeaderRight />,
          });
        }}
      />
    </Stack>
  );
}
