const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to remove expo-audio's BOOT_COMPLETED receivers
 * that violate Android 15 restrictions on starting foreground services from boot receivers.
 *
 * Android 15+ restricts starting certain foreground service types (mediaPlayback, microphone)
 * from BOOT_COMPLETED receivers. expo-audio registers these receivers internally,
 * so we need to remove them to prevent app crashes on Android 15+.
 */
const withRemoveExpoAudioBootReceiver = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.application || !manifest.application[0]) {
      return config;
    }

    const application = manifest.application[0];

    // Remove expo-audio's BOOT_COMPLETED receivers
    if (application.receiver && Array.isArray(application.receiver)) {
      application.receiver = application.receiver.filter((receiver) => {
        // Check if this is an expo-audio receiver
        const receiverName = receiver.$?.['android:name'];
        const isExpoAudioReceiver =
          receiverName &&
          (receiverName.includes('expo.modules.audio.service.AudioRecordingService') ||
            receiverName.includes('expo.modules.audio.service.AudioControlsService'));

        if (!isExpoAudioReceiver) {
          // Keep non-expo-audio receivers
          return true;
        }

        // For expo-audio receivers, remove BOOT_COMPLETED intent-filters
        if (receiver['intent-filter'] && Array.isArray(receiver['intent-filter'])) {
          receiver['intent-filter'] = receiver['intent-filter'].filter((filter) => {
            if (filter.action && Array.isArray(filter.action)) {
              const hasBootCompleted = filter.action.some(
                (action) => action.$?.['android:name'] === 'android.intent.action.BOOT_COMPLETED'
              );
              // Remove filters that contain BOOT_COMPLETED action
              return !hasBootCompleted;
            }
            // Keep filters without actions (shouldn't happen, but be safe)
            return true;
          });

          // If receiver has no intent-filters left after filtering, remove the entire receiver
          if (receiver['intent-filter'].length === 0) {
            return false;
          }
        } else {
          // Receiver has no intent-filters, remove it
          return false;
        }

        // Keep receiver if it still has intent-filters after removing BOOT_COMPLETED
        return true;
      });
    }

    return config;
  });
};

module.exports = withRemoveExpoAudioBootReceiver;
