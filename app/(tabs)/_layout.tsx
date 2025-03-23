import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Animated } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { PlatformPressable } from '@react-navigation/elements';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_SCREENS = [
  {
    name: 'index',
    title: 'Texts',
    iconOutline: 'book-outline',
    iconFilled: 'book',
    accessibilityLabel: 'Texts tab',
  },
  {
    name: 'vocabulary',
    title: 'Words',
    iconOutline: 'receipt-outline',
    iconFilled: 'receipt',
    accessibilityLabel: 'Words tab',
  },
  {
    name: 'bookmarks',
    title: 'Bookmarks',
    iconOutline: 'bookmark-outline',
    iconFilled: 'bookmark',
    accessibilityLabel: 'Bookmarks tab',
  },
  {
    name: 'settings',
    title: 'Settings',
    iconOutline: 'settings-outline',
    iconFilled: 'settings',
    accessibilityLabel: 'Settings tab',
  },
] as const;

// Standard icon size for tab bar
const ICON_SIZE = 24;

const CustomTabBar = React.memo(({ state, descriptors, navigation }: BottomTabBarProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  // Reduce blur intensity
  const intensity = Platform.OS === 'ios' ? 55 : 80;
  const isDarkMode = colors.background === '#121212';

  // Calculate appropriate bottom padding based on device
  const bottomInset =
    Platform.OS === 'ios'
      ? Math.min(insets.bottom, LAYOUT.SPACING.MEDIUM) // Cap the inset to avoid too much space
      : 0;

  const blurContainerStyle = useMemo(
    () => [
      styles.blurContainer,
      {
        backgroundColor: isDarkMode ? 'rgba(18, 18, 18, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        height: LAYOUT.BOTTOM_BAR.HEIGHT + bottomInset,
        paddingBottom: bottomInset,
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
    ],
    [colors.shadow, bottomInset, isDarkMode]
  );

  return (
    <BlurView intensity={intensity} tint={isDarkMode ? 'dark' : 'light'} style={blurContainerStyle}>
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
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={screen.accessibilityLabel || label}
          >
            <Ionicons
              name={isFocused ? screen.iconFilled : screen.iconOutline}
              size={ICON_SIZE}
              color={isFocused ? colors.tint : colors.tabIconDefault}
            />
            <ThemedText
              style={{
                ...styles.label,
                color: isFocused ? colors.tint : colors.tabIconDefault,
                ...Platform.select({
                  ios: {
                    fontWeight: '500' as const,
                  },
                  android: {
                    paddingBottom: 2,
                  },
                }),
              }}
              skipDefaultColor
            >
              {label}
            </ThemedText>
          </PlatformPressable>
        );
      })}
    </BlurView>
  );
});
CustomTabBar.displayName = 'CustomTabBar';

export default function TabLayout() {
  const colors = useColors();

  const screenOptions = useMemo(
    () => ({
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
            fontWeight: '500' as const,
          },
          android: {
            paddingBottom: 2,
          },
        }),
      },
    }),
    [colors.tint, colors.tabIconDefault]
  );

  return (
    <Tabs tabBar={props => <CustomTabBar {...props} />} screenOptions={screenOptions}>
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
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    textAlign: 'center',
  },
});
