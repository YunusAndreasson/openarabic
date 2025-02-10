export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
    link: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#000',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#333',
    link: '#fff',
  },
} as const;

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

// This creates a type of all available color names
export type ColorName = keyof typeof Colors.light;
