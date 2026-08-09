/**
 * Advanced (voice grading) developer settings. Surfaces the Parakeet model
 * load state and the recording knobs that otherwise only live in
 * DEFAULT_RECORDING_CONFIG, so quiet-capture issues (notably iOS raw mode) can
 * be A/B tested on-device without a rebuild. No sliders — toggles only.
 */
import { useCallback, useMemo, type FC } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SettingsCard, SettingsSection } from '@/components/account';
import { useVoiceGrading } from '@/components/providers';
import { SectionLabel } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import {
  setVoiceDebugEnabled,
  setVoiceEnergyGateEnabled,
  setVoiceGainNormalizeEnabled,
  setVoiceIosRawMode,
} from '@/store/settingsSlice';

type StatusColor = 'success' | 'error' | 'tint' | 'textTertiary';

const AdvancedScreen: FC = () => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const voice = useVoiceGrading();

  const energyGateEnabled = useAppSelectorShallow(state => state.settings.voiceEnergyGateEnabled);
  const gainNormalizeEnabled = useAppSelectorShallow(
    state => state.settings.voiceGainNormalizeEnabled,
  );
  const iosRawMode = useAppSelectorShallow(state => state.settings.voiceIosRawMode);
  const debugEnabled = useAppSelectorShallow(state => state.settings.voiceDebugEnabled);

  const modelStatus = useMemo<{ label: string; color: StatusColor; spinner: boolean }>(() => {
    if (!voice.enabled)
      return { label: STRINGS.ADVANCED_MODEL_VOICE_OFF, color: 'textTertiary', spinner: false };
    if (voice.error) return { label: voice.error, color: 'error', spinner: false };
    if (voice.isReady)
      return { label: STRINGS.ADVANCED_MODEL_READY, color: 'success', spinner: false };
    if (voice.isLoading) {
      const pct = Math.round((voice.downloadProgress ?? 0) * 100);
      return {
        label: STRINGS.ADVANCED_MODEL_DOWNLOADING.replace('{pct}', String(pct)),
        color: 'tint',
        spinner: true,
      };
    }
    return { label: STRINGS.ADVANCED_MODEL_NOT_LOADED, color: 'textTertiary', spinner: false };
  }, [voice.enabled, voice.error, voice.isReady, voice.isLoading, voice.downloadProgress]);

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
      {modelStatus.spinner && <ActivityIndicator size="small" color={colors.tint} />}
      <ThemedText type="body" colorName={modelStatus.color} numberOfLines={1}>
        {modelStatus.label}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={false}
        scrollable={true}
        style={styles.flexOne}
        useSafeArea={false}
        contentContainerStyle={styles.scrollContent}
        scrollViewProps={{ showsVerticalScrollIndicator: true }}
      >
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
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  statusRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: LAYOUT.SPACING.SMALL,
  },
  footer: {
    paddingTop: LAYOUT.SPACING.LARGE,
  },
});

AdvancedScreen.displayName = 'AdvancedScreen';

export default AdvancedScreen;
