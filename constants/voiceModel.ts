/**
 * Voice model identity — which recognizer we run, and how it decodes.
 *
 * Lives in `constants/` rather than beside the hook because
 * `services/voiceModelStore.ts` owns the download and must not import from a
 * hook. The comment blocks below are the record of two settled experiments;
 * they are the reason this file is worth reading before changing a string.
 */

/**
 * NVIDIA Parakeet TDT transducer 110M (English, int8) — ~103 MB.
 *
 * **The 0.6B v2 was tried again on 2026-08-19 and reverted the same night.**
 * That is now a settled question rather than an open one, so do not re-run the
 * experiment without new evidence of a different kind.
 *
 * The case for going bigger was that `weighty` and `lineage` were each
 * overridden several times with a DIFFERENT wrong transcript every time, which
 * reads like an acoustic model that cannot resolve the word. Two things
 * disproved it.
 *
 * 1. **The decisive word got worse.** `girded with` has 43 attempts across both
 *    models — the deepest history in the table:
 *
 *        110M   40 attempts   15 credited (38%)   "guarded with" x6, "Girdle
 *                                                  with", "Guard it with", …
 *        0.6B    3 attempts    0 credited  (0%)   "Arrive.", "Girl of the
 *                                                  West.", "God it was."
 *
 * 2. **Most of the "instability" was never acoustic.** The retry pattern is
 *    `corruption` → "Pollution." → then "Corruption."; `journey` → "Travel." →
 *    then "Journey."; `his sessions` → "His assembly." → then "His sessions."
 *    Those first transcripts are not mishearings, they are OTHER ENGLISH WORDS,
 *    transcribed correctly. The learner reached for a synonym and the single
 *    stored gloss failed them. No acoustic model fixes that.
 *
 * What remains, having ruled the model out, is two non-ASR problems:
 * synonyms the corpus does not carry (`corruption`'s root offers "bad |
 * badness of | evil", never "pollution"), and glosses no recogniser will ever
 * emit — `girded with` has exactly one alternate in `sentence_words`, itself,
 * and a transducer's internal LM will always prefer "God it was". See
 * `useReviewGlossAlternates` for the widening that exists, and note it can only
 * widen to what the corpus already contains.
 *
 * Same `nemo_transducer` architecture either way, so decoding carries over
 * unchanged. `model_id` is on every attempt, which is what made this decidable.
 */
export const PARAKEET_MODEL_ID = 'sherpa-onnx-nemo-parakeet_tdt_transducer_110m-en-36000-int8';

/**
 * Decoding is greedy, and nothing here can change that.
 *
 * This file used to call `engine.setConfig({ decodingMethod: 'modified_beam_search' })`
 * after load, on the theory that a small beam keeps a rarer-but-correct hypothesis
 * alive on one-word audio. It never took effect for a single attempt. sherpa-onnx
 * picks the decoder ONCE, in the `OfflineRecognizerTransducerNeMoImpl` constructor,
 * from `config.decoding_method`. `OfflineRecognizerImpl::SetConfig` is only
 * `config_ = config;`, and the NeMo impl does not override it — so a post-load
 * setConfig mutates a struct that is never read again. Worse, the call RESOLVES, so
 * the try/catch guarding it never fired and no breadcrumb was ever emitted.
 *
 * `createSTT` exposes no decodingMethod option either (nor does the Kotlin
 * `buildRecognizerConfig`), so the recognizer is built with the default. The one
 * construction-time switch is a non-empty `hotwordsFile` on a transducer model,
 * which forces modified_beam_search — see the hotwords constants below.
 *
 * So: this constant records what runs without hotwords, and every attempt in
 * `voice_grading_attempts` before hotwords shipped — including the 80 that showed
 * one genuine mishear — was decoded greedily. Do not re-add a decoding config
 * without first checking that `createSTT` accepts one.
 */
export const VOICE_DECODING_METHOD = 'greedy_search';

/** What the recogniser decodes with once it has been built from a hotwords file. */
export const VOICE_HOTWORD_DECODING_METHOD = 'modified_beam_search';

/**
 * Session hotwords: bias the recogniser toward the answers of the review that
 * is open (`utils/voiceHotwords.ts`).
 *
 * This is the answer to glosses like `girded with` above, which the model's own
 * language model will never prefer. It is one switch for both platforms, and it
 * is here to be turned off: the sibling app that shipped this first disabled it
 * on iOS after a watchdog termination while rebuilding its (four times larger)
 * recogniser with hotwords, and nothing has yet measured it on this model. Every
 * attempt row records the decoding method and the phrase count, which is what a
 * bias-on / bias-off comparison needs.
 */
export const VOICE_HOTWORDS_ENABLED: boolean = true;

/** Boost per matched token. sherpa-onnx defaults to 1.5; a grader wants less pull. */
export const VOICE_HOTWORDS_SCORE = 1.0;

/** Past this a vocabulary stops being a session and the decoder carries it for nothing. */
export const VOICE_HOTWORDS_MAX_PHRASES = 256;
