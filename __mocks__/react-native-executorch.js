// The real entry point reaches for a JSI installer at import time, so every
// suite that so much as pulls in VoiceGradingProvider would fail to load.
//
// A detector that refuses to build is the honest default for a test
// environment — there is no executorch runtime here — and it is also what makes
// the recorder take its energy-gate path, which is what the gate tests assert
// against. A suite that wants a live VAD builds a stub SpeechGate and hands it
// to `beginWindow` directly; nothing needs this module to pretend.
const notLoaded = () =>
  Promise.reject(new Error('The voice activity detector is not available under Jest'));

const FSMN_VAD = { modelPath: 'fsmn_vad_xnnpack_fp32.pte', defaultOptions: {} };

module.exports = {
  __esModule: true,
  // Plain functions on purpose: `resetMocks` strips a `jest.fn()` of its
  // implementation, and a detector that then resolves to undefined reads as a
  // gate that loaded.
  createFsmnVoiceActivityDetector: notLoaded,
  download: source => Promise.resolve(source),
  models: {
    voiceActivityDetection: { FSMN_VAD: { XNNPACK_FP32: FSMN_VAD, DEFAULT: FSMN_VAD } },
  },
};
