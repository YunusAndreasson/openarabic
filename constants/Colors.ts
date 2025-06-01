/* eslint-disable no-unused-vars */
import type { ThemeColors } from '../types/ui/theme.types';

export const Colors = {
  light: {
    primary: '#2A3441', // Deep charcoal - sophisticated primary
    background: '#F8FAF9', // Subtle greenish tint to pure white background
    text: '#1A2B1F', // Rich dark text with subtle green undertone
    secondaryText: '#4A5D52', // Balanced secondary text with green tint
    textTertiary: '#718B7E', // Muted tertiary text with green undertone
    border: '#E2F0E8', // Subtle light borders with green tint
    card: '#FDFEFD', // Pure white cards with barely visible green tint
    cardBorder: '#F5FAF7', // Very subtle card borders with green tint
    error: '#C44536', // Warm terracotta red - natural and organic
    success: '#4A7C59', // Deep forest green - natural success
    warning: '#B8860B', // Dark goldenrod - organic gold tone
    englishText: '#4A5D52', // Consistent with secondaryText
    arabicText: '#1A2B1F', // Consistent with main text
    authorText: '#718B7E', // Consistent with textTertiary
    tint: '#5A7C65', // Sophisticated sage green - balanced saturation for clear interactivity
    tabIconDefault: '#A0B5A8', // Muted gray for inactive tabs with green tint
    tabIconSelected: '#5A7C65', // Sophisticated sage green - consistent with tint
    icon: '#718B7E', // Consistent with textTertiary
    disabled: '#CBD8D0', // Light disabled state with green tint
    imagePlaceholder: '#F5FAF7', // Consistent with cardBorder
    transparent: 'transparent',
    overlay: 'rgba(248, 250, 249, 0.85)', // Light overlay with green tint
    modalOverlay: 'rgba(248, 250, 249, 0.97)', // Strong light modal overlay with green tint
    borderOverlay: 'rgba(47, 125, 50, 0.06)', // Refined forest green overlay
    buttonOverlay: 'rgba(47, 125, 50, 0.08)', // Refined forest green button overlay - used for ripples
    buttonOverlayActive: 'rgba(47, 125, 50, 0.12)', // Active refined forest green button overlay
    buttonBorderOverlay: 'rgba(255, 255, 255, 0.15)', // Light button border overlay
    shadow: '#2A3441', // Consistent with primary
    elevation1: '#FDFEFD', // Pure white elevation with green tint
    elevation2: '#F5FAF7', // Subtle elevation with green tint
    elevation3: '#EDF5F0', // Medium elevation with green tint
    white: '#FFFFFF',
    black: '#000000',
    textOverlay: 'rgba(47, 125, 50, 0.04)', // Very subtle refined forest green text overlay - used for ripples
    textShadowDark: 'rgba(42, 52, 65, 0.75)', // Dark shadow
    textShadowLight: 'rgba(255, 255, 255, 0.75)', // Light shadow
    info: '#6B8471', // Muted sage-gray - earth-toned alternative to blue
    backdropOverlay: 'rgba(42, 52, 65, 0.5)', // Backdrop overlay
    contrastOverlay: 'rgba(42, 52, 65, 0.25)', // Contrast overlay
    socialTwitter: '#1DA1F2',
    socialFacebook: '#1877F2',
    socialInstagram: '#E4405F',
    socialIconBg: 'rgba(107, 154, 122, 0.10)', // Muted sage green social background
    // Article reading specific colors
    audioHighlight: '#FDFEFD', // Pure white highlight with green tint
    audioHighlightBorder: '#E2F0E8', // Consistent border with green tint
    wordTooltipBg: '#FDFEFD', // Pure white tooltip with green tint
    wordTooltipText: '#1A2B1F', // Consistent text with green tint
    wordTooltipBorder: '#E2F0E8', // Consistent border with green tint
    wordTooltipShadow: 'rgba(42, 52, 65, 0.12)', // Subtle shadow
    wordSelectionUnderline: 'rgba(47, 125, 50, 0.25)', // Refined forest green selection
    wordDueUnderline: 'rgba(184, 134, 11, 0.4)', // Organic gold for due words
    audioControlBg: '#FDFEFD', // Pure white controls with green tint
    audioControlBorder: '#E2F0E8', // Consistent border with green tint
    audioControlShadow: 'rgba(42, 52, 65, 0.08)', // Subtle shadow
    // Navigation branding colors
    navigationRipple: 'rgba(47, 125, 50, 0.10)', // Refined forest green ripple for navigation elements
    headerOverlay: 'rgba(248, 250, 249, 0.94)', // Slightly green-tinted header overlay
    tabBarOverlay: 'rgba(248, 250, 249, 0.85)', // Balanced opacity for blur visibility with good contrast

    // Semantic UI colors for better UX
    progressIndicator: '#6B8471', // Muted sage-gray - earth-toned progress indication
    progressBackground: 'rgba(107, 132, 113, 0.15)', // Subtle earth-toned progress track
    interactiveSecondary: '#718B7E', // Muted gray for secondary interactive elements with green tint
    completionSuccess: '#4A7C59', // Deep forest green for completion states
    repeatActive: '#B8860B', // Dark goldenrod for repeat/loop states
  } as ThemeColors,
  dark: {
    primary: '#F0F4F1', // Warm off-white with subtle green undertone
    background: '#0E1310', // Deep charcoal with green-brown undertone
    text: '#F0F4F1', // Warm off-white with subtle green undertone
    secondaryText: '#D4D8D5', // Muted sage with warmth and green tint
    textTertiary: '#A8B0A8', // Balanced green-gray
    border: '#2A312B', // Rich charcoal with green-brown undertone
    card: '#1A211B', // Dark forest with brown undertone
    cardBorder: '#2A312B', // Rich charcoal border
    error: '#D4735A', // Warm terracotta - softer in dark mode
    success: '#6B9A7A', // Sage green - natural and calming
    warning: '#D4A574', // Warm gold - organic and rich
    englishText: '#D4D8D5', // Consistent with secondaryText
    arabicText: '#F0F4F1', // Consistent with main text
    authorText: '#A8B0A8', // Consistent with textTertiary
    tint: '#7A9B85', // Balanced sage green - clear contrast in dark mode without being harsh
    tabIconDefault: '#6C746C', // Neutral with green-brown undertone
    tabIconSelected: '#7A9B85', // Balanced sage green - consistent with tint
    icon: '#A8B0A8', // Consistent with textTertiary
    disabled: '#3A423A', // Muted dark with green-brown undertone
    imagePlaceholder: '#2A312B', // Consistent with border
    transparent: 'transparent',
    overlay: 'rgba(14, 19, 16, 0.85)', // Dark forest overlay
    modalOverlay: 'rgba(14, 19, 16, 0.95)', // Darker forest modal
    borderOverlay: 'rgba(107, 154, 122, 0.08)', // Muted sage green border overlay
    buttonOverlay: 'rgba(107, 154, 122, 0.10)', // Muted sage green button overlay - used for ripples
    buttonOverlayActive: 'rgba(107, 154, 122, 0.15)', // Active muted sage green overlay
    buttonBorderOverlay: 'rgba(240, 244, 241, 0.15)', // Warm sage button border
    shadow: '#000000', // Pure black for depth
    elevation1: '#1A211B', // Dark forest with brown undertone
    elevation2: '#2A312B', // Rich charcoal
    elevation3: '#363E36', // Medium charcoal with green-brown
    white: '#FFFFFF',
    black: '#000000',
    textOverlay: 'rgba(107, 154, 122, 0.06)', // Muted sage green text overlay - used for ripples
    textShadowDark: 'rgba(0, 0, 0, 0.75)', // Dark shadow
    textShadowLight: 'rgba(240, 244, 241, 0.75)', // Light warm sage shadow
    info: '#8BA593', // Muted sage with earth undertones - dark theme
    backdropOverlay: 'rgba(14, 19, 16, 0.75)', // Forest backdrop
    contrastOverlay: 'rgba(0, 0, 0, 0.4)', // Dark contrast
    socialTwitter: '#1DA1F2',
    socialFacebook: '#1877F2',
    socialInstagram: '#E4405F',
    socialIconBg: 'rgba(107, 154, 122, 0.10)', // Muted sage green social background
    // Article reading specific colors
    audioHighlight: '#2A312B', // Rich charcoal highlight
    audioHighlightBorder: '#363E36', // Medium charcoal border
    wordTooltipBg: '#2A312B', // Rich charcoal tooltip
    wordTooltipText: '#F0F4F1', // Warm off-white text
    wordTooltipBorder: '#363E36', // Medium charcoal border
    wordTooltipShadow: 'rgba(0, 0, 0, 0.4)', // Tooltip shadow
    wordSelectionUnderline: 'rgba(107, 154, 122, 0.30)', // Muted sage green selection
    wordDueUnderline: 'rgba(212, 165, 116, 0.5)', // Warm gold for due words
    audioControlBg: '#2A312B', // Rich charcoal audio controls
    audioControlBorder: '#363E36', // Medium charcoal border
    audioControlShadow: 'rgba(0, 0, 0, 0.3)', // Audio control shadow
    // Navigation branding colors
    navigationRipple: 'rgba(107, 154, 122, 0.12)', // Muted sage green ripple for navigation elements
    headerOverlay: 'rgba(14, 19, 16, 0.92)', // Slightly green-tinted header overlay
    tabBarOverlay: 'rgba(14, 19, 16, 0.85)', // Balanced opacity for blur visibility with good contrast

    // Semantic UI colors for better UX
    progressIndicator: '#8BA593', // Muted sage with earth undertones - earth-toned progress indication
    progressBackground: 'rgba(139, 165, 147, 0.20)', // Subtle earth-toned progress track
    interactiveSecondary: '#A8B0A8', // Balanced green-gray for secondary interactive elements
    completionSuccess: '#6B9A7A', // Sage green for completion states
    repeatActive: '#D4A574', // Warm gold for repeat/loop states
  } as ThemeColors,
};

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
