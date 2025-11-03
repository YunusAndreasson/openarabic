import type { FC } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { GenericBottomSheet } from '@/components/common/GenericBottomSheet';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAccountDeletion } from '@/hooks/account/useAccountDeletion';

interface DeleteAccountModalProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Modal for deleting user account with email confirmation
 * Shows warning message and requires email verification before deletion
 */
export const DeleteAccountModal: FC<DeleteAccountModalProps> = ({ isVisible, onClose }) => {
  const { email, setEmail, loading, emailError, validateEmail, deleteAccount } =
    useAccountDeletion();

  const handleDeletePress = () => {
    if (!validateEmail(email)) {
      return;
    }

    Alert.alert(
      STRINGS.DELETE_ACCOUNT_TITLE,
      STRINGS.DELETE_ACCOUNT_PERMANENT,
      [
        {
          text: STRINGS.CANCEL,
          style: 'cancel',
        },
        {
          text: STRINGS.DELETE,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              onClose();
            } catch {
              // Error is handled in the hook
            }
          },
        },
      ],
      { cancelable: true },
    );
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

        {/* Email Confirmation */}
        <View style={styles.inputContainer}>
          <ThemedText type="body" style={styles.inputLabel}>
            {STRINGS.DELETE_ACCOUNT_ENTER_EMAIL}
          </ThemedText>
          <ThemedInput
            value={email}
            onChangeText={setEmail}
            placeholder={STRINGS.DELETE_ACCOUNT_EMAIL_PLACEHOLDER}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            error={emailError}
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
              (!email || loading) && styles.deleteButtonDisabled,
            ]}
            onPress={!email || loading ? undefined : handleDeletePress}
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
    lineHeight: 22,
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
  inputContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },
  inputLabel: {
    lineHeight: 22,
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
    opacity: 0.5,
  },
});
