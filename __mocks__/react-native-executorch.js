// The real entry point reaches for a JSI installer at import time, so every
// suite that so much as pulls in VoiceGradingProvider would fail to load.
//
// `isAvailable: false` is the honest default for a test environment — there is
// no executorch runtime here — and it is also the value that makes the recorder
// take its energy-gate path, which is what the gate tests assert against. A
// suite that wants a live VAD builds a stub SpeechGate and hands it to
// `beginWindow` directly; nothing needs this module to pretend.
const notLoaded = () => {
  throw new Error('VADModule is not available under Jest');
};

module.exports = {
  __esModule: true,
  isAvailable: false,
  initExecutorch: jest.fn(),
  cleanupExecutorch: jest.fn(),
  VADModule: { fromModelName: jest.fn(notLoaded), fromCustomModel: jest.fn(notLoaded) },
  models: {
    vad: {
      fsmn_vad: () => ({ modelName: 'fsmn-vad', modelSource: 'fsmn_vad_xnnpack_fp32.pte' }),
    },
  },
};
