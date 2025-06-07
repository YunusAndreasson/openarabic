import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

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
          headerTitleAlign: 'left',
          headerTransparent: false,
          presentation: 'modal',
          gestureEnabled: true,
        })}
      />
      <Stack.Screen
        name="article"
        options={{
          headerShown: false, // Let article layout handle its own header
          presentation: 'modal',
          gestureEnabled: true,
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
