import { Stack } from 'expo-router';

export default function AccountLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Account',
          headerBackTitle: 'Read',
        }}
      />
      <Stack.Screen
        name="classicalTexts"
        options={{
          title: 'Classical Texts',
          headerBackTitle: 'Account',
        }}
      />
      <Stack.Screen
        name="learningMethod"
        options={{
          title: 'Learning Method',
          headerBackTitle: 'Account',
        }}
      />
      <Stack.Screen
        name="islamicCalendar"
        options={{
          title: 'Islamic Calendar',
          headerBackTitle: 'Account',
        }}
      />
    </Stack>
  );
}
