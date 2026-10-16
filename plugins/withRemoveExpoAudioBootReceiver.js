const { withAndroidManifest } = require('expo/config-plugins');

const BOOT_RELATED_ACTIONS = new Set([
  'android.intent.action.BOOT_COMPLETED',
  'android.intent.action.LOCKED_BOOT_COMPLETED',
  'android.intent.action.REBOOT',
  'android.intent.action.QUICKBOOT_POWERON',
  'com.htc.intent.action.QUICKBOOT_POWERON',
]);

const ANDROID_NAME_ATTR = 'android:name';
const TOOLS_NODE_ATTR = 'tools:node';
const TOOLS_NS = 'http://schemas.android.com/tools';

function removeUsesPermission(manifest, permissionName) {
  const keysToCheck = ['uses-permission', 'uses-permission-sdk-23'];

  keysToCheck.forEach(key => {
    if (!manifest[key] || !Array.isArray(manifest[key])) {
      return;
    }

    manifest[key] = manifest[key].filter(perm => {
      const name = perm?.$?.[ANDROID_NAME_ATTR];
      return name !== permissionName;
    });
  });
}

function ensureToolsNamespace(manifest) {
  if (!manifest.$) {
    manifest.$ = {};
  }
  if (!manifest.$['xmlns:tools']) {
    manifest.$['xmlns:tools'] = TOOLS_NS;
  }
}

function addUsesPermissionRemove(manifest, permissionName) {
  ensureToolsNamespace(manifest);

  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }

  // Add a tools:node="remove" marker so the Gradle manifest merger also removes
  // the permission if it's contributed by a library manifest (e.g. expo-notifications).
  manifest['uses-permission'].push({
    $: {
      [ANDROID_NAME_ATTR]: permissionName,
      [TOOLS_NODE_ATTR]: 'remove',
    },
  });
}

function stripBootActionsFromIntentFilters(component) {
  if (!component?.['intent-filter'] || !Array.isArray(component['intent-filter'])) {
    return;
  }

  component['intent-filter'] = component['intent-filter'].filter(filter => {
    if (!filter?.action || !Array.isArray(filter.action)) {
      return true;
    }

    filter.action = filter.action.filter(action => {
      const actionName = action?.$?.[ANDROID_NAME_ATTR];
      return !BOOT_RELATED_ACTIONS.has(actionName);
    });

    // Keep this intent-filter if it still has any actions (or categories, etc.)
    return filter.action.length > 0;
  });
}

function addReceiverBootActionRemovals(application, receiverName, actionNames) {
  if (!application.receiver) {
    application.receiver = [];
  }

  // We can't safely delete expo-notifications/task-manager receivers entirely because they
  // also handle non-boot actions. Instead we add an overlay receiver definition that tells
  // the manifest merger to remove only the boot actions.
  application.receiver.push({
    $: {
      [ANDROID_NAME_ATTR]: receiverName,
      [TOOLS_NODE_ATTR]: 'merge',
    },
    'intent-filter': [
      {
        $: {
          [TOOLS_NODE_ATTR]: 'merge',
        },
        action: actionNames.map(name => ({
          $: {
            [ANDROID_NAME_ATTR]: name,
            [TOOLS_NODE_ATTR]: 'remove',
          },
        })),
      },
    ],
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
const withRemoveExpoAudioBootReceiver = config => {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;

    if (!manifest.application || !manifest.application[0]) {
      return config;
    }

    // Ensure the final merged manifest does not request boot delivery.
    // Libraries like expo-notifications can contribute this permission.
    removeUsesPermission(manifest, 'android.permission.RECEIVE_BOOT_COMPLETED');
    addUsesPermissionRemove(manifest, 'android.permission.RECEIVE_BOOT_COMPLETED');

    const application = manifest.application[0];

    // Strip boot-related actions from ALL receivers (not just expo-audio).
    // This avoids any possible boot → restricted-foreground-service path on Android 15+.
    if (application.receiver && Array.isArray(application.receiver)) {
      application.receiver = application.receiver.filter(receiver => {
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

    // Ensure Gradle's manifest merger also removes boot actions contributed by library manifests.
    // These receivers are known to include BOOT_COMPLETED in their own AndroidManifest.xml.
    addReceiverBootActionRemovals(
      application,
      'expo.modules.notifications.service.NotificationsService',
      [
        'android.intent.action.BOOT_COMPLETED',
        'android.intent.action.LOCKED_BOOT_COMPLETED',
        'android.intent.action.REBOOT',
        'android.intent.action.QUICKBOOT_POWERON',
        'com.htc.intent.action.QUICKBOOT_POWERON',
      ],
    );

    // `taskmanager`, all lower case, since SDK 58 (it was `taskManager`). The name
    // has to match the library's receiver exactly: a stale one makes this overlay
    // declare a NEW receiver with an intent-filter and no android:exported, which
    // fails the manifest merge for any app targeting Android 12+.
    addReceiverBootActionRemovals(application, 'expo.modules.taskmanager.TaskBroadcastReceiver', [
      'android.intent.action.BOOT_COMPLETED',
      'android.intent.action.LOCKED_BOOT_COMPLETED',
    ]);

    // WorkManager contributes a RescheduleReceiver with BOOT_COMPLETED. If you don't need any
    // work to reschedule after reboot, removing this action avoids Play's boot→FGS warnings.
    addReceiverBootActionRemovals(
      application,
      'androidx.work.impl.background.systemalarm.RescheduleReceiver',
      ['android.intent.action.BOOT_COMPLETED'],
    );

    return config;
  });
};

module.exports = withRemoveExpoAudioBootReceiver;
