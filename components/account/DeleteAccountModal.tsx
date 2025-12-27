import type { FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { GenericBottomSheet } from '@/components/common';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAccountDeletion } from '@/hooks/account/useAccountDeletion';

interface DeleteAccountModalProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Modal for deleting user account with DELETE confirmation
 * Shows warning message and requires typing "DELETE" to confirm
 * Supports all auth types including private relay emails
 */
export const DeleteAccountModal: FC<DeleteAccountModalProps> = ({ isVisible, onClose }) => {
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
      onClose();
    } catch {
      // Error is handled in the hook
    }
  };

  return (
    <GenericBottomSheet
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.DELETE_ACCOUNT_TITLE}
    >
      <View style={styles.content}>
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
            {userEmail || 'Loading...'}
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

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <ThemedText
            type="body"
            weight="semibold"
            colorName="error"
            style={[
              styles.deleteButton,
              (!confirmationText || loading) && styles.deleteButtonDisabled,
            ]}
            onPress={!confirmationText || loading ? undefined : handleDeletePress}
          >
            {loading ? STRINGS.ACCOUNT_DELETION_IN_PROGRESS : STRINGS.DELETE_ACCOUNT}
          </ThemedText>
        </View>
      </View>
    </GenericBottomSheet>
  );
};

DeleteAccountModal.displayName = 'DeleteAccountModal';

const styles = StyleSheet.create({
  content: {
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
  buttonContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  deleteButton: {
    padding: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  deleteButtonDisabled: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});
