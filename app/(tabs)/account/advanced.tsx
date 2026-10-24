/**
 * Advanced (voice grading) developer settings. Surfaces the Parakeet model
 * load state and the recording knobs that otherwise only live in
 * DEFAULT_RECORDING_CONFIG, so quiet-capture issues (notably iOS raw mode) can
 * be A/B tested on-device without a rebuild. No sliders — toggles only.
 *
 * Development builds only. The row that opens it is gated the same way
 * (Settings → Practice), the knobs read their shipped values in production
 * whatever is persisted (see the selectors in store/settingsSlice), and a deep
 * link to this route in production lands back on Settings. The one control a
 * learner needs from here, removing the model, lives in the Practice section.
 *
 * Because no learner reaches it, the model row keeps the raw library error on
 * failure: the exact message is the reason to open this screen.
 */
import { Redirect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { SettingsCard, SettingsSection } from '@/components/account';
import { useVoiceGrading } from '@/components/providers';
import { ScreenScaffold, SectionLabel } from '@/components/common';
import { PulsatingLoader } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useVoiceModel } from '@/hooks/voice/useVoiceModel';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { voiceReadiness } from '@/utils/voiceReadiness';
import {
  selectVoiceDebugEnabled,
  selectVoiceEnergyGateEnabled,
  selectVoiceGainNormalizeEnabled,
  selectVoiceIosRawMode,
  setVoiceDebugEnabled,
  setVoiceEnergyGateEnabled,
  setVoiceGainNormalizeEnabled,
  setVoiceIosRawMode,
} from '@/store/settingsSlice';

type StatusColor = 'success' | 'error' | 'tint' | 'textTertiary';

/**
 * Inline loader sized to sit beside a single line of `body` text in the status
 * row — `PulsatingLoader`'s own 48pt default is a screen-filling size. It
 * reserves room for its own pulse, so the row is 24pt tall for a 20pt circle.
 */
const STATUS_LOADER_SIZE = LAYOUT.BUTTON.ICON_SIZE.MEDIUM;

