/* eslint-disable no-unused-vars */
import type { ThemeColors } from '../types/ui/theme.types';

export const Colors = {
  light: {
    primary: '#2A3441', // Deep charcoal - sophisticated primary
    background: '#F9FBF9', // Enhanced subtle greenish tint with more warmth
    text: '#1B2C20', // Richer dark text with enhanced green undertone
    secondaryText: '#485A4F', // Refined secondary text with deeper warmth
    textTertiary: '#697968', // Enhanced contrast while maintaining warmth
    border: '#E5F2E9', // More pronounced green tint for subtle definition
    card: '#FEFFFE', // Pure white cards with enhanced subtle green warmth
    cardBorder: '#F7FBF8', // More noticeable card borders while remaining subtle
    error: '#C44536', // Warm terracotta red - natural and organic
    success: '#4A7C59', // Deep forest green - natural success
    warning: '#B8860B', // Dark goldenrod - organic gold tone
    englishText: '#485A4F', // Enhanced consistency with refined secondaryText
    arabicText: '#1B2C20', // Enhanced consistency with richer main text
    authorText: '#758A7B', // Warmer and more sophisticated author styling
    tint: '#5A7C65', // Sophisticated sage green - balanced saturation
    tabIconDefault: '#9BB0A3', // Enhanced contrast for inactive states
    tabIconSelected: '#5A7C65', // Consistent with enhanced tint
    icon: '#758A7B', // Warmer icon color matching enhanced authorText
    disabled: '#D0D9D3', // Refined disabled state with better green harmony
    imagePlaceholder: '#F7FBF8', // Consistent with enhanced cardBorder
    transparent: 'transparent',
    overlay: 'rgba(249, 251, 249, 0.88)', // Enhanced light overlay with more green
    modalOverlay: 'rgba(249, 251, 249, 0.96)', // Stronger modal overlay
    borderOverlay: 'rgba(47, 125, 50, 0.05)', // More subtle refined overlay
    buttonOverlay: 'rgba(47, 125, 50, 0.06)', // Enhanced button overlay subtlety
    buttonOverlayActive: 'rgba(47, 125, 50, 0.10)', // Enhanced active state
    buttonBorderOverlay: 'rgba(255, 255, 255, 0.18)', // Slightly enhanced border
    shadow: '#2A3441', // Consistent with primary
    elevation1: '#FEFFFE', // Enhanced pure white elevation
    elevation2: '#F7FBF8', // Enhanced subtle elevation
    elevation3: '#EDF5F0', // Enhanced medium elevation with more green
    white: '#FFFFFF',
    black: '#000000',
    textOverlay: 'rgba(47, 125, 50, 0.03)', // More subtle text overlay
    textShadowDark: 'rgba(42, 52, 65, 0.75)', // Consistent dark shadow
    textShadowLight: 'rgba(255, 255, 255, 0.75)', // Consistent light shadow
    info: '#6B8471', // Muted sage-gray - enhanced earth-toned alternative
    backdropOverlay: 'rgba(42, 52, 65, 0.65)', // Enhanced modal focus
    contrastOverlay: 'rgba(42, 52, 65, 0.28)', // Enhanced text contrast
    socialIconBg: 'rgba(107, 154, 122, 0.08)', // More subtle social background
    // Article reading specific colors
    audioHighlight: '#FEFFFE', // Enhanced highlight with subtle green
    audioHighlightBorder: '#E5F2E9', // Enhanced border with more green
    wordTooltipBg: '#FEFFFE', // Enhanced tooltip background
    wordTooltipText: '#1B2C20', // Enhanced tooltip text consistency
    wordTooltipBorder: '#E5F2E9', // Enhanced tooltip border
    wordTooltipShadow: 'rgba(42, 52, 65, 0.10)', // More subtle tooltip shadow
    wordSelectionUnderline: 'rgba(47, 125, 50, 0.22)', // Enhanced selection visibility
    wordDueUnderline: 'rgba(184, 134, 11, 0.38)', // Enhanced due word visibility
    audioControlBg: '#FEFFFE', // Enhanced audio control background
    audioControlBorder: '#E5F2E9', // Enhanced audio control border
    audioControlShadow: 'rgba(42, 52, 65, 0.06)', // Enhanced audio shadow
    // Navigation branding colors
    navigationRipple: 'rgba(47, 125, 50, 0.08)', // More refined navigation ripple
    headerOverlay: 'rgba(249, 251, 249, 0.95)', // Enhanced header overlay
    tabBarOverlay: 'rgba(249, 251, 249, 0.88)', // Enhanced tab bar overlay

    // Semantic UI colors for better UX
    progressIndicator: '#6B8471', // Enhanced earth-toned progress
    progressBackground: 'rgba(107, 132, 113, 0.12)', // More subtle progress track
    interactiveSecondary: '#758A7B', // Enhanced secondary interactive with warmth
    completionSuccess: '#4A7C59', // Deep forest green for completion
    repeatActive: '#B8860B', // Enhanced goldenrod for active states

    // Enhanced typography-specific colors for sophisticated text relationships
    headingText: '#1B2C20', // Primary heading color - rich and commanding
    subtitleText: '#556A5C', // Sophisticated subtitle balance between primary and secondary
    metadataText: '#637A6F', // Refined metadata color - perfect hierarchy balance
    captionText: '#6E7F74', // Enhanced caption color for optimal readability
  } as ThemeColors,
  dark: {
    primary: '#F2F5F3', // Enhanced warm off-white with richer green undertone
    background: '#0D1210', // Deeper charcoal with enhanced green-brown warmth
    text: '#F2F5F3', // Enhanced warm off-white consistency
    secondaryText: '#D6DBD7', // Enhanced sage with more warmth and richness
    textTertiary: '#ABB3AB', // Enhanced balanced green-gray with more sophistication
    border: '#293129', // Enhanced rich charcoal with deeper green-brown
    card: '#191F1A', // Enhanced dark forest with richer brown undertone
    cardBorder: '#293129', // Enhanced rich charcoal border consistency
    error: '#D77559', // Enhanced warm terracotta - richer in dark mode
    success: '#6FA07D', // Enhanced sage green - more vibrant yet natural
    warning: '#D9A876', // Enhanced warm gold - richer and more organic
    englishText: '#D6DBD7', // Enhanced consistency with refined secondaryText
    arabicText: '#F2F5F3', // Enhanced consistency with enriched main text
    authorText: '#ABB3AB', // Enhanced consistency with sophisticated textTertiary
    tint: '#7DA188', // Enhanced balanced sage green - richer without harshness
    tabIconDefault: '#6E766E', // Enhanced neutral with green-brown sophistication
    tabIconSelected: '#7DA188', // Enhanced balanced sage consistency
    icon: '#ABB3AB', // Enhanced icon color with sophisticated balance
    disabled: '#3C443C', // Enhanced muted dark with sophisticated green-brown
    imagePlaceholder: '#293129', // Enhanced consistency with border
    transparent: 'transparent',
    overlay: 'rgba(13, 18, 16, 0.88)', // Enhanced dark forest overlay
    modalOverlay: 'rgba(13, 18, 16, 0.96)', // Enhanced darker forest modal
    borderOverlay: 'rgba(107, 154, 122, 0.06)', // Enhanced muted overlay subtlety
    buttonOverlay: 'rgba(107, 154, 122, 0.08)', // Enhanced button overlay
    buttonOverlayActive: 'rgba(107, 154, 122, 0.12)', // Enhanced active overlay
    buttonBorderOverlay: 'rgba(242, 245, 243, 0.12)', // Enhanced warm sage border
    shadow: '#000000', // Pure black for enhanced depth
    elevation1: '#191F1A', // Enhanced dark forest consistency
    elevation2: '#293129', // Enhanced rich charcoal
    elevation3: '#383F38', // Enhanced medium charcoal with green-brown richness
    white: '#FFFFFF',
    black: '#000000',
    textOverlay: 'rgba(107, 154, 122, 0.04)', // Enhanced muted sage text overlay
    textShadowDark: 'rgba(0, 0, 0, 0.75)', // Consistent dark shadow
    textShadowLight: 'rgba(242, 245, 243, 0.75)', // Enhanced light warm sage shadow
    info: '#8DA795', // Enhanced sage with more sophisticated earth undertones
    backdropOverlay: 'rgba(13, 18, 16, 0.82)', // Enhanced modal focus
    contrastOverlay: 'rgba(0, 0, 0, 0.48)', // Enhanced contrast overlay
    socialIconBg: 'rgba(107, 154, 122, 0.08)', // Enhanced social background subtlety
    // Article reading specific colors
    audioHighlight: '#293129', // Enhanced rich charcoal highlight
    audioHighlightBorder: '#383F38', // Enhanced medium charcoal border
    wordTooltipBg: '#293129', // Enhanced rich charcoal tooltip
    wordTooltipText: '#F2F5F3', // Enhanced warm off-white text
    wordTooltipBorder: '#383F38', // Enhanced medium charcoal border
    wordTooltipShadow: 'rgba(0, 0, 0, 0.38)', // Enhanced tooltip shadow
    wordSelectionUnderline: 'rgba(107, 154, 122, 0.28)', // Enhanced selection visibility
    wordDueUnderline: 'rgba(217, 168, 118, 0.48)', // Enhanced warm gold visibility
    audioControlBg: '#293129', // Enhanced rich charcoal audio controls
    audioControlBorder: '#383F38', // Enhanced medium charcoal border
    audioControlShadow: 'rgba(0, 0, 0, 0.28)', // Enhanced audio shadow
    // Navigation branding colors
    navigationRipple: 'rgba(107, 154, 122, 0.10)', // Enhanced navigation ripple
    headerOverlay: 'rgba(13, 18, 16, 0.94)', // Enhanced header overlay
    tabBarOverlay: 'rgba(13, 18, 16, 0.88)', // Enhanced tab bar overlay

    // Semantic UI colors for better UX
    progressIndicator: '#8DA795', // Enhanced earth-toned progress with richness
    progressBackground: 'rgba(141, 167, 149, 0.18)', // Enhanced subtle progress track
    interactiveSecondary: '#ABB3AB', // Enhanced secondary interactive sophistication
    completionSuccess: '#6FA07D', // Enhanced sage green for completion
    repeatActive: '#D9A876', // Enhanced warm gold for active states

    // Enhanced typography-specific colors for sophisticated text relationships
    headingText: '#F2F5F3', // Primary heading color - warm and authoritative
    subtitleText: '#DDE2DE', // Enhanced subtitle balance for dark mode hierarchy
    metadataText: '#C4CBC5', // Refined metadata with enhanced warmth
    captionText: '#B8C0B9', // Enhanced caption color for optimal dark mode readability
  } as ThemeColors,
};

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
