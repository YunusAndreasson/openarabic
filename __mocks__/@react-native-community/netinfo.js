/**
 * Bare mock — see `__mocks__/react-native-sherpa-onnx-download.js` for why no
 * implementations live here (`resetMocks: true` strips them before the first
 * test).
 *
 * `addEventListener` must both return an unsubscribe function AND expose the
 * registered listeners, so a test can drive a "Wi-Fi appeared" transition. Arm
 * it with `installNetInfoMock()` from `__tests__/helpers/serviceMocks.ts`.
 */
export default {
  fetch: jest.fn(),
  addEventListener: jest.fn(),
};
