jest.mock('expo', () => ({ requireOptionalNativeModule: () => undefined }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('../../utils/splashPolyfill');

test('imports without crashing when native module is missing', () => {
  expect(true).toBe(true);
});
