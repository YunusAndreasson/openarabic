/* eslint-disable no-unused-vars */
export const Colors = {
  light: {
    // Enhanced grayscale palette with better depth perception
    text: '#212529', // Darkest gray for primary text
    background: '#f8f9fa', // Lightest gray for background
    tint: '#343a40', // Dark gray for tint/accent
    icon: '#495057', // Medium-dark gray for icons
    tabIconDefault: '#adb5bd', // Lighter gray for inactive tabs (increased contrast)
    tabIconSelected: '#343a40', // Dark gray for active tabs
    link: '#343a40', // Dark gray for links
    cardBackground: '#ffffff', // Pure white for card backgrounds (increased contrast with page background)
    cardBorder: '#dee2e6', // Light gray for card borders
    cardShadow: '#adb5bd', // Medium-light gray for card shadows
    categoryText: '#212529', // Darkest gray for category text
    authorText: '#6c757d', // Medium gray for author text (better hierarchy)
    arabicText: '#212529', // Darkest gray for Arabic text
    highlightedArabicText: '#343a40', // Dark gray for highlighted Arabic text
    englishText: '#495057', // Medium-dark gray for English text
    titleText: '#212529', // Darkest gray for title text
    white: '#FFFFFF',
    success: '#2b8a3e', // Green in grayscale-compatible shade
    warning: '#e67700', // Orange in grayscale-compatible shade
    info: '#1864ab', // Blue in grayscale-compatible shade
    shadow: '#adb5bd', // Medium-light gray for shadows
    overlay: 'rgba(33, 37, 41, 0.1)', // Overlay with darkest gray
    successOverlay: 'rgba(43, 138, 62, 0.2)', // Success with opacity
    warningOverlay: 'rgba(230, 119, 0, 0.2)', // Warning with opacity
    textOverlay: 'rgba(33, 37, 41, 0.1)', // Text with opacity
    borderOverlay: 'rgba(33, 37, 41, 0.2)', // Border with opacity
    gradientStart: 'rgba(255, 255, 255, 0)', // Transparent start for gradients
    gradientMiddle: 'rgba(248, 249, 250, 0.7)', // Semi-transparent middle for gradients
    gradientEnd: 'rgba(255, 255, 255, 1)', // Solid end for gradients
    elevation1: '#ffffff', // Level 1 elevation (cards, buttons)
    elevation2: '#f8f9fa', // Level 2 elevation (modals, popovers)
    elevation3: '#f1f3f5', // Level 3 elevation (top-level modals)
    // New colors to replace hardcoded values
    imagePlaceholder: 'rgba(0, 0, 0, 0.05)', // Subtle placeholder color for images
    textShadowLight: 'rgba(0, 0, 0, 0.2)', // Light text shadow
    textShadowDark: 'rgba(0, 0, 0, 0.5)', // Dark text shadow
    modalOverlay: 'rgba(0, 0, 0, 0.5)', // Modal background overlay
    black: '#000000', // Pure black for specific use cases
  },
  dark: {
    // Enhanced grayscale palette for dark mode with better depth perception
    text: '#f8f9fa', // Lightest gray for text (increased contrast)
    background: '#212529', // Darkest gray for background
    tint: '#ced4da', // Light gray for tint/accent
    icon: '#adb5bd', // Medium-light gray for icons
    tabIconDefault: '#6c757d', // Medium gray for inactive tabs
    tabIconSelected: '#e9ecef', // Very light gray for active tabs (increased contrast)
    link: '#ced4da', // Light gray for links
    cardBackground: '#2b3035', // Slightly lighter than background (distinct layers)
    cardBorder: '#495057', // Medium-dark gray for card borders
    cardShadow: '#000000', // Black for card shadows in dark mode
    categoryText: '#e9ecef', // Very light gray for category text
    authorText: '#adb5bd', // Medium-light gray for author text
    arabicText: '#f8f9fa', // Lightest gray for Arabic text
    highlightedArabicText: '#e9ecef', // Very light gray for highlighted Arabic
    englishText: '#dee2e6', // Light gray for English text
    titleText: '#f8f9fa', // Lightest gray for title text
    white: '#FFFFFF',
    success: '#40c057', // Brighter green for dark mode
    warning: '#fcc419', // Brighter yellow/orange for dark mode
    info: '#339af0', // Brighter blue for dark mode
    shadow: '#000000', // Black for shadows (increased contrast)
    overlay: 'rgba(248, 249, 250, 0.1)', // Overlay with lightest gray
    successOverlay: 'rgba(64, 192, 87, 0.2)', // Success with opacity
    warningOverlay: 'rgba(252, 196, 25, 0.2)', // Warning with opacity
    textOverlay: 'rgba(233, 236, 239, 0.1)', // Text with opacity
    borderOverlay: 'rgba(233, 236, 239, 0.2)', // Border with opacity
    gradientStart: 'rgba(33, 37, 41, 0)', // Transparent start for gradients
    gradientMiddle: 'rgba(43, 48, 53, 0.7)', // Semi-transparent middle for gradients
    gradientEnd: 'rgba(43, 48, 53, 1)', // Solid end for gradients
    elevation1: '#2b3035', // Level 1 elevation (cards, buttons)
    elevation2: '#343a40', // Level 2 elevation (modals, popovers)
    elevation3: '#495057', // Level 3 elevation (top-level modals)
    // New colors to replace hardcoded values
    imagePlaceholder: 'rgba(0, 0, 0, 0.2)', // Darker placeholder color for images in dark mode
    textShadowLight: 'rgba(0, 0, 0, 0.2)', // Light text shadow
    textShadowDark: 'rgba(0, 0, 0, 0.5)', // Dark text shadow
    modalOverlay: 'rgba(0, 0, 0, 0.7)', // Modal background overlay (darker for dark mode)
    black: '#000000', // Pure black for specific use cases
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

// This creates a type of all available color names
export type ColorName = keyof typeof Colors.light;
