import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAccountDeletion } from '@/hooks/account/useAccountDeletion';
import { useColors } from '@/hooks/theme/useColors';
import { router } from 'expo-router';

const DeleteAccountScreen: FC = () => {
  const colors = useColors();
  const {
    userEmail,
    confirmationText,
    setConfirmationText,
    loading,
    confirmationError,
    validateConfirmation,
    deleteAccount,
  } = useAccountDeletion();

  const handleDeletePress = async () => {
    if (!validateConfirmation(confirmationText)) {
      return;
    }

    try {
      await deleteAccount();
      router.back();
    } catch {
      // Error is handled in the hook
    }
  };

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={true}
        scrollable={true}
        style={styles.content}
        useSafeArea={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Warning Message */}
        <View style={styles.warningContainer}>
          <ThemedText type="body" style={styles.warningText}>
            {STRINGS.DELETE_ACCOUNT_WARNING}
          </ThemedText>

          {/* Data List */}
          <View style={styles.dataList}>
            {STRINGS.DELETE_ACCOUNT_DATA_LIST.map(item => (
              <View key={item} style={styles.dataItem}>
                <ThemedText type="body" colorName="textTertiary">
                  • {item}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Permanent Warning */}
          <ThemedText type="body" weight="semibold" colorName="error" style={styles.permanentText}>
            {STRINGS.DELETE_ACCOUNT_PERMANENT}
          </ThemedText>
        </View>

        {/* Show Current Email */}
        <View style={styles.emailContainer}>
          <ThemedText type="caption" colorName="textTertiary" style={styles.signedInLabel}>
            {STRINGS.DELETE_ACCOUNT_SIGNED_IN_AS}
          </ThemedText>
          <ThemedText type="body" weight="medium" style={styles.emailText}>
            {userEmail || STRINGS.NO_EMAIL}
          </ThemedText>
        </View>

        {/* DELETE Confirmation */}
        <View style={styles.inputContainer}>
          <ThemedText type="body" style={styles.inputLabel}>
            {STRINGS.DELETE_ACCOUNT_ENTER_CONFIRMATION}
          </ThemedText>
          <ThemedInput
            value={confirmationText}
            onChangeText={setConfirmationText}
            placeholder={STRINGS.DELETE_ACCOUNT_CONFIRMATION_PLACEHOLDER}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
            error={confirmationError}
            onSubmitEditing={handleDeletePress}
            returnKeyType="done"
          />
        </View>

        {/* Delete Button */}
        <ThemedButton
          title={loading ? STRINGS.ACCOUNT_DELETION_IN_PROGRESS : STRINGS.DELETE_ACCOUNT}
          onPress={handleDeletePress}
          disabled={!confirmationText || loading}
          loading={loading}
          style={[styles.deleteButton, { backgroundColor: colors.error }]}
          uppercase={false}
        />
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    paddingTop: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.LARGE,
  },
  warningContainer: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
  warningText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
  dataList: {
    paddingLeft: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  permanentText: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  emailContainer: {
    gap: LAYOUT.SPACING.TINY,
  },
  signedInLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
  emailText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
  inputContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },
  inputLabel: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
  deleteButton: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});

export default DeleteAccountScreen;
