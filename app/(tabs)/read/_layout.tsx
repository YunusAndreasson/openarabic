import { Stack } from 'expo-router';

export default function ReadLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="filter" options={{ headerShown: false }} />
      <Stack.Screen name="article" options={{ headerShown: false }} />
    </Stack>
  );
}
