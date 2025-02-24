/* eslint-disable no-unused-vars */
export const Colors = {
  light: {
    text: '#222222', // Dark gray text for optimal readability
    background: '#FFFFFF', // Off-white background to reduce glare
    tint: '#333333', // Darker neutral gray for better contrast
    icon: '#666666', // Mid-gray for icons
    tabIconDefault: '#666666', // Consistent gray for inactive tabs
    tabIconSelected: '#333333', // Matching tint for active tabs
    link: '#333333', // Neutral gray for links
    cardBackground: '#F0F0F0', // Subtle contrast for card backgrounds
    cardBorder: '#DDDDDD', // Light gray border for clear delineation
    categoryText: '#222222', // Darker gray for better readability
    authorText: '#222222',
    arabicText: '#1A1A1A', // Slightly darker for Arabic text to enhance clarity
    highlightedArabicText: '#0066CC', // Blue for highlighted Arabic words
    englishText: '#4D4D4D', // A bit lighter for English text
    titleText: '#000000', // Pure black for maximum title contrast
    white: '#FFFFFF',
    success: '#34C759', // Green for success states
    warning: '#FF9500', // Orange for warning states
    info: '#007AFF', // Blue for info states
    shadow: '#000000', // Shadow color for light theme
    overlay: 'rgba(0, 0, 0, 0.1)', // Overlay color for light theme
    successOverlay: 'rgba(52, 199, 89, 0.2)', // Success state with opacity
    warningOverlay: 'rgba(255, 149, 0, 0.2)', // Warning state with opacity
    textOverlay: 'rgba(34, 34, 34, 0.1)', // Text color with opacity
    borderOverlay: 'rgba(34, 34, 34, 0.2)', // Border color with opacity
  },
  dark: {
    text: '#E0E0E0', // Off-white text for dark mode
    background: '#000000', // Dark gray background instead of true black
    tint: '#EEEEEE', // Neutral gray accent for a refined appearance
    icon: '#BBBBBB', // Soft gray for icons
    tabIconDefault: '#BBBBBB', // Consistent with icon color for inactive tabs
    tabIconSelected: '#AAAAAA', // Matching tint for active tabs
    link: '#AAAAAA', // Neutral gray for links
    cardBackground: '#121212', // Darker background for better contrast
    cardBorder: '#2A2A2A', // Subtle gray border for cards
    categoryText: '#BBBBBB', // Secondary text in soft gray
    authorText: '#BBBBBB',
    arabicText: '#F0F0F0', // Brighter for Arabic text to enhance clarity
    highlightedArabicText: '#66B2FF', // Light blue for highlighted Arabic words
    englishText: '#CCCCCC', // Slightly subdued for English text
    titleText: '#FFFFFF', // Pure white for maximum title contrast
    white: '#FFFFFF',
    success: '#30D158', // Green for success states
    warning: '#FF9F0A', // Orange for warning states
    info: '#0A84FF', // Blue for info states
    shadow: '#000000', // Shadow color for dark theme
    overlay: 'rgba(255, 255, 255, 0.1)', // Overlay color for dark theme
    successOverlay: 'rgba(48, 209, 88, 0.2)', // Success state with opacity
    warningOverlay: 'rgba(255, 159, 10, 0.2)', // Warning state with opacity
    textOverlay: 'rgba(224, 224, 224, 0.1)', // Text color with opacity
    borderOverlay: 'rgba(224, 224, 224, 0.2)', // Border color with opacity
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

// This creates a type of all available color names
export type ColorName = keyof typeof Colors.light;
