/**
 * BARE mocks only — no implementations here.
 *
 * `jest.config.js` sets `resetMocks: true`, which strips every implementation
 * before each test. A `jest.fn().mockResolvedValue(...)` written at module scope
 * runs exactly once, at import, and is then wiped — so the mock silently returns
 * `undefined` and an `await` on it yields `undefined` rather than throwing. That
 * failure is invisible: the test passes while asserting nothing.
 *
 * Suites arm these in `beforeEach` via `installSherpaMocks()` in
 * `__tests__/helpers/serviceMocks.ts`.
 */
module.exports = {
  __esModule: true,
  ModelCategory: { Stt: 'stt' },
  ensureModel: jest.fn(),
  refreshModels: jest.fn(),
  getModelPath: jest.fn(),
  deleteModel: jest.fn(),
};
