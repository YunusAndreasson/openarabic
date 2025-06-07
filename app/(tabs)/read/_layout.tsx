import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';

export default function ReadLayout() {
  const colorScheme = useColorScheme();

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
        options={({ route }) => ({
          headerShown: true,
          title: (route.params as any)?.headerTitle || 'Filter',
          headerBackTitle: 'Read',
          headerTitleAlign: 'left',
          headerTransparent: false,
          presentation: 'modal',
          headerStyle: {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontSize: LAYOUT.HEADER.TITLE.SECONDARY.fontSize,
            fontWeight: LAYOUT.HEADER.TITLE.SECONDARY.fontWeight as any,
            color: Colors[colorScheme ?? 'light'].text,
          },
          headerTintColor: Colors[colorScheme ?? 'light'].tint,
        })}
      />
      <Stack.Screen
        name="article"
        options={{
          headerShown: false, // Let article layout handle its own header
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          headerShown: false, // Let account layout handle its own header
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
