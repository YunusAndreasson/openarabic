// react-native-audio-api ships native bindings via TurboModuleRegistry.getEnforcing
// that aren't available under Jest. Mock the surface we actually use in
// lib/voice/recording.ts.

const systemListeners = new Map();

const mockAudioManager = {
  checkRecordingPermissions: jest.fn().mockResolvedValue('Granted'),
  requestRecordingPermissions: jest.fn().mockResolvedValue('Granted'),
  setAudioSessionOptions: jest.fn(),
  setAudioSessionActivity: jest.fn().mockResolvedValue(undefined),
  observeAudioInterruptions: jest.fn(),
  addSystemEventListener: jest.fn((name, callback) => {
    const set = systemListeners.get(name) ?? new Set();
    set.add(callback);
    systemListeners.set(name, set);
    return { remove: () => set.delete(callback) };
  }),
};

/** Every recorder constructed since the last reset, newest last. */
const instances = [];

class MockAudioRecorder {
  constructor() {
    this._callback = null;
    this._errorCallback = null;
    this.state = 'idle';
    this.startCalls = 0;
    this.pauseCalls = 0;
    this.resumeCalls = 0;
    this.stopCalls = 0;
    instances.push(this);
  }
  onAudioReady(opts, callback) {
    this._callback = callback;
    this._options = opts;
    return { status: 'ok' };
  }
  async start() {
    this.startCalls += 1;
    this.state = 'recording';
    return { status: 'ok' };
  }
  pause() {
    this.pauseCalls += 1;
    if (this.state === 'recording') this.state = 'paused';
  }
  resume() {
    this.resumeCalls += 1;
    if (this.state === 'paused') this.state = 'recording';
  }
  onError(callback) {
    this._errorCallback = callback;
  }
  clearOnError() {
    this._errorCallback = null;
  }
  clearOnAudioReady() {
    this._callback = null;
  }
  async stop() {
    this.stopCalls += 1;
    this.state = 'idle';
    return { status: 'ok', value: { paths: [], size: 0, duration: 0 } };
  }

  // --- test helpers -------------------------------------------------------

  /** Deliver one buffer of `frames` samples all at amplitude `level`. */
  emitBuffer({ level = 0, frames = 1600, sampleRate = 16000 } = {}) {
    const data = new Float32Array(frames).fill(level);
    this._callback?.({
      buffer: { getChannelData: () => data, sampleRate },
      numFrames: frames,
      when: 0,
    });
  }

  emitError(message) {
    this._errorCallback?.({ message });
  }
}

module.exports = {
  __esModule: true,
  AudioManager: mockAudioManager,
  AudioRecorder: MockAudioRecorder,
  __mocks: {
    AudioManager: mockAudioManager,
    /** The most recently constructed recorder, or undefined. */
    lastRecorder: () => instances[instances.length - 1],
    recorderCount: () => instances.length,
    resetRecorders: () => {
      instances.length = 0;
    },
    emitSystemEvent: (name, payload) => {
      systemListeners.get(name)?.forEach(listener => listener(payload));
    },
  },
};
