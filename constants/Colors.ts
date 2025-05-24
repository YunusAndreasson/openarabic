/* eslint-disable no-unused-vars */
import type { ThemeColors } from '../types/ui/theme.types';

export const Colors = {
  light: {
    primary: '#2A3441', // Deep charcoal - sophisticated primary
    background: '#FAFBFC', // Pure light background
    text: '#1A202C', // Rich dark text
    secondaryText: '#4A5568', // Balanced secondary text
    textTertiary: '#718096', // Muted tertiary text
    border: '#E2E8F0', // Subtle light borders
    card: '#FFFFFF', // Pure white cards
    cardBorder: '#F7FAFC', // Very subtle card borders
    error: '#C44536', // Warm terracotta red - natural and organic
    success: '#4A7C59', // Deep forest green - natural success
    warning: '#B8860B', // Dark goldenrod - organic gold tone
    englishText: '#4A5568', // Consistent with secondaryText
    arabicText: '#1A202C', // Consistent with main text
    authorText: '#718096', // Consistent with textTertiary
    tint: '#4A7C59', // Sage green - natural action color for growth and progress
    tabIconDefault: '#A0AEC0', // Muted gray for inactive tabs
    tabIconSelected: '#4A7C59', // Sage green - consistent with tint
    icon: '#718096', // Consistent with textTertiary
    disabled: '#CBD5E0', // Light disabled state
    imagePlaceholder: '#F7FAFC', // Consistent with cardBorder
    transparent: 'transparent',
    overlay: 'rgba(255, 255, 255, 0.85)', // Light overlay
    modalOverlay: 'rgba(255, 255, 255, 0.97)', // Strong light modal overlay
    borderOverlay: 'rgba(74, 124, 89, 0.06)', // Subtle sage green overlay
    buttonOverlay: 'rgba(74, 124, 89, 0.08)', // Sage green button overlay - used for ripples
    buttonOverlayActive: 'rgba(74, 124, 89, 0.12)', // Active sage button overlay
    buttonBorderOverlay: 'rgba(255, 255, 255, 0.15)', // Light button border overlay
    shadow: '#2A3441', // Consistent with primary
    elevation1: '#FFFFFF', // Pure white elevation
    elevation2: '#F7FAFC', // Subtle elevation
    elevation3: '#EDF2F7', // Medium elevation
    white: '#FFFFFF',
    black: '#000000',
    textOverlay: 'rgba(74, 124, 89, 0.04)', // Very subtle sage text overlay - used for ripples
    textShadowDark: 'rgba(42, 52, 65, 0.75)', // Dark shadow
    textShadowLight: 'rgba(255, 255, 255, 0.75)', // Light shadow
    info: '#5B7C8D', // Muted blue-gray with green undertones
    backdropOverlay: 'rgba(42, 52, 65, 0.5)', // Backdrop overlay
    contrastOverlay: 'rgba(42, 52, 65, 0.25)', // Contrast overlay
    socialTwitter: '#1DA1F2',
    socialFacebook: '#1877F2',
    socialInstagram: '#E4405F',
    socialIconBg: 'rgba(74, 124, 89, 0.08)', // Sage green social background
    // Article reading specific colors
    audioHighlight: '#FFFFFF', // Pure white highlight
    audioHighlightBorder: '#E2E8F0', // Consistent border
    wordTooltipBg: '#FFFFFF', // Pure white tooltip
    wordTooltipText: '#1A202C', // Consistent text
    wordTooltipBorder: '#E2E8F0', // Consistent border
    wordTooltipShadow: 'rgba(42, 52, 65, 0.12)', // Subtle shadow
    wordSelectionUnderline: 'rgba(74, 124, 89, 0.25)', // Sage green selection
    wordDueUnderline: 'rgba(184, 134, 11, 0.4)', // Organic gold for due words
    audioControlBg: '#FFFFFF', // Pure white controls
    audioControlBorder: '#E2E8F0', // Consistent border
    audioControlShadow: 'rgba(42, 52, 65, 0.08)', // Subtle shadow
    // Navigation branding colors
    navigationRipple: 'rgba(74, 124, 89, 0.10)', // Sage green ripple for navigation elements
    headerOverlay: 'rgba(255, 255, 255, 0.94)', // Slightly green-tinted header overlay
    tabBarOverlay: 'rgba(250, 251, 252, 0.98)', // Very subtle green undertone for tab bar
  } as ThemeColors,
  dark: {
    primary: '#F2F4F1', // Warm off-white with subtle green undertone
    background: '#0F1311', // Deep charcoal with green-brown undertone
    text: '#F2F4F1', // Warm off-white with subtle green undertone
    secondaryText: '#D6D8D5', // Muted sage with warmth
    textTertiary: '#AAB0A8', // Balanced green-gray
    border: '#2C312B', // Rich charcoal with green-brown undertone
    card: '#1C211B', // Dark forest with brown undertone
    cardBorder: '#2C312B', // Rich charcoal border
    error: '#D4735A', // Warm terracotta - softer in dark mode
    success: '#6B9A7A', // Sage green - natural and calming
    warning: '#D4A574', // Warm gold - organic and rich
    englishText: '#D6D8D5', // Consistent with secondaryText
    arabicText: '#F2F4F1', // Consistent with main text
    authorText: '#AAB0A8', // Consistent with textTertiary
    tint: '#6B9A7A', // Sage green - natural action color for growth and progress
    tabIconDefault: '#6E746C', // Neutral with green-brown undertone
    tabIconSelected: '#6B9A7A', // Sage green - consistent with tint
    icon: '#AAB0A8', // Consistent with textTertiary
    disabled: '#3C423A', // Muted dark with green-brown undertone
    imagePlaceholder: '#2C312B', // Consistent with border
    transparent: 'transparent',
    overlay: 'rgba(15, 19, 17, 0.85)', // Dark forest overlay
    modalOverlay: 'rgba(15, 19, 17, 0.95)', // Darker forest modal
    borderOverlay: 'rgba(107, 154, 122, 0.08)', // Sage green border overlay
    buttonOverlay: 'rgba(107, 154, 122, 0.10)', // Sage green button overlay - used for ripples
    buttonOverlayActive: 'rgba(107, 154, 122, 0.15)', // Active sage overlay
    buttonBorderOverlay: 'rgba(242, 244, 241, 0.15)', // Warm sage button border
    shadow: '#000000', // Pure black for depth
    elevation1: '#1C211B', // Dark forest with brown undertone
    elevation2: '#2C312B', // Rich charcoal
    elevation3: '#383E36', // Medium charcoal with green-brown
    white: '#FFFFFF',
    black: '#000000',
    textOverlay: 'rgba(107, 154, 122, 0.06)', // Sage green text overlay - used for ripples
    textShadowDark: 'rgba(0, 0, 0, 0.75)', // Dark shadow
    textShadowLight: 'rgba(242, 244, 241, 0.75)', // Light warm sage shadow
    info: '#7A9CAD', // Muted blue with green undertones
    backdropOverlay: 'rgba(15, 19, 17, 0.75)', // Forest backdrop
    contrastOverlay: 'rgba(0, 0, 0, 0.4)', // Dark contrast
    socialTwitter: '#1DA1F2',
    socialFacebook: '#1877F2',
    socialInstagram: '#E4405F',
    socialIconBg: 'rgba(107, 154, 122, 0.10)', // Sage green social background
    // Article reading specific colors
    audioHighlight: '#2C312B', // Rich charcoal highlight
    audioHighlightBorder: '#383E36', // Medium charcoal border
    wordTooltipBg: '#2C312B', // Rich charcoal tooltip
    wordTooltipText: '#F2F4F1', // Warm off-white text
    wordTooltipBorder: '#383E36', // Medium charcoal border
    wordTooltipShadow: 'rgba(0, 0, 0, 0.4)', // Tooltip shadow
    wordSelectionUnderline: 'rgba(107, 154, 122, 0.30)', // Sage green selection
    wordDueUnderline: 'rgba(212, 165, 116, 0.5)', // Warm gold for due words
    audioControlBg: '#2C312B', // Rich charcoal audio controls
    audioControlBorder: '#383E36', // Medium charcoal border
    audioControlShadow: 'rgba(0, 0, 0, 0.3)', // Audio control shadow
    // Navigation branding colors
    navigationRipple: 'rgba(107, 154, 122, 0.12)', // Sage green ripple for navigation elements
    headerOverlay: 'rgba(15, 19, 17, 0.92)', // Slightly green-tinted header overlay
    tabBarOverlay: 'rgba(15, 19, 17, 0.96)', // Very subtle green undertone for tab bar
  } as ThemeColors,
};

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
