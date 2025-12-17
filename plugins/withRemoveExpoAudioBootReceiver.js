const { withAndroidManifest } = require('@expo/config-plugins');

const BOOT_RELATED_ACTIONS = new Set([
  'android.intent.action.BOOT_COMPLETED',
  'android.intent.action.REBOOT',
  'android.intent.action.QUICKBOOT_POWERON',
  'com.htc.intent.action.QUICKBOOT_POWERON',
]);

const ANDROID_NAME_ATTR = 'android:name';

function removeUsesPermission(manifest, permissionName) {
  if (!manifest['uses-permission'] || !Array.isArray(manifest['uses-permission'])) {
    return;
  }

  manifest['uses-permission'] = manifest['uses-permission'].filter((perm) => {
    const name = perm?.$?.[ANDROID_NAME_ATTR];
    return name !== permissionName;
  });
}

function stripBootActionsFromIntentFilters(component) {
  if (!component?.['intent-filter'] || !Array.isArray(component['intent-filter'])) {
    return;
  }

  component['intent-filter'] = component['intent-filter'].filter((filter) => {
    if (!filter?.action || !Array.isArray(filter.action)) {
      return true;
    }

    filter.action = filter.action.filter((action) => {
      const actionName = action?.$?.[ANDROID_NAME_ATTR];
      return !BOOT_RELATED_ACTIONS.has(actionName);
    });

    // Keep this intent-filter if it still has any actions (or categories, etc.)
    return filter.action.length > 0;
  });
}

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

    // Ensure the final merged manifest does not request boot delivery.
    // Libraries like expo-notifications can contribute this permission.
    removeUsesPermission(manifest, 'android.permission.RECEIVE_BOOT_COMPLETED');

    const application = manifest.application[0];

    // Strip boot-related actions from ALL receivers (not just expo-audio).
    // This avoids any possible boot → restricted-foreground-service path on Android 15+.
    if (application.receiver && Array.isArray(application.receiver)) {
      application.receiver = application.receiver.filter((receiver) => {
        stripBootActionsFromIntentFilters(receiver);

        // If receiver has no intent-filters left after filtering, remove the entire receiver.
        // This is safe for receivers that only exist to handle boot.
        const hasIntentFilters =
          receiver?.['intent-filter'] && Array.isArray(receiver['intent-filter']);
        if (hasIntentFilters && receiver['intent-filter'].length === 0) {
          return false;
        }

        return true;
      });
    }

    return config;
  });
};

module.exports = withRemoveExpoAudioBootReceiver;
