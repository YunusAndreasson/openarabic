# Security policy

OpenArabic has user accounts in Supabase, signed in by email and password or
with Apple or Google. Behind them are each learner's saved words, review
history and the text of their spoken answers, in the same database that holds
the published texts. The app ships with the database's public key, so
row-level security is what keeps one account out of another's data. A hole in
it exposes real learners. Please report one privately.

## Reporting a vulnerability

Use GitHub's private reporting:
[report a vulnerability](https://github.com/YunusAndreasson/openarabic/security/advisories/new).
Please don't open a public issue, and don't test against accounts that aren't
yours.

Include the app version (at the bottom of the Account screen) and platform,
what you did, what happened, and what an attacker would gain. A fix is
coordinated with you before anything is published, and you're credited in the
advisory unless you'd rather not be.

## Supported versions

Only the latest release in the App Store and Google Play gets fixes. They ship
as an over-the-air update or a new store release; a fix in the database's
policies applies to every version at once.

## Scope

In scope:

- the app in this repository, and the over-the-air updates it receives
- the database's row-level security policies and functions, in
  `supabase/migrations/`
- the admin panel in `admin-dashboard/`
- this repository's workflows

Out of scope: the website at openarabic.io, which has its own repository
([openarabic.io](https://github.com/YunusAndreasson/openarabic.io)), and
vulnerabilities in Supabase, Expo, Apple or Google sign-in themselves. Report
those to their projects. The Supabase key in `constants/supabase.ts` is the
public one and is meant to ship in the app; a way to do more with it than
your own account allows is in scope.
