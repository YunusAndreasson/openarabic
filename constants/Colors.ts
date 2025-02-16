/* eslint-disable no-unused-vars */
export const Colors = {
  light: {
    text: '#222222', // Dark gray text for optimal readability
    background: '#FFFFFF', // Off-white background to reduce glare
    tint: '#444444', // Neutral gray accent for interactive elements
    icon: '#666666', // Mid-gray for icons
    tabIconDefault: '#666666', // Consistent gray for inactive tabs
    tabIconSelected: '#444444', // Matching tint for active tabs
    link: '#444444', // Neutral gray for links
    cardBackground: '#F0F0F0', // Subtle contrast for card backgrounds
    cardBorder: '#DDDDDD', // Light gray border for clear delineation
    categoryText: '#666666', // Secondary text in gray
    authorText: '#666666',
    arabicText: '#1A1A1A', // Slightly darker for Arabic text to enhance clarity
    englishText: '#4D4D4D', // A bit lighter for English text
  },
  dark: {
    text: '#E0E0E0', // Off-white text for dark mode
    background: '#000000', // Dark gray background instead of true black
    tint: '#EEEEEE', // Neutral gray accent for a refined appearance
    icon: '#BBBBBB', // Soft gray for icons
    tabIconDefault: '#BBBBBB', // Consistent with icon color for inactive tabs
    tabIconSelected: '#AAAAAA', // Matching tint for active tabs
    link: '#AAAAAA', // Neutral gray for links
    cardBackground: '#1E1E1E', // Slightly lighter than background for depth
    cardBorder: '#2A2A2A', // Subtle gray border for cards
    categoryText: '#BBBBBB', // Secondary text in soft gray
    authorText: '#BBBBBB',
    arabicText: '#F0F0F0', // Brighter for Arabic text to enhance clarity
    englishText: '#CCCCCC', // Slightly subdued for English text
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

// This creates a type of all available color names
export type ColorName = keyof typeof Colors.light;
