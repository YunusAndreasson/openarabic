# Argent QA account

The app's reusable automated UI-test account is `argent-qa@openarabic.app`.

Run the following command from the repository root to create the confirmed Supabase Auth user, or to synchronize its password with the local Argent secrets file:

```sh
node scripts/setup-argent-qa-account.mjs
```

The command stores credentials in `.argent/secrets.env` as `OPEN_ARABIC_TEST_EMAIL` and `OPEN_ARABIC_TEST_PASSWORD`. The password is generated locally, is never printed, and is reused on subsequent runs. The `.argent` directory must remain ignored by Git.

The setup uses `SUPABASE_SERVICE_ROLE_KEY` when it is configured. Otherwise it reads the key transiently through the authenticated Supabase CLI, so run `supabase login` first on a new development machine. The service-role key is never saved by this script.

Argent can enter the credentials without exposing them in tool output:

```text
{{secret:OPEN_ARABIC_TEST_EMAIL}}
{{secret:OPEN_ARABIC_TEST_PASSWORD}}
```

This account is persistent test infrastructure. Do not use it for personal data, production learning activity, or manual account ownership.

## Destructive lifecycle tests

Never run account-deletion tests against the reusable account. Create a unique
temporary email (for example, `lifecycle-YYYYMMDD-NN@openarabic.app`) through the
real signup UI, exercise onboarding and deletion, then verify that signing up
again with the same address succeeds. Delete the recreated account when the run
finishes, and sign the emulator back into the reusable account above.

Onboarding and tutorial state is stored per Supabase user ID. This is deliberate:
switching accounts on one emulator must not suppress a new user's first-run flow
or reset the returning QA user's progress.

## Settings regression checklist

Use the reusable account for non-destructive settings checks. Its baseline is:

- Theme: Midnight Summer
- Arabic font: Noto Sans, 32 px
- Display language: Arabic + English
- Daily reading limit: 10
- Smart reminders: off
- Audio language: Arabic + English

Exercise each picker and toggle, verify the result immediately, then restore the
baseline. Force-stop and relaunch the app once at the end to verify that the
restored values persisted. Confirmation dialogs for clearing cache, resetting
tutorials/progress, signing out, and deleting the account may be opened, but
cancel them. Use a temporary lifecycle account for destructive actions.

The reusable automated regression command is:

```sh
npx jest __tests__/hooks/account/useAccountScreen.test.tsx \
  __tests__/components/account/SettingsCard.test.tsx \
  __tests__/components/ui/Toggle.test.tsx --runInBand
```

## Practice regression setup

Keep at least one due word on the reusable account. Do not reset or delete this
account merely to recreate first-run state; tutorial state is deliberately
persistent. The reusable no-answer abort check is recorded at:

```sh
argent flow execute .argent/flows/practice-start-abort.yaml --device emulator-5554
```

Before a destructive practice run, note the dictionary count and the selected
word's FSRS state. Restore removed fixture words after the run. Removing and
re-adding a word creates a fresh FSRS card and therefore erases that word's
review history; use a designated fixture word, not arbitrary learner data.

For add/remove checks, verify all three surfaces agree after each mutation:

- the article word sheet says `Add to practice` or `In practice` correctly;
- the Practice dictionary contains exactly one matching root;
- the dashboard total and due count update after query invalidation.

Also force-stop and relaunch once while an article is open. A word sheet must
not default to `Add to practice` while the study-word query is still loading;
wait for the persisted state before enabling the action.
