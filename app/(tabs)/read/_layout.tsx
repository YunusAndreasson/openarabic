import { Stack, router } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';
import { Platform, Text } from 'react-native';

import FilterButton from '@read/FilterButton';

import { HeaderProfile } from '@/components/HeaderProfile';
import DoneButton from '@/components/ui/DoneButton';
import { LAYOUT } from '@/constants/layout';
import { createNavigationOptions } from '@/constants/modal';
import { getFilterModalRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab, UiAction } from '@/types/enums';
import type { FilterParams } from '@/types/navigation.types';
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
    return STRINGS.CATEGORY;
  }

  return UiAction.FILTER;
}

const FilterHeaderLeft = () => {
  // Always show Done button on the left for all filter screens
  return <DoneButton onPress={() => router.back()} />;
};

const FilterHeaderRight = ({ categoryId }: { categoryId: number }) => {
  const handleFilterPress = useCallback(() => {
    router.push(getFilterModalRoute(categoryId));
  }, [categoryId]);

  // For categories, show filter button on the right
  return <FilterButton onPress={handleFilterPress} />;
};

export default function ReadLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          // Normalize header background and title color on both platforms
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.headingText,
          headerShadowVisible: false,
          ...(Platform.OS === 'ios'
            ? {
                // Use a custom left title on iOS to guarantee left alignment with system font
                headerTitle: '',
                headerLeft: () => (
                  <Text
                    style={{
                      fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
                      fontWeight: '600',
                      color: colors.headingText,
                    }}
                    numberOfLines={1}
                  >
                    {AppTab.READ}
                  </Text>
                ),
                headerRight: () => <HeaderProfile size={32} />,
              }
            : {
                title: AppTab.READ,
                headerTitleStyle: { color: colors.headingText },
                headerRight: () => <HeaderProfile size={32} />,
              }),
        }}
      />
      <Stack.Screen
        name="filterModal"
        options={createNavigationOptions(colors, {
          title: UiAction.FILTERS,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
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
          const categoryId = parseInt(params.id ?? '', 10);

          return createNavigationOptions(colors, {
            title: getFilterTitle(params),
            headerLeft: () => <FilterHeaderLeft />,
            headerRight: () => <FilterHeaderRight categoryId={categoryId} />,
          });
        }}
      />
    </Stack>
  );
}
