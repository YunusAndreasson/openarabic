import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { TextLink } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

/**
 * Legal links component showing Terms of Service and Privacy Policy
 */
export function LegalLinks() {
  const handleTermsPress = () => {
    router.push(ROUTE_PATHS.AUTH_TERMS);
  };

  const handlePrivacyPress = () => {
    router.push(ROUTE_PATHS.AUTH_PRIVACY);
  };

  return (
    <View style={styles.container}>
      <ThemedText align="center" type="caption" colorName="secondaryText">
        {STRINGS.BY_CONTINUING_YOU_AGREE}{' '}
      </ThemedText>
      <View style={styles.linksRow}>
        <TextLink
          underline
          label={STRINGS.TERMS_OF_SERVICE}
          type="caption"
          onPress={handleTermsPress}
        />
        <ThemedText type="caption" colorName="secondaryText">
          {' '}
          {STRINGS.AND}{' '}
        </ThemedText>
        <TextLink
          underline
          label={STRINGS.PRIVACY_POLICY}
          type="caption"
          onPress={handlePrivacyPress}
        />
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
  linksRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.TINY,
  },
});
