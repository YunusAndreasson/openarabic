import { useCallback, useRef } from 'react';
import type { TextInput } from 'react-native';

import { useAuthForm } from '@/hooks/auth/useAuthForm';

/**
 * The email + password field pair both auth forms drive, with the
 * validate-on-blur / re-validate-while-erroring behaviour they share.
 *
 * `SignInForm` and `SignUpForm` carried this block character-for-character
 * identically — the ref, the `useAuthForm()` destructure, and all five
 * handlers. Only the submit action and the footer differ between them, so
 * those stay in the forms.
 *
 * The `useCallback`s are kept rather than left to the React Compiler: they were
 * already here, and this codebase deliberately does not sweep existing manual
 * memoisation.
 */
export function useAuthFormFields() {
  const passwordInputRef = useRef<TextInput>(null);
  const form = useAuthForm();

  const {
    email,
    setEmail,
    password,
    setPassword,
    emailError,
    passwordError,
    validateEmail,
    validatePassword,
  } = form;

  const focusPasswordInput = useCallback(() => {
    passwordInputRef.current?.focus();
  }, []);

  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (emailError) validateEmail(text);
    },
    [emailError, validateEmail, setEmail],
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (passwordError) validatePassword(text);
    },
    [passwordError, validatePassword, setPassword],
  );

  const handleEmailBlur = useCallback(() => {
    if (email) validateEmail(email);
  }, [email, validateEmail]);

  const handlePasswordBlur = useCallback(() => {
    if (password) validatePassword(password);
  }, [password, validatePassword]);

  return {
    ...form,
    passwordInputRef,
    focusPasswordInput,
    handleEmailChange,
    handlePasswordChange,
    handleEmailBlur,
    handlePasswordBlur,
  };
}
