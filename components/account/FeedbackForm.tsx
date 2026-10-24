import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { memo, useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedInput } from '@/components/primitives/ThemedInput';
import { IconButton } from '@/components/ui';
import { ThemedText } from '@/components/primitives/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useScreenshotAttachment } from '@/hooks/account';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme';
import pkg from '@/package.json';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';

const MIN_CHARACTERS = 10;

/**
 * The feedback form. Content only: the route renders it inside a
 * `ScreenScaffold`, whose scroll view is keyboard-aware (iOS insets the
 * content by the keyboard; Android resizes the window). It used to bring its
 * own KeyboardAvoidingView and ScrollView, with a guessed 90pt offset for the
 * header, and a raw TextInput with no app font or selection colour.
 */
export const FeedbackForm = memo(() => {
  const colors = useColors();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Screenshot attachment with permission handling
  const { screenshotUri, handleAddScreenshot, handleRemoveScreenshot } = useScreenshotAttachment({
    userId: user?.id,
  });

  const characterCount = message.trim().length;
  const characterHint =
    characterCount < MIN_CHARACTERS
      ? characterCount === MIN_CHARACTERS - 1
        ? STRINGS.FEEDBACK_CHARACTER_NEEDED
        : STRINGS.FEEDBACK_CHARACTERS_NEEDED.replace(
            '{count}',
            String(MIN_CHARACTERS - characterCount),
          )
      : STRINGS.FEEDBACK_CHARACTER_COUNT.replace('{count}', String(characterCount));

  // Never error ink. A message still being typed is not a mistake, and the
  // count used to turn red from the first character until the tenth; there is
  // no upper limit to go over, so there is no error state to show at all. The
  // disabled Send button already says the message is not ready.
  const characterCountColor = characterCount < MIN_CHARACTERS ? colors.textTertiary : colors.tint;

  const handleSubmit = useCallback(async () => {
    if (!message || message.trim().length === 0) {
      Alert.alert(STRINGS.FEEDBACK_EMPTY_TITLE, STRINGS.FEEDBACK_EMPTY_MESSAGE);
      return;
    }

    if (message.trim().length < MIN_CHARACTERS) {
      Alert.alert(
        STRINGS.FEEDBACK_SHORT_TITLE,
        STRINGS.FEEDBACK_SHORT_MESSAGE.replace('{minCharacters}', String(MIN_CHARACTERS)),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (screenshotUri) {
        try {
          const filename = `feedback/${user?.id || 'anonymous'}/${Date.now()}.jpg`;

          const response = await fetch(screenshotUri);
          const blob = await response.blob();

          const { data, error: uploadError } = await supabase.storage
            .from('feedback-screenshots')
            .upload(filename, blob, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
            });

          if (uploadError) {
            // Screenshot upload failed - log error details but continue without screenshot
            Sentry.captureException(uploadError, {
              tags: { location: 'feedback_screenshot_upload' },
              level: 'warning',
              extra: {
                filename,
                uploadErrorMessage: uploadError.message,
              },
            });
          } else if (data) {
            const {
              data: { publicUrl },
            } = supabase.storage.from('feedback-screenshots').getPublicUrl(filename);
            screenshotUrl = publicUrl;
          }
        } catch {
          // Continue with feedback submission even if screenshot fails
        }
      }

      // Use Sentry's captureFeedback API
      const feedbackMessage = screenshotUrl
        ? `${message.trim()}\n\nScreenshot: ${screenshotUrl}`
        : message.trim();

      // The user and the metadata belong to THIS feedback event only. They used
      // to be set on the global scope and never cleared, so every error for the
      // rest of the session — another account's included, after a sign-out —
      // was filed under this learner's email and carried their screenshot URL.
      Sentry.withScope(scope => {
        scope.setUser({
          email: user?.email || undefined,
          id: user?.id || undefined,
          username: user?.email?.split('@')[0] || undefined,
        });
        scope.setContext('feedback_metadata', {
          app_version: pkg.version,
          submitted_at: new Date().toISOString(),
          message_length: message.trim().length,
          has_screenshot: !!screenshotUrl,
          screenshot_url: screenshotUrl || undefined,
        });
        Sentry.captureFeedback(
          {
            name: user?.email?.split('@')[0] || 'Anonymous',
            email: user?.email || 'no-email@example.com',
            message: feedbackMessage,
          },
          undefined,
          scope,
        );
      });

      router.back();

      // Show success message after navigating back
      setTimeout(() => {
        Alert.alert(STRINGS.FEEDBACK_SUCCESS_TITLE, STRINGS.FEEDBACK_SUCCESS_MESSAGE);
      }, 300);
    } catch (error) {
      void handleError(error, {
        showToast: false,
        analyticsEventName: 'Feedback_Capture_Error',
      });

      Alert.alert(STRINGS.FEEDBACK_ERROR_TITLE, STRINGS.FEEDBACK_ERROR_MESSAGE, [
        { text: STRINGS.CANCEL, style: 'cancel' },
        {
          text: STRINGS.RETRY,
          onPress: () => setIsSubmitting(false),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [message, user?.email, user?.id, screenshotUri]);

  return (
    <View style={styles.content}>
      <View style={styles.messageField}>
        <ThemedInput
          accessibilityLabel={STRINGS.FEEDBACK_MESSAGE_LABEL}
          placeholder={STRINGS.FEEDBACK_PLACEHOLDER}
          value={message}
          onChangeText={setMessage}
          multiline
          autoFocus
          editable={!isSubmitting}
        />
      </View>

      {screenshotUri ? (
        <View style={styles.screenshotPreview}>
          <Image
            source={{ uri: screenshotUri }}
            style={styles.screenshotImage}
            contentFit="cover"
            cachePolicy="none"
          />
          <View style={styles.removeButton}>
            <IconButton
              accessibilityLabel={STRINGS.FEEDBACK_SCREENSHOT_REMOVE_A11Y}
              icon="close"
              size="small"
              tone="destructive"
              onPress={handleRemoveScreenshot}
            />
          </View>
        </View>
      ) : (
        <ThemedButton
          allowTitleWrap
          fullWidth
          icon="image"
          style={styles.addScreenshotButton}
          title={STRINGS.FEEDBACK_SCREENSHOT_LABEL}
          variant="outlined"
          onPress={() => void handleAddScreenshot()}
        />
      )}

      <View style={styles.metaRow}>
        <ThemedText type="caption" colorName="textTertiary">
          {user?.email
            ? STRINGS.FEEDBACK_EMAIL_INCLUDED.replace('{email}', user.email)
            : STRINGS.FEEDBACK_EMAIL_UNAVAILABLE}
        </ThemedText>
        <ThemedText type="caption" style={[styles.characterCount, { color: characterCountColor }]}>
          {characterHint}
        </ThemedText>
      </View>

      <ThemedButton
        title={isSubmitting ? STRINGS.FEEDBACK_SENDING : STRINGS.FEEDBACK_SUBMIT}
        onPress={() => void handleSubmit()}
        disabled={isSubmitting || characterCount < MIN_CHARACTERS}
        variant={characterCount < MIN_CHARACTERS ? 'outlined' : 'filled'}
        style={styles.submitButton}
      />
    </View>
  );
});

FeedbackForm.displayName = 'FeedbackForm';

const styles = StyleSheet.create({
  // The scaffold supplies the bottom padding (and the home-indicator inset).
  content: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  // With ThemedInput's own TINY margin, the SMALL gap the field always had.
  messageField: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  metaRow: {
    gap: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  characterCount: {
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
  },
  // Dashed edge marks this as a drop/pick target rather than a committing
  // action. Everything else — height, radius, press feel — is the outlined
  // ThemedButton underneath.
  addScreenshotButton: {
    borderStyle: 'dashed',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  screenshotPreview: {
    position: 'relative',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: LAYOUT.INPUT.MULTILINE_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  removeButton: {
    position: 'absolute',
    right: LAYOUT.SPACING.SMALL,
    top: LAYOUT.SPACING.SMALL,
  },
  submitButton: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
