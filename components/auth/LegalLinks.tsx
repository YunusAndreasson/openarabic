import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

// TODO: Replace these with actual URLs when available
const TERMS_URL = 'https://openarabic.app/terms';
const PRIVACY_URL = 'https://openarabic.app/privacy';

/**
 * Legal links component showing Terms of Service and Privacy Policy
 */
export function LegalLinks() {
  const colors = useColors();

  const handleTermsPress = () => {
    Linking.openURL(TERMS_URL);
  };

  const handlePrivacyPress = () => {
    Linking.openURL(PRIVACY_URL);
  };

  return (
    <View style={styles.container}>
      <ThemedText align="center" type="caption" variant="secondary">
        {STRINGS.BY_CONTINUING_YOU_AGREE}{' '}
      </ThemedText>
      <View style={styles.linksRow}>
        <TouchableOpacity
          activeOpacity={LAYOUT.OPACITY.HIGH}
          accessibilityRole="link"
          accessibilityLabel={STRINGS.TERMS_OF_SERVICE}
          onPress={handleTermsPress}
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
        </TouchableOpacity>
        <ThemedText type="caption" variant="secondary">
          {' '}
          {STRINGS.AND}{' '}
        </ThemedText>
        <TouchableOpacity
          activeOpacity={LAYOUT.OPACITY.HIGH}
          accessibilityRole="link"
          accessibilityLabel={STRINGS.PRIVACY_POLICY}
          onPress={handlePrivacyPress}
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
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
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
