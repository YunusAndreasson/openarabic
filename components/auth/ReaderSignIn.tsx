import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { LegalLinks } from '@/components/auth/LegalLinks';
import { SignInForm } from '@/components/auth/SignInForm';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedInput } from '@/components/primitives/ThemedInput';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAppleAuth } from '@/hooks/auth/useAppleAuth';
import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { analytics } from '@/services/analytics';
import { readerSave, type ReaderSave } from '@/services/readerSave';
import {
  resumeReaderAttempt,
  startReaderAttempt,
  trackReaderAccount,
  type ReaderAuthAttempt,
  type StartReaderAuth,
} from '@/services/readerSaveAuth';
import { metaEvents } from '@/services/metaEvents';
import { supabase } from '@/services/supabase';
import { getEmailError, getAnalyticsErrorCode } from '@/utils/authUtils';
import { isKnownOffline } from '@/utils/network';

const CODE_LENGTH = 6;

/** Returning sign-in carries no word. The parent closes on a published auth session. */
export function ReaderSignIn({
  save,
  startHeader,
}: { save?: ReaderSave; startHeader?: StartReaderAuth } = {}) {
  const emailAttempt = useRef<ReaderAuthAttempt | undefined>(undefined);
  const startAttempt = save
    ? (provider: Parameters<typeof startReaderAttempt>[1]) => startReaderAttempt(save.id, provider)
    : startHeader;
  const appleAuth = useAppleAuth();
  const googleAuth = useGoogleAuth();
  const [step, setStep] = useState<'providers' | 'email' | 'code' | 'password'>(
    save?.codeAddress ? 'code' : 'providers',
  );
  const [email, setEmail] = useState(save?.codeAddress ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const mounted = useMountSafety();

  async function submit(verify: boolean) {
    if (inFlight.current) return;
    const address = email.trim();
    const invalid = getEmailError(address);
    if (invalid) {
      setError(invalid);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    const attempt = save ? resumeReaderAttempt(save) : emailAttempt.current;
    try {
      if (await isKnownOffline()) {
        attempt?.end('failed', 'offline');
        setError(STRINGS.NO_INTERNET_CONNECTION);
        return;
      }
      if (!mounted.current) return;
      if (verify) {
        const request = () =>
          supabase.auth.verifyOtp({
            email: address,
            token: code,
            type: 'email',
          });
        const response = await (attempt
          ? attempt.exchange({ email: address, token: code, type: 'email' }, request)
          : request());
        if (response.error || !response.data.session)
          throw response.error ?? new Error('missing_session');
        const created =
          !!save && response.data.user?.user_metadata['reader_signup_intent'] === save.id;
        attempt?.verifiedHeader?.('returning');
        void trackReaderAccount('email_code', created, attempt);
        if (created) metaEvents.logSignUp('email_code');
      } else {
        const response = await supabase.auth.signInWithOtp({
          email: address,
          options: save
            ? { shouldCreateUser: true, data: { reader_signup_intent: save.id } }
            : { shouldCreateUser: false },
        });
        if (response.error) throw response.error;
        if (save)
          await readerSave.change(save.id, old =>
            old.attempt?.id === attempt?.id && old.phase === 'auth'
              ? { ...old, codeAddress: address }
              : old,
          );
        setCode('');
        setStep('code');
      }
    } catch (cause) {
      attempt?.end('failed', verify ? 'verify' : 'send');
      void analytics.trackAuthFailed('email_code', getAnalyticsErrorCode(cause) ?? 'unknown');
      if (mounted.current)
        setError(verify ? STRINGS.EMAIL_CODE_ERROR : STRINGS.EMAIL_CODE_SEND_FAILED);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <View style={styles.body}>
      {save && (
        <>
          <ThemedText type="arabic" align="center" accessibilityLanguage="ar">
            {save.word.form}
          </ThemedText>
          <ThemedText type="bodyBold" align="center">
            {save.word.gloss}
          </ThemedText>
        </>
      )}
      <ThemedText type="heading2" accessibilityRole="header">
        {step === 'code'
          ? STRINGS.CHECK_YOUR_EMAIL
          : save && step === 'providers'
            ? STRINGS.TRACK_THIS_WORD
            : step === 'email'
              ? STRINGS.FIRST_PAGE_EMAIL
              : STRINGS.SIGN_IN}
      </ThemedText>
      {step === 'providers' ? (
        <>
          <ThemedText colorName="secondaryText">
            {save ? STRINGS.TRACK_WORD_BENEFIT : STRINGS.READER_SIGN_IN_BENEFIT}
          </ThemedText>
          <SocialAuthButtons
            reader
            startAttempt={startAttempt}
            appleAuth={appleAuth}
            googleAuth={googleAuth}
          />
          <ThemedButton
            title={STRINGS.FIRST_PAGE_EMAIL}
            variant="ghost"
            disabled={appleAuth.loading || googleAuth.loading}
            onPress={() => {
              if (!startAttempt) setStep('email');
              else
                void startAttempt('email_code')
                  .then(attempt => {
                    if (attempt && mounted.current) {
                      emailAttempt.current = attempt;
                      setStep('email');
                    }
                  })
                  .catch(() => setError(STRINGS.TRACK_WORD_FAILED));
            }}
          />
          {error ? <ThemedText accessibilityRole="alert">{error}</ThemedText> : null}
          <LegalLinks />
        </>
      ) : step === 'password' ? (
        <SignInForm returnToReader startAttempt={startAttempt} />
      ) : (
        <>
          <ThemedText>{step === 'code' ? email.trim() : STRINGS.EMAIL_ADDRESS_LABEL}</ThemedText>
          {step === 'code' ? (
            <ThemedInput
              key="code"
              accessibilityLabel={STRINGS.EMAIL_CODE}
              placeholder={STRINGS.EMAIL_CODE}
              value={code}
              editable={!busy}
              keyboardType="number-pad"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
              textContentType="oneTimeCode"
              onChangeText={value => {
                setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH));
                setError('');
              }}
            />
          ) : (
            <ThemedInput
              key="email"
              accessibilityLabel={STRINGS.EMAIL_ADDRESS_LABEL}
              value={email}
              editable={!busy}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={value => {
                setEmail(value);
                setError('');
              }}
            />
          )}
          {error ? (
            <ThemedText colorName="error" accessibilityRole="alert">
              {error}
            </ThemedText>
          ) : null}
          <ThemedButton
            key={`submit-${step}`}
            loading={busy}
            disabled={busy || (step === 'code' && code.length !== CODE_LENGTH)}
            title={step === 'code' ? STRINGS.VERIFY_EMAIL_CODE : STRINGS.SEND_EMAIL_CODE}
            onPress={() => void submit(step === 'code')}
          />
          {step === 'code' ? (
            <>
              <ThemedButton
                variant="ghost"
                disabled={busy}
                title={STRINGS.RESEND_EMAIL_CODE}
                onPress={() => void submit(false)}
              />
              <ThemedButton
                variant="ghost"
                disabled={busy}
                title={STRINGS.CHANGE_EMAIL_ADDRESS}
                onPress={() => {
                  if (save)
                    void readerSave
                      .change(save.id, old => ({ ...old, codeAddress: undefined }))
                      .catch(() => setError(STRINGS.TRACK_WORD_FAILED));
                  setStep('email');
                  setCode('');
                  setError('');
                }}
              />
            </>
          ) : null}
          <ThemedButton
            variant="ghost"
            disabled={busy}
            title={STRINGS.FIRST_PAGE_PASSWORD}
            onPress={() => setStep('password')}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ body: { gap: LAYOUT.SPACING.MEDIUM, alignItems: 'stretch' } });
