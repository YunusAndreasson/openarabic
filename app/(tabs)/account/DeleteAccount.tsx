import { ScreenScaffold } from '@/components/common';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedInput } from '@/components/primitives/ThemedInput';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAccountDeletion } from '@/hooks/account/useAccountDeletion';
import { router } from 'expo-router';

const DeleteAccountScreen = () => {
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
    <ScreenScaffold contentContainerStyle={styles.scrollContent}>
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
        <ThemedText type="body" style={styles.emailText}>
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
          onSubmitEditing={() => void handleDeletePress()}
          returnKeyType="done"
        />
      </View>

      {/* Delete Button */}
      <ThemedButton
        disabled={!confirmationText || loading}
        loading={loading}
        fullWidth
        title={loading ? STRINGS.ACCOUNT_DELETION_IN_PROGRESS : STRINGS.DELETE_ACCOUNT}
        tone="destructive"
        onPress={() => void handleDeletePress()}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
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
});

export default DeleteAccountScreen;
