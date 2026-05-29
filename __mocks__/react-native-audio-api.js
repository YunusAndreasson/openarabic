// react-native-audio-api ships native bindings via TurboModuleRegistry.getEnforcing
// that aren't available under Jest. Mock the surface we actually use in
// lib/voice/recording.ts.

const mockAudioManager = {
  checkRecordingPermissions: jest.fn().mockResolvedValue('Granted'),
  requestRecordingPermissions: jest.fn().mockResolvedValue('Granted'),
  setAudioSessionOptions: jest.fn(),
  setAudioSessionActivity: jest.fn().mockResolvedValue(undefined),
};

class MockAudioRecorder {
  constructor() {
    this._callback = null;
  }
  onAudioReady(_opts, callback) {
    this._callback = callback;
    return { status: 'ok' };
  }
  start() {
    return { status: 'ok' };
  }
  clearOnAudioReady() {
    this._callback = null;
  }
  stop() {}
}

module.exports = {
  __esModule: true,
  AudioManager: mockAudioManager,
  AudioRecorder: MockAudioRecorder,
  __mocks: { AudioManager: mockAudioManager },
};
