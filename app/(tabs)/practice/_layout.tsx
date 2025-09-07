import { Stack, router } from 'expo-router';
import type { JSX } from 'react';
import { Platform, Text } from 'react-native';

import DoneButton from '@/components/ui/DoneButton';
import EditModeButton from '@/components/ui/EditModeButton';
import { LAYOUT } from '@/constants/layout';
import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { AppTab, UiAction } from '@/types/enums';

export default function VocabularyLayout(): JSX.Element {
  const colors = useColors();
  const { editMode } = useEditMode('dictionary');

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.headingText,
          headerShadowVisible: false,
          ...(Platform.OS === 'ios'
            ? {
                headerTitle: '',
                headerLeft: () => (
                  <Text
                    style={{
                      fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
                      fontWeight: '600',
                      color: colors.headingText,
                    }}
                  >
                    {AppTab.PRACTICE}
                  </Text>
                ),
              }
            : { title: AppTab.PRACTICE, headerTitleStyle: { color: colors.headingText } }),
        }}
      />
      <Stack.Screen
        name="dictionary"
        options={createNavigationOptions(colors, {
          title: UiAction.DICTIONARY,
          // Only show DoneButton when NOT in edit mode to avoid duplicate "Done" buttons
          headerLeft: editMode ? undefined : () => <DoneButton onPress={() => router.back()} />,
          headerRight: () => <EditModeButton type="dictionary" />,
        })}
      />
    </Stack>
  );
}
