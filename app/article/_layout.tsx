import { Stack } from 'expo-router';

export default function ArticleLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Home',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
