/* eslint-disable no-unused-vars */
export const Colors = {
  light: {
    text: '#212121', // Dark charcoal for primary text
    background: '#FAFAFA', // Soft near-white for background
    tint: '#333333', // Neutral dark tint for interactive elements
    icon: '#6E6E6E', // Medium gray for icons
    tabIconDefault: '#888888', // Slightly muted gray for inactive tabs
    tabIconSelected: '#2E7D32', // Signature green for selected tab
    link: '#2E7D32', // Signature green for links
    cardBackground: '#FFFFFF', // Pure white for cards
    cardBorder: '#E0E0E0', // Light gray for card borders
    cardShadow: '#999999', // Subtle gray for card shadow
    categoryText: '#212121', // Dark charcoal for category text
    authorText: '#606060', // Darker gray for author text (increased contrast)
    arabicText: '#212121', // Dark charcoal for Arabic text
    highlightedArabicText: '#2E7D32', // Signature green for highlighted Arabic text
    englishText: '#212121', // Dark charcoal for English text
    titleText: '#212121', // Dark charcoal for title text
    white: '#FFFFFF', // Pure white for light mode
    success: '#2E7D32', // Signature green for success messages
    warning: '#FCC419', // Muted amber/yellow for warning messages
    error: '#D95040', // Soft red for error messages
    info: '#339AF0', // Light blue for informational messages
    shadow: '#999999', // Subtle gray shadow
    overlay: 'rgba(0, 0, 0, 0.05)', // Light overlay for background elements
    successOverlay: 'rgba(46, 125, 50, 0.2)', // Semi-transparent green for success overlay
    warningOverlay: 'rgba(252, 196, 25, 0.2)', // Semi-transparent yellow for warning overlay
    textOverlay: 'rgba(0, 0, 0, 0.1)', // Light text overlay for darkening
    borderOverlay: 'rgba(0, 0, 0, 0.2)', // Darker border overlay
    gradientStart: 'rgba(250, 250, 250, 0)', // Transparent gradient start
    gradientMiddle: 'rgba(240, 240, 240, 0.7)', // Light gradient middle
    gradientEnd: 'rgba(240, 240, 240, 1)', // Full opacity gradient end
    elevation1: '#F0F0F0', // Light elevation
    elevation2: '#E0E0E0', // Slightly darker elevation
    elevation3: '#D0D0D0', // Darker elevation
    imagePlaceholder: 'rgba(0, 0, 0, 0.05)', // Light image placeholder
    textShadowLight: 'rgba(0, 0, 0, 0.2)', // Light text shadow
    textShadowDark: 'rgba(0, 0, 0, 0.5)', // Dark text shadow
    modalOverlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay
    black: '#000000', // Pure black for dark mode
  },
  dark: {
    text: '#E0E0E0', // Light gray for primary text
    background: '#121212', // Near-black background
    tint: '#CCCCCC', // Muted light gray for interactive elements
    icon: '#BBBBBB', // Light gray for icons
    tabIconDefault: '#888888', // Slightly muted gray for inactive tabs
    tabIconSelected: '#2E7D32', // Signature green for selected tab
    link: '#2E7D32', // Signature green for links
    cardBackground: '#1E1E1E', // Dark gray card background
    cardBorder: '#333333', // Darker gray for card borders
    cardShadow: '#000000', // Dark shadow for depth
    categoryText: '#E0E0E0', // Light gray for category text
    authorText: '#CCCCCC', // Lighter gray for author text (improved contrast)
    arabicText: '#E0E0E0', // Light gray for Arabic text
    highlightedArabicText: '#2E7D32', // Signature green for highlighted Arabic text
    englishText: '#E0E0E0', // Light gray for English text
    titleText: '#E0E0E0', // Light gray for title text
    white: '#FFFFFF', // Pure white for dark mode
    success: '#2E7D32', // Signature green for success messages
    warning: '#FCC419', // Muted amber/yellow for warning messages
    error: '#EF5350', // Soft red for error messages
    info: '#339AF0', // Light blue for informational messages
    shadow: '#000000', // Dark shadow for depth
    overlay: 'rgba(255, 255, 255, 0.05)', // Light overlay for background elements
    successOverlay: 'rgba(64, 192, 87, 0.2)', // Semi-transparent green for success overlay
    warningOverlay: 'rgba(252, 196, 25, 0.2)', // Semi-transparent yellow for warning overlay
    textOverlay: 'rgba(255, 255, 255, 0.1)', // Light text overlay for dark mode
    borderOverlay: 'rgba(255, 255, 255, 0.2)', // Darker border overlay for dark mode
    gradientStart: 'rgba(18, 18, 18, 0)', // Transparent gradient start
    gradientMiddle: 'rgba(30, 30, 30, 0.7)', // Dark gradient middle
    gradientEnd: 'rgba(30, 30, 30, 1)', // Full opacity gradient end
    elevation1: '#1E1E1E', // Dark elevation
    elevation2: '#2C2C2C', // Slightly lighter dark elevation
    elevation3: '#3A3A3A', // Lighter dark elevation
    imagePlaceholder: 'rgba(255, 255, 255, 0.05)', // Light image placeholder
    textShadowLight: 'rgba(255, 255, 255, 0.2)', // Light text shadow
    textShadowDark: 'rgba(255, 255, 255, 0.5)', // Dark text shadow
    modalOverlay: 'rgba(0, 0, 0, 0.8)', // Modal overlay
    black: '#000000', // Pure black for dark mode
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
