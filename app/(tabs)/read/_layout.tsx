import { Stack } from 'expo-router';

export default function ReadLayout() {
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
        options={{
          headerShown: true,
          title: 'Filter',
          headerBackTitle: 'Read',
        }}
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
