import { Stack } from 'expo-router';
import type { JSX } from 'react';
import { Platform, Text } from 'react-native';

import EditModeButton from '@/components/ui/EditModeButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab } from '@/types/enums';

export default function ListenLayout(): JSX.Element {
  const colors = useColors();

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
                    {AppTab.LISTEN}
                  </Text>
                ),
                headerRight: () => <EditModeButton type="listen" hideWhenEmpty={true} />,
              }
            : {
                title: AppTab.LISTEN,
                headerTitleStyle: { color: colors.headingText },
                headerRight: () => <EditModeButton type="listen" hideWhenEmpty={true} />,
              }),
        }}
      />
    </Stack>
  );
}
