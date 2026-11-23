/** Inspect the release configuration without executing any release or uploader. */
import { expect, test, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import eas from '../../eas.json';

test('store builds extend the upload-enabled base and use the Sentry Metro serializer', () => {
  expect(eas.build.production.extends).toBe('base');
  expect(eas.build.base.env).toMatchObject({
    SENTRY_DISABLE_AUTO_UPLOAD: 'false',
    SENTRY_ALLOW_FAILURE: 'true',
  });
  const configure = jest.fn((_root: string) => ({ serializer: {} }));
  jest.isolateModules(() => {
    jest.doMock('@sentry/react-native/metro', () => ({ getSentryExpoConfig: configure }));
    expect(require('../../metro.config.js')).toBe(configure.mock.results[0]?.value);
  });
  expect(configure).toHaveBeenCalledWith(resolve(__dirname, '../..'));
});

test('the OTA checks maps using the installed SDK validator and uploads the published export', () => {
  const script = readFileSync(resolve(__dirname, '../../scripts/eas-update.sh'), 'utf8');
  const afterPublish = script.split('"${cmd[@]}"\n')[1];
  expect(afterPublish).toContain('@sentry/react-native/scripts/has-sourcemap-debugid.js');
  expect(afterPublish).toContain('yarn sentry-expo-upload-sourcemaps dist');
});
