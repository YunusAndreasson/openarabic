import NetInfo from '@react-native-community/netinfo';

/**
 * True only when the device is KNOWN to be offline.
 *
 * A courtesy pre-flight, not a gate: its only job is to turn a guaranteed hang
 * into a fast, visible error, so it must never block an attempt that would have
 * worked. That rules out the two shapes the hand-written copies drifted into:
 *
 * - `isConnected` is `boolean | null`, and null means UNKNOWN (startup, a
 *   platform still probing), not offline. A truthiness test told a connected
 *   user they had no internet.
 * - `NetInfo.fetch()` can reject (or the native module can be missing). A copy
 *   that let that escape made sign-in impossible — strictly worse than the hang
 *   it was meant to prevent.
 *
 * So only a definitive `false` counts; anything else lets the real request decide.
 */
export async function isKnownOffline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === false;
  } catch {
    return false;
  }
}
