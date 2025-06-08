import { Stack } from 'expo-router';

import { useColors } from '@/hooks/theme/useColors';

export default function AccountLayout() {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Account',
          headerBackTitle: 'Read',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
          headerTintColor: colors.headingText,
          headerBackTitleStyle: {
            fontSize: 16,
          },
        }}
      />
      <Stack.Screen
        name="classicalTexts"
        options={{
          title: 'Classical Texts',
          headerBackTitle: 'Account',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
          headerTintColor: colors.headingText,
          headerBackTitleStyle: {
            fontSize: 16,
          },
        }}
      />
      <Stack.Screen
        name="learningMethod"
        options={{
          title: 'Learning Method',
          headerBackTitle: 'Account',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
          headerTintColor: colors.headingText,
          headerBackTitleStyle: {
            fontSize: 16,
          },
        }}
      />
      <Stack.Screen
        name="islamicCalendar"
        options={{
          title: 'Islamic Calendar',
          headerBackTitle: 'Account',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
          headerTintColor: colors.headingText,
          headerBackTitleStyle: {
            fontSize: 16,
          },
        }}
      />
    </Stack>
  );
}
