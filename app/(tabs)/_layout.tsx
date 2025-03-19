import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { PlatformPressable } from '@react-navigation/elements';
import { BottomTabBarButtonProps, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';

const TAB_SCREENS = [
  {
    name: 'index',
    title: 'Texts',
    iconOutline: 'book-outline',
    iconFilled: 'book',
  },
  {
    name: 'vocabulary',
    title: 'Words',
    iconOutline: 'receipt-outline',
    iconFilled: 'receipt',
  },
  {
    name: 'bookmarks',
    title: 'Bookmarks',
    iconOutline: 'bookmark-outline',
    iconFilled: 'bookmark',
  },
  {
    name: 'settings',
    title: 'Settings',
    iconOutline: 'settings-outline',
    iconFilled: 'settings',
  },
] as const;

// Standard icon size for tab bar
const ICON_SIZE = 24;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const intensity = Platform.OS === 'ios' ? 80 : 100;
  const isDarkMode = colors.background === '#121212';

  return (
    <BlurView
      intensity={intensity}
      tint={isDarkMode ? 'dark' : 'light'}
      style={[
        styles.blurContainer,
        {
          height: LAYOUT.BOTTOM_BAR.HEIGHT + (Platform.OS === 'ios' ? LAYOUT.SPACING.SMALL : 0),
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
              shadowRadius: LAYOUT.SPACING.SMALL / 2,
            },
            android: {
              elevation: 8,
            },
          }),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;

        const screen = TAB_SCREENS.find(s => s.name === route.name);
        if (!screen) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <PlatformPressable
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            android_ripple={{ color: colors.tint + '40', borderless: true }}
          >
            <Ionicons
              name={isFocused ? screen.iconFilled : screen.iconOutline}
              size={ICON_SIZE}
              color={isFocused ? colors.tint : colors.tabIconDefault}
            />
            <ThemedText
              style={[
                styles.label,
                {
                  color: isFocused ? colors.tint : colors.tabIconDefault,
                  ...Platform.select({
                    ios: {
                      fontWeight: '500',
                    },
                    android: {
                      paddingBottom: 2,
                    },
                  }),
                },
              ]}
              skipDefaultColor
            >
              {label}
            </ThemedText>
          </PlatformPressable>
        );
      })}
    </BlurView>
  );
}

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
          ...Platform.select({
            ios: {
              marginBottom: LAYOUT.SPACING.TINY,
              fontWeight: '500',
            },
            android: {
              paddingBottom: 2,
            },
          }),
        },
      }}
    >
      {TAB_SCREENS.map(screen => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    textAlign: 'center',
  },
});
