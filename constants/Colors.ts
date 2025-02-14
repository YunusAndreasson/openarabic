/* eslint-disable no-unused-vars */
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
    link: '#0a7ea4',
    cardBackground: '#FFFFFF',
    cardBorder: '#E6E8EB',
    categoryText: '#687076',
    authorText: '#687076',
    arabicText: '#1A1A1A', // Very dark gray for Arabic in light mode
    englishText: '#4D4D4D', // Medium gray for English in light mode
  },
  dark: {
    text: '#ECEDEE',
    background: '#000',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#333',
    link: '#fff',
    cardBackground: '#1C1C1C',
    cardBorder: '#2D2D2D',
    categoryText: '#9BA1A6',
    authorText: '#9BA1A6',
    arabicText: '#E6E6E6', // Light gray for Arabic in dark mode
    englishText: '#BBBBBB', // Darker gray for English in dark mode
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

// This creates a type of all available color names
export type ColorName = keyof typeof Colors.light;
