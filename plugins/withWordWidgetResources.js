// The extension has its own bundle. Copy these public resources before code signing.
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

module.exports = config =>
  withXcodeProject(
    withDangerousMod(config, [
      'android',
      mod => {
        const provider = path.join(
          mod.modRequest.platformProjectRoot,
          'app/src/main/res/xml/word_in_context_info.xml',
        );
        const xml = fs.readFileSync(provider, 'utf8');
        fs.writeFileSync(
          provider,
          xml.replace(
            'android:initialLayout="@layout/expo_widgets_initial_layout"',
            'android:previewLayout="@layout/word_widget_public"\n  android:initialLayout="@layout/word_widget_public"',
          ),
        );
        return mod;
      },
    ]),
    result => {
      const project = result.modResults;
      const target = Object.entries(project.pbxNativeTargetSection()).find(
        ([, value]) =>
          typeof value === 'object' &&
          String(value.name).replaceAll('"', '') === 'ExpoWidgetsTarget',
      );
      if (!target) throw new Error('ExpoWidgetsTarget must be registered before its resources');
      const label = 'Word widget resources';
      if (!target[1].buildPhases.some(phase => phase.comment === label)) {
        project.addBuildPhase([], 'PBXShellScriptBuildPhase', label, target[0], {
          shellPath: '/bin/sh',
          shellScript: 'set -eu\ncp "$SCRIPT_INPUT_FILE_0" "$SCRIPT_OUTPUT_FILE_0"',
          inputPaths: ['"$(SRCROOT)/../assets/fonts/Amiri.ttf"'],
          outputPaths: ['"$(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/Amiri.ttf"'],
        });
      }
      return result;
    },
  );
