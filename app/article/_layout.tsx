import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function ArticleLayout() {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: '',
          headerShown: true,
          headerTransparent: true,
          headerTintColor: colors.white,
        }}
      />
    </Stack>
  );
}
