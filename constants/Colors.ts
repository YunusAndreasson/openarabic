/* eslint-disable no-unused-vars */
export const Colors = {
  light: {
    // Crisp, high-contrast techno look
    text: '#000000', // Pure black for maximum contrast
    background: '#FFFFFF', // Pure white for a clean, futuristic base
    tint: '#333333', // Dark gray for accents
    icon: '#666666', // Medium gray for icons
    tabIconDefault: '#999999', // Light gray for inactive tabs
    tabIconSelected: '#000000', // Black for active tabs
    link: '#333333', // Dark gray for links
    cardBackground: '#f2f2f2', // Very light gray for cards
    cardBorder: '#cccccc', // Medium gray for borders
    cardShadow: '#999999', // Medium gray for shadows
    categoryText: '#000000', // Black for category text
    authorText: '#666666', // Medium gray for hierarchy
    arabicText: '#000000', // Black for Arabic text
    highlightedArabicText: '#333333', // Dark gray for emphasis
    englishText: '#333333', // Dark gray for English text
    titleText: '#000000', // Black for titles
    white: '#FFFFFF',
    success: '#2b8a3e', // Retained green for success
    warning: '#e67700', // Retained orange for warning
    info: '#1864ab', // Retained blue for info
    shadow: '#999999', // Medium gray for shadows
    overlay: 'rgba(255, 255, 255, 0.5)', // Light overlay
    successOverlay: 'rgba(43, 138, 62, 0.2)', // Success overlay
    warningOverlay: 'rgba(230, 119, 0, 0.2)', // Warning overlay
    textOverlay: 'rgba(0, 0, 0, 0.1)', // Subtle text overlay
    borderOverlay: 'rgba(0, 0, 0, 0.2)', // Border overlay
    gradientStart: 'rgba(255, 255, 255, 0)', // Transparent gradient start
    gradientMiddle: 'rgba(242, 242, 242, 0.7)', // Light gray gradient
    gradientEnd: 'rgba(242, 242, 242, 1)', // Solid light gray
    elevation1: '#f2f2f2', // Level 1 elevation
    elevation2: '#e6e6e6', // Level 2 elevation
    elevation3: '#d9d9d9', // Level 3 elevation
    imagePlaceholder: 'rgba(0, 0, 0, 0.05)', // Subtle dark placeholder
    textShadowLight: 'rgba(0, 0, 0, 0.2)', // Light shadow
    textShadowDark: 'rgba(0, 0, 0, 0.5)', // Dark shadow
    modalOverlay: 'rgba(0, 0, 0, 0.5)', // Balanced modal overlay
    black: '#000000',
  },
  dark: {
    // Deep, immersive techno aesthetic with glow effects
    text: '#FFFFFF', // Pure white for striking contrast
    background: '#000000', // Pure black for a futuristic base
    tint: '#cccccc', // Light gray for accents
    icon: '#999999', // Medium gray for icons
    tabIconDefault: '#666666', // Dark gray for inactive tabs
    tabIconSelected: '#FFFFFF', // White for active tabs
    link: '#cccccc', // Light gray for links
    cardBackground: '#1a1a1a', // Very dark gray for cards
    cardBorder: '#333333', // Dark gray for borders
    cardShadow: '#000000', // Black for shadows
    categoryText: '#FFFFFF', // White for category text
    authorText: '#999999', // Medium gray for hierarchy
    arabicText: '#FFFFFF', // White for Arabic text
    highlightedArabicText: '#cccccc', // Light gray for emphasis
    englishText: '#999999', // Medium gray for English text
    titleText: '#FFFFFF', // White for titles
    white: '#FFFFFF',
    success: '#40c057', // Brighter green for dark mode
    warning: '#fcc419', // Brighter yellow/orange for dark mode
    info: '#339af0', // Brighter blue for dark mode
    shadow: '#000000', // Black for shadows
    overlay: 'rgba(0, 0, 0, 0.5)', // Dark overlay for depth
    successOverlay: 'rgba(64, 192, 87, 0.2)', // Success overlay
    warningOverlay: 'rgba(252, 196, 25, 0.2)', // Warning overlay
    textOverlay: 'rgba(255, 255, 255, 0.1)', // Subtle glow overlay
    borderOverlay: 'rgba(255, 255, 255, 0.2)', // Light border overlay
    gradientStart: 'rgba(0, 0, 0, 0)', // Transparent gradient start
    gradientMiddle: 'rgba(26, 26, 26, 0.7)', // Dark gray gradient
    gradientEnd: 'rgba(26, 26, 26, 1)', // Solid dark gray
    elevation1: '#1a1a1a', // Level 1 elevation
    elevation2: '#262626', // Level 2 elevation
    elevation3: '#333333', // Level 3 elevation
    imagePlaceholder: 'rgba(255, 255, 255, 0.05)', // Subtle light placeholder
    textShadowLight: 'rgba(255, 255, 255, 0.2)', // Glow effect
    textShadowDark: 'rgba(255, 255, 255, 0.5)', // Stronger glow
    modalOverlay: 'rgba(0, 0, 0, 0.8)', // Darker modal overlay
    black: '#000000',
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
