import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useScreenshotAttachment } from '@/hooks/account';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme';
import pkg from '@/package.json';
import { supabase } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

const MIN_CHARACTERS = 10;

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

  const characterCountColor = useMemo(() => {
    if (characterCount === 0) return colors.textTertiary;
    if (characterCount < MIN_CHARACTERS) return colors.error;
    return colors.tint;
  }, [characterCount, colors.textTertiary, colors.error, colors.tint]);

  const handleSubmit = useCallback(async () => {
    if (!message || message.trim().length === 0) {
      Alert.alert('Empty Message', 'Please provide a description of the issue.');
      return;
    }

    if (message.trim().length < MIN_CHARACTERS) {
      Alert.alert(
        'Message Too Short',
        `Please provide more detail (at least ${MIN_CHARACTERS} characters).`,
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
          // eslint-disable-next-line no-undef
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

      // Set user context for Sentry
      Sentry.setUser({
        email: user?.email || undefined,
        id: user?.id || undefined,
        username: user?.email?.split('@')[0] || undefined,
      });

      Sentry.setContext('feedback_metadata', {
        app_version: pkg.version,
        submitted_at: new Date().toISOString(),
        message_length: message.trim().length,
        has_screenshot: !!screenshotUrl,
        screenshot_url: screenshotUrl || undefined,
      });

      // Use Sentry's captureFeedback API
      const feedbackMessage = screenshotUrl
        ? `${message.trim()}\n\nScreenshot: ${screenshotUrl}`
        : message.trim();

      Sentry.captureFeedback({
        name: user?.email?.split('@')[0] || 'Anonymous',
        email: user?.email || 'no-email@example.com',
        message: feedbackMessage,
      });

      lightFeedback();
      router.back();

      // Show success message after navigating back
      setTimeout(() => {
        Alert.alert(
          'Thank You!',
          "Your feedback has been sent. We'll review it and get back to you soon.",
        );
      }, 300);
    } catch (error) {
      handleError(error as Error, {
        showToast: false,
        analyticsEventName: 'Feedback_Capture_Error',
      });

      Alert.alert(
        'Error Sending Feedback',
        'Could not send feedback. Please try again or contact us via email.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retry',
            onPress: () => setIsSubmitting(false),
          },
        ],
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [message, user?.email, user?.id, screenshotUri]);

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView style={styles.content}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="What happened? How can we help?"
              placeholderTextColor={colors.textTertiary}
              value={message}
              onChangeText={setMessage}
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus={true}
              editable={!isSubmitting}
            />

            {screenshotUri ? (
              <View style={styles.screenshotPreview}>
                <Image source={{ uri: screenshotUri }} style={styles.screenshotImage} />
                <Pressable
                  onPress={handleRemoveScreenshot}
                  style={[
                    styles.removeButton,
                    { backgroundColor: colors.error, shadowColor: colors.shadow },
                  ]}
                >
                  <Ionicons name="close" size={20} color={colors.white} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleAddScreenshot}
                style={[styles.addScreenshotButton, { borderColor: colors.border }]}
              >
                <Ionicons name="image-outline" size={24} color={colors.tint} />
                <ThemedText type="body" colorName="tint" style={styles.addScreenshotText}>
                  Add Screenshot (Optional)
                </ThemedText>
              </Pressable>
            )}

            <ThemedView style={styles.metaRow}>
              <ThemedText type="caption" colorName="textTertiary" style={styles.hint}>
                Your email ({user?.email || 'not available'}) will be included
              </ThemedText>
              <ThemedText
                type="caption"
                style={[styles.characterCount, { color: characterCountColor }]}
              >
                {characterCount}/{MIN_CHARACTERS}
              </ThemedText>
            </ThemedView>

            <ThemedButton
              title={isSubmitting ? 'Sending...' : 'Send Feedback'}
              onPress={handleSubmit}
              disabled={isSubmitting || characterCount < MIN_CHARACTERS}
              variant={characterCount < MIN_CHARACTERS ? 'outlined' : 'filled'}
              style={styles.submitButton}
            />
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
});

FeedbackForm.displayName = 'FeedbackForm';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    minHeight: 150,
    maxHeight: 200,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  hint: {
    flex: 1,
    fontStyle: 'italic',
  },
  characterCount: {
    fontWeight: '600',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  addScreenshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.SMALL,
  },
  addScreenshotText: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  screenshotPreview: {
    position: 'relative',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  screenshotImage: {
    width: '100%',
    height: 200,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  removeButton: {
    position: 'absolute',
    top: LAYOUT.SPACING.SMALL,
    right: LAYOUT.SPACING.SMALL,
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...LAYOUT.ELEVATION.SMALL,
  },
  submitButton: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
});
