/* eslint-disable no-unused-vars */
export const Colors = {
  light: {
    // Subtle blue tint for a modern tech feel
    text: '#010203', // Very dark gray with slight blue tint
    background: '#F8F9FF', // Very light blue-tinted background
    tint: '#333337', // Dark gray with blue tint for accents
    icon: '#66666A', // Medium gray with blue tint
    tabIconDefault: '#99999D', // Light gray with blue tint
    tabIconSelected: '#010203', // Dark tinted gray for active tabs
    link: '#333337', // Tinted link color
    cardBackground: '#F2F2F7', // Light gray with blue tint for cards
    cardBorder: '#CCCCCF', // Medium gray with tint for borders
    cardShadow: '#99999D', // Shadow with subtle tint
    categoryText: '#010203', // Tinted text for categories
    authorText: '#66666A', // Medium tinted gray for authors
    arabicText: '#010203', // Tinted Arabic text
    highlightedArabicText: '#333337', // Highlight with tint
    englishText: '#333337', // Tinted English text
    titleText: '#010203', // Tinted title text
    white: '#FFFFFF',
    success: '#2B8A3E', // Retained green for success
    warning: '#E67700', // Retained orange for warning
    info: '#1864AB', // Retained blue for info
    shadow: '#99999D', // Tinted shadow
    overlay: 'rgba(248, 249, 255, 0.5)', // Light overlay with tint
    successOverlay: 'rgba(43, 138, 62, 0.2)', // Success overlay
    warningOverlay: 'rgba(230, 119, 0, 0.2)', // Warning overlay
    textOverlay: 'rgba(1, 2, 3, 0.1)', // Subtle tinted text overlay
    borderOverlay: 'rgba(1, 2, 3, 0.2)', // Tinted border overlay
    gradientStart: 'rgba(248, 249, 255, 0)', // Transparent tinted gradient
    gradientMiddle: 'rgba(242, 242, 247, 0.7)', // Tinted gradient middle
    gradientEnd: 'rgba(242, 242, 247, 1)', // Solid tinted gradient end
    elevation1: '#F2F2F7', // Tinted elevation level 1
    elevation2: '#E6E6EA', // Tinted elevation level 2
    elevation3: '#D9D9DD', // Tinted elevation level 3
    imagePlaceholder: 'rgba(1, 2, 3, 0.05)', // Subtle tinted placeholder
    textShadowLight: 'rgba(1, 2, 3, 0.2)', // Light tinted shadow
    textShadowDark: 'rgba(1, 2, 3, 0.5)', // Dark tinted shadow
    modalOverlay: 'rgba(1, 2, 3, 0.5)', // Tinted modal overlay
    black: '#000000',
  },
  dark: {
    // Subtle green tint for a modern tech feel in dark mode
    text: '#FEFEFF', // Very light gray with blue tint
    background: '#010102', // Very dark gray with green tint
    tint: '#CCCFCC', // Light gray with green tint for accents
    icon: '#99999D', // Medium gray with tint
    tabIconDefault: '#66666A', // Dark gray with tint
    tabIconSelected: '#FEFEFF', // Light tinted gray for active tabs
    link: '#CCCFCC', // Tinted link color
    cardBackground: '#1A1A1F', // Dark gray with blue tint for cards
    cardBorder: '#333337', // Dark gray with tint for borders
    cardShadow: '#010102', // Shadow with tint
    categoryText: '#FEFEFF', // Tinted category text
    authorText: '#99999D', // Medium tinted gray for authors
    arabicText: '#FEFEFF', // Tinted Arabic text
    highlightedArabicText: '#CCCFCC', // Highlight with tint
    englishText: '#99999D', // Tinted English text
    titleText: '#FEFEFF', // Tinted title text
    white: '#FFFFFF',
    success: '#40C057', // Retained brighter green for dark mode
    warning: '#FCC419', // Retained brighter yellow/orange
    info: '#339AF0', // Retained brighter blue
    shadow: '#010102', // Tinted shadow
    overlay: 'rgba(1, 1, 2, 0.5)', // Dark overlay with tint
    successOverlay: 'rgba(64, 192, 87, 0.2)', // Success overlay
    warningOverlay: 'rgba(252, 196, 25, 0.2)', // Warning overlay
    textOverlay: 'rgba(254, 254, 255, 0.1)', // Subtle tinted text overlay
    borderOverlay: 'rgba(254, 254, 255, 0.2)', // Tinted border overlay
    gradientStart: 'rgba(1, 1, 2, 0)', // Transparent tinted gradient
    gradientMiddle: 'rgba(26, 26, 31, 0.7)', // Tinted gradient middle
    gradientEnd: 'rgba(26, 26, 31, 1)', // Solid tinted gradient end
    elevation1: '#1A1A1F', // Tinted elevation level 1
    elevation2: '#26262A', // Tinted elevation level 2
    elevation3: '#333337', // Tinted elevation level 3
    imagePlaceholder: 'rgba(254, 254, 255, 0.05)', // Subtle tinted placeholder
    textShadowLight: 'rgba(254, 254, 255, 0.2)', // Light tinted shadow
    textShadowDark: 'rgba(254, 254, 255, 0.5)', // Dark tinted shadow
    modalOverlay: 'rgba(1, 1, 2, 0.8)', // Darker tinted modal overlay
    black: '#000000',
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
