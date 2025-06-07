import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="classicalTexts" options={{ headerShown: false }} />
      <Stack.Screen name="learningMethod" options={{ headerShown: false }} />
      <Stack.Screen name="islamicCalendar" options={{ headerShown: false }} />
    </Stack>
  );
}
