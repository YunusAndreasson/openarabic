import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

/**
 * Legal links component showing Terms of Service and Privacy Policy
 */
export function LegalLinks() {
  const colors = useColors();

  const handleTermsPress = () => {
    router.push(ROUTE_PATHS.AUTH_TERMS);
  };

  const handlePrivacyPress = () => {
    router.push(ROUTE_PATHS.AUTH_PRIVACY);
  };

  return (
    <View style={styles.container}>
      <ThemedText align="center" type="caption" variant="secondary">
        {STRINGS.BY_CONTINUING_YOU_AGREE}{' '}
      </ThemedText>
      <View style={styles.linksRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={STRINGS.TERMS_OF_SERVICE}
          onPress={handleTermsPress}
          style={({ pressed }) => (pressed ? { opacity: LAYOUT.OPACITY.HIGH } : null)}
        >
          <ThemedText
            type="caption"
            style={[
              styles.link,
              {
                color: colors.tint,
              },
            ]}
          >
            {STRINGS.TERMS_OF_SERVICE}
          </ThemedText>
        </Pressable>
        <ThemedText type="caption" variant="secondary">
          {' '}
          {STRINGS.AND}{' '}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={STRINGS.PRIVACY_POLICY}
          onPress={handlePrivacyPress}
          style={({ pressed }) => (pressed ? { opacity: LAYOUT.OPACITY.HIGH } : null)}
        >
          <ThemedText
            type="caption"
            style={[
              styles.link,
              {
                color: colors.tint,
              },
            ]}
          >
            {STRINGS.PRIVACY_POLICY}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.XXLARGE, // Clear separation from actions
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  link: {
    textDecorationLine: 'underline',
  },
  linksRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.TINY,
  },
});
