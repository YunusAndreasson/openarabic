import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { LinearGradient } from 'expo-linear-gradient';

interface AvatarProps {
  email?: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export function Avatar({ email, size = 'medium', style }: AvatarProps) {
  const colors = useColors();

  const initials = useMemo(() => {
    if (!email) return 'U';

    // Get username part before @ symbol
    const username = email.split('@')[0];
    // Split by common separators and get first letter of each part
    const parts = username.split(/[-._]/);
    // Take first two parts and get their first letters
    return parts
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }, [email]);

  // Generate a consistent color based on the email
  const gradientColors = useMemo(() => {
    if (!email) return [colors.tint, colors.tint] as const;

    // Simple hash function to generate a consistent number from a string
    const hash = email.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Use the hash to select from predefined color pairs that look good together
    // Using colors from the theme for consistency
    const colorPairs = [
      [colors.tint, colors.tint + 'AA'] as const,
      [colors.info, colors.info + 'AA'] as const,
      [colors.success, colors.success + 'AA'] as const,
    ];

    return colorPairs[Math.abs(hash) % colorPairs.length];
  }, [email, colors]);

  // Size based on prop
  const dimensions = {
    small: { size: 40, fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM },
    medium: { size: 60, fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE },
    large: { size: 80, fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE },
  }[size];

  // Create themed styles object to match pattern in other components
  const themedStyles = {
    container: {
      borderColor: colors.cardBorder,
      shadowColor: colors.shadow,
    },
    text: {
      color: colors.background,
    },
  };

  return (
    <View
      style={[
        styles.container,
        themedStyles.container,
        {
          width: dimensions.size,
          height: dimensions.size,
          borderRadius: dimensions.size / 2,
          borderWidth: StyleSheet.hairlineWidth,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        style={[
          styles.gradient,
          {
            borderRadius: dimensions.size / 2,
          },
        ]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
      />
      <ThemedText
        style={[
          styles.text,
          {
            fontSize: dimensions.fontSize,
          },
          themedStyles.text,
        ]}
        skipDefaultColor
      >
        {initials}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
