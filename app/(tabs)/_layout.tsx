import type { JSX } from 'react';
import { Fragment, useEffect } from 'react';
import { Platform, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Badge, Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { router } from 'expo-router';

import { ROUTE_PATHS } from '@/constants/routes';
import { TAB_SCREENS } from '@/constants/tabs';
import { FONT_WEIGHTS, LAYOUT } from '@/constants/layout';
import { HeaderProfile } from '@/components/HeaderProfile';
import { useAuth } from '@/hooks/auth';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';

export default function TabLayout(): JSX.Element {
  const { session, isLoading } = useAuth();
  const colors = useColors();

  // Get due words count using the same hook as the practice screen
  const { dueWords } = useFSRSQueries({ userId: session?.user?.id });
  const dueWordsCount = dueWords?.length ?? 0;

  useEffect(() => {
    if (!isLoading && !session?.user) {
      router.replace(ROUTE_PATHS.AUTH);
    }
  }, [session, isLoading]);

  if (!colors || !session?.user) {
    return <Fragment />;
  }

  // Use NativeTabs on iOS for native tab bar with liquid glass effect
  // Note: NativeTabs is iOS-only (uses UITabBarController) - Android uses JavaScript tabs
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs>
        {TAB_SCREENS.map(screen => (
          <NativeTabs.Trigger key={screen.name} name={screen.name}>
            <Icon sf={screen.icon.sf} />
            <Label>{screen.title}</Label>
            {screen.name === 'practice' && dueWordsCount > 0 && (
              <Badge>{String(dueWordsCount)}</Badge>
            )}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  // Android: Use regular JavaScript tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      {TAB_SCREENS.map(screen => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            ...(screen.name === 'explore' ? {
              headerShown: true,
              headerShadowVisible: false,
              headerStyle: Platform.select({
                android: {
                  backgroundColor: colors.background,
                  paddingTop: 24,
                },
                default: {
                  backgroundColor: colors.background,
                },
              }),
              headerTintColor: colors.tint,
              headerTitleAlign: 'left',
              headerTitle: () => (
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                }}>
                  <Text style={{
                    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
                    fontWeight: FONT_WEIGHTS.BOLD,
                    color: colors.headingText,
                    backgroundColor: 'transparent',
                  }}>
                    Explore
                  </Text>
                </View>
              ),
              headerRight: () => <HeaderProfile size={32} />,
            } : {}),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={
                  (focused ? screen.icon.filled : screen.icon.outline) as keyof typeof Ionicons.glyphMap
                }
                size={24}
                color={color}
              />
            ),
            tabBarBadge: screen.name === 'practice' && dueWordsCount > 0 ? dueWordsCount : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}
