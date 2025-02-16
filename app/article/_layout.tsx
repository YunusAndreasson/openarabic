import { Stack } from 'expo-router';

export default function ArticleLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: '',
          headerShown: true,
          headerTransparent: true,
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack>
  );
}
