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
    authorText: '#6E6E6E', // Medium gray for author text
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
    textOverlay: 'rgba(0, 0, 0, 0.1)', // Subtle overlay for text
    borderOverlay: 'rgba(0, 0, 0, 0.2)', // Subtle border overlay
    gradientStart: 'rgba(250, 250, 250, 0)', // Transparent start for gradients
    gradientMiddle: 'rgba(240, 240, 240, 0.7)', // Subtle middle for gradients
    gradientEnd: 'rgba(240, 240, 240, 1)', // Solid end for gradients
    elevation1: '#F5F5F5', // Light elevation shadow
    elevation2: '#E0E0E0', // Slightly darker elevation shadow
    elevation3: '#D0D0D0', // Darker elevation shadow
    imagePlaceholder: 'rgba(0, 0, 0, 0.05)', // Placeholder color for images
    textShadowLight: 'rgba(0, 0, 0, 0.2)', // Light text shadow for legibility
    textShadowDark: 'rgba(0, 0, 0, 0.5)', // Darker text shadow for emphasis
    modalOverlay: 'rgba(0, 0, 0, 0.5)', // Stronger overlay for modals
    black: '#000000', // Black for dark mode and text
  },
  dark: {
    text: '#E0E0E0', // Light gray for primary text on dark mode
    background: '#121212', // Near-black background for dark mode
    tint: '#CCCCCC', // Lighter gray for tint in dark mode
    icon: '#BBBBBB', // Medium gray for icons in dark mode
    tabIconDefault: '#888888', // Muted gray for inactive tabs in dark mode
    tabIconSelected: '#2E7D32', // Signature green for selected tab in dark mode
    link: '#2E7D32', // Signature green for links in dark mode
    cardBackground: '#1E1E1E', // Very dark gray for card background
    cardBorder: '#333333', // Dark gray for card borders
    cardShadow: '#000000', // Dark shadow for depth
    categoryText: '#E0E0E0', // Light gray for category text
    authorText: '#BBBBBB', // Medium gray for author text
    arabicText: '#E0E0E0', // Light gray for Arabic text in dark mode
    highlightedArabicText: '#2E7D32', // Signature green for highlighted Arabic text
    englishText: '#E0E0E0', // Light gray for English text in dark mode
    titleText: '#E0E0E0', // Light gray for title text in dark mode
    white: '#FFFFFF', // White text for dark mode
    success: '#40C057', // Lightened signature green for success messages in dark mode
    warning: '#FCC419', // Muted amber/yellow for warning messages in dark mode
    error: '#EF5350', // Softer red for error messages in dark mode
    info: '#339AF0', // Light blue for informational messages in dark mode
    shadow: '#000000', // Stronger shadow for dark mode
    overlay: 'rgba(255, 255, 255, 0.05)', // Subtle light overlay for dark mode
    successOverlay: 'rgba(64, 192, 87, 0.2)', // Green overlay for success in dark mode
    warningOverlay: 'rgba(252, 196, 25, 0.2)', // Yellow overlay for warning in dark mode
    textOverlay: 'rgba(255, 255, 255, 0.1)', // Light text overlay for dark mode
    borderOverlay: 'rgba(255, 255, 255, 0.2)', // Light border overlay for dark mode
    gradientStart: 'rgba(18, 18, 18, 0)', // Transparent start for dark mode gradients
    gradientMiddle: 'rgba(30, 30, 30, 0.7)', // Soft middle for dark mode gradients
    gradientEnd: 'rgba(30, 30, 30, 1)', // Solid end for dark mode gradients
    elevation1: '#1E1E1E', // Darker elevation shadow for dark mode
    elevation2: '#2C2C2C', // Slightly lighter dark mode elevation shadow
    elevation3: '#3A3A3A', // Darkest elevation shadow for dark mode
    imagePlaceholder: 'rgba(255, 255, 255, 0.05)', // Placeholder for images in dark mode
    textShadowLight: 'rgba(255, 255, 255, 0.2)', // Light text shadow for dark mode
    textShadowDark: 'rgba(255, 255, 255, 0.5)', // Darker text shadow for emphasis
    modalOverlay: 'rgba(0, 0, 0, 0.8)', // Stronger overlay for modals in dark mode
    black: '#000000', // Black text for dark mode
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
