// Mock for @expo/ui/community/datetime-picker
//
// @expo/ui publishes untranspiled TypeScript source (its package exports point
// `default` at ./src/**), so importing it for real drags expo/src/Expo.fx.tsx
// into the Jest module graph, where EXDevLauncher is undefined and the suite
// dies at import time. Every consumer of components/ui/index.ts inherits that,
// so the stub lives here rather than in individual tests.
//
// The picker is a native view with no JS-observable behaviour, so a null render
// is a faithful stand-in. To drive it from a test, assert on the props captured
// by this mock rather than adding logic to the stub.
const DateTimePicker = mockStable(() => null);

module.exports = {
  __esModule: true,
  DateTimePicker,
  default: DateTimePicker,
  __mocks: { DateTimePicker },
};
