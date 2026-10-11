import { createAction } from '@reduxjs/toolkit';

/**
 * A different account has signed in on this device. Handled by `rootReducer`,
 * which returns every slice but the theme to its initial state.
 *
 * In its own module so the auth hook can dispatch it without importing the
 * reducers — and, through them, every constant a slice happens to read.
 */
export const accountSwitched = createAction('account/switched');