const AdvancedScreen = () => {
  const dispatch = useAppDispatch();
  const voice = useVoiceGrading();
  const model = useVoiceModel();

  const energyGateEnabled = useAppSelectorShallow(selectVoiceEnergyGateEnabled);
  const gainNormalizeEnabled = useAppSelectorShallow(selectVoiceGainNormalizeEnabled);
  const iosRawMode = useAppSelectorShallow(selectVoiceIosRawMode);
  const debugEnabled = useAppSelectorShallow(selectVoiceDebugEnabled);

  // Shares `voiceReadiness` with the Practice row and the review screen, so the
  // three cannot drift apart again. This screen keeps the raw error string,
  // though — it is the developer surface, and the exact library message is the
  // whole reason to open it.
  const modelStatus = useMemo<{ label: string; color: StatusColor; spinner: boolean }>(() => {
    const readiness = voiceReadiness({
      voiceEnabled: voice.enabled,
      micDenied: false,
      model,
      engine: { isReady: voice.isReady, isWarming: voice.isWarming, error: voice.error },
    });
    switch (readiness.kind) {
      case 'off':
        return { label: STRINGS.ADVANCED_MODEL_VOICE_OFF, color: 'textTertiary', spinner: false };
      case 'ready':
      // This section reports the MODEL, and bytes-on-disk is what "Ready" means
      // here. Whether a recognizer is currently resident in RAM is the review
      // screen's business, not this row's.
      case 'model-ready':
        return { label: STRINGS.ADVANCED_MODEL_READY, color: 'success', spinner: false };
      case 'waiting-wifi':
        return { label: STRINGS.ADVANCED_MODEL_WAITING_WIFI, color: 'tint', spinner: false };
      case 'failed':
        return {
          label: voice.error ?? model.error ?? readiness.reason,
          color: 'error',
          spinner: false,
        };
      case 'pending':
        return { label: STRINGS.ADVANCED_MODEL_NOT_LOADED, color: 'textTertiary', spinner: false };
      case 'preparing':
        return {
          label: STRINGS.ADVANCED_MODEL_DOWNLOADING.replace(
            '{pct}',
            String(Math.round(readiness.progress * 100)),
          ),
          color: 'tint',
          spinner: true,
        };
      default:
        return { label: STRINGS.ADVANCED_MODEL_NOT_LOADED, color: 'textTertiary', spinner: false };
    }
  }, [voice.enabled, voice.error, voice.isReady, voice.isWarming, model]);

  const makeToggleHandler = useCallback(
    (action: (value: boolean) => { type: string; payload: boolean }) => (value: boolean) => {
      dispatch(action(value));
    },
    [dispatch],
  );

  const handleEnergyGate = useMemo(
    () => makeToggleHandler(setVoiceEnergyGateEnabled),
    [makeToggleHandler],
  );
  const handleGainNorm = useMemo(
    () => makeToggleHandler(setVoiceGainNormalizeEnabled),
    [makeToggleHandler],
  );
  const handleIosRaw = useMemo(() => makeToggleHandler(setVoiceIosRawMode), [makeToggleHandler]);
  const handleDebug = useMemo(() => makeToggleHandler(setVoiceDebugEnabled), [makeToggleHandler]);

  const modelRight = (
    <View style={styles.statusRight}>
      {/* Decorative: the label beside it already states the model's status, so
          a second focus stop announcing a generic "Loading…" would say less
          than the text next to it. */}
      {modelStatus.spinner && (
        <PulsatingLoader size={STATUS_LOADER_SIZE} accessibilityLabel={null} />
      )}
      <ThemedText type="body" colorName={modelStatus.color} style={styles.statusText}>
        {modelStatus.label}
      </ThemedText>
    </View>
  );

  return (
    <ScreenScaffold>
      <SettingsSection title={STRINGS.ADVANCED_MODELS_SECTION}>
        <SettingsCard
          icon="mic"
          label={STRINGS.ADVANCED_MODEL_PARAKEET}
          rightType="custom"
          rightComponent={modelRight}
        />
      </SettingsSection>

      <SettingsSection title={STRINGS.ADVANCED_RECORDING_SECTION}>
        <SettingsCard
          icon="ear"
          label={STRINGS.ADVANCED_ENERGY_GATE}
          subtitle={STRINGS.ADVANCED_ENERGY_GATE_SUBTITLE}
          rightType="toggle"
          toggleValue={energyGateEnabled}
          onToggleChange={handleEnergyGate}
        />
        <SettingsCard
          icon="options"
          label={STRINGS.ADVANCED_GAIN_NORM}
          subtitle={STRINGS.ADVANCED_GAIN_NORM_SUBTITLE}
          rightType="toggle"
          toggleValue={gainNormalizeEnabled}
          onToggleChange={handleGainNorm}
        />
        {Platform.OS === 'ios' && (
          <SettingsCard
            icon="hardware-chip"
            label={STRINGS.ADVANCED_IOS_RAW}
            subtitle={STRINGS.ADVANCED_IOS_RAW_SUBTITLE}
            rightType="toggle"
            toggleValue={iosRawMode}
            onToggleChange={handleIosRaw}
          />
        )}
      </SettingsSection>

      <SettingsSection title={STRINGS.ADVANCED_DEBUG_SECTION}>
        <SettingsCard
          icon="bug"
          label={STRINGS.ADVANCED_DEBUG_HUD}
          subtitle={STRINGS.ADVANCED_DEBUG_HUD_SUBTITLE}
          rightType="toggle"
          toggleValue={debugEnabled}
          onToggleChange={handleDebug}
        />
      </SettingsSection>

      <SectionLabel title={STRINGS.ADVANCED_DEBUG_FOOTER} style={styles.footer} />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  statusRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: LAYOUT.SPACING.SMALL,
  },
  statusText: {
    flexShrink: 1,
  },
  footer: {
    paddingTop: LAYOUT.SPACING.LARGE,
  },
});

AdvancedScreen.displayName = 'AdvancedScreen';

const AdvancedRoute = () =>
  __DEV__ ? <AdvancedScreen /> : <Redirect href={ROUTE_PATHS.ACCOUNT} />;

export default AdvancedRoute;
