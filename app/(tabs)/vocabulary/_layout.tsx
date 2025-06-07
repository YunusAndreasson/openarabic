import { Stack } from 'expo-router';

export default function VocabularyLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="review" options={{ headerShown: false }} />
      <Stack.Screen name="practice" options={{ headerShown: false }} />
      <Stack.Screen name="wordList" options={{ headerShown: false }} />
      <Stack.Screen name="wordExamples" options={{ headerShown: false }} />
      <Stack.Screen name="insights" options={{ headerShown: false }} />
    </Stack>
  );
}
