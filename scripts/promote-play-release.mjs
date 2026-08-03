#!/usr/bin/env node
/**
 * Promote an existing Google Play release from one track to another.
 *
 * `eas submit` only ever uploads to the track named in eas.json (`internal`),
 * so a build that ships to users needs this second step. Rather than pull in
 * fastlane or googleapis for it, this signs the service-account JWT directly —
 * the Play Developer API is a handful of REST calls and a zero-dependency
 * script runs on a bare CI node with no install phase.
 *
 * Usage:
 *   node scripts/promote-play-release.mjs --key ./google-service-account.json \
 *     [--version-code 251] [--from internal] [--to production] \
 *     [--rollout 1.0] [--dry-run]
 *
 * --dry-run reports what every track currently holds and exits without
 * committing, which is also the cheapest way to see real Play state.
 */

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const PACKAGE_NAME = 'com.edenmind.OpenArabic';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

const parseArgs = argv => {
  const args = {
    key: './google-service-account.json',
    from: 'internal',
    to: 'production',
    rollout: '1.0',
    versionCode: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];

    switch (flag) {
      case '--key':
        args.key = value;
        i += 1;
        break;
      case '--version-code':
        args.versionCode = Number(value);
        i += 1;
        break;
      case '--from':
        args.from = value;
        i += 1;
        break;
      case '--to':
        args.to = value;
        i += 1;
        break;
      case '--rollout':
        args.rollout = value;
        i += 1;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      default:
        break;
    }
  }

  return args;
};

const base64url = value => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Exchange the service-account key for an access token (RS256 JWT bearer flow). */
const getAccessToken = async key => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  };

  const unsigned = `${base64url({ alg: 'RS256', typ: 'JWT' })}.${base64url(claims)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(key.private_key).toString('base64url')}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Token exchange failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body.access_token;
};

const callApi = async (token, path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${API}/applications/${PACKAGE_NAME}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // A committed/deleted edit answers 204 with no body.
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  return parsed;
};

const describeRelease = release => {
  const codes = (release.versionCodes ?? []).join(', ') || 'none';
  const fraction =
    release.userFraction === undefined ? '' : ` @ ${(release.userFraction * 100).toFixed(1)}%`;

  const head = `      ${release.status}${fraction} — versionCodes [${codes}] — "${release.name ?? 'unnamed'}"`;

  // Release notes are what users actually read, so surface them rather than
  // silently carrying them across tracks.
  const notes = (release.releaseNotes ?? []).map(
    note => `          [${note.language}] ${note.text?.replace(/\n/g, ' ⏎ ') ?? ''}`,
  );

  return [head, ...notes].join('\n');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const key = JSON.parse(readFileSync(args.key, 'utf8'));
  const rollout = Number(args.rollout);

  if (!Number.isFinite(rollout) || rollout <= 0 || rollout > 1) {
    throw new Error(`--rollout must be between 0 (exclusive) and 1, got "${args.rollout}"`);
  }

  const token = await getAccessToken(key);
  const edit = await callApi(token, '/edits', { method: 'POST', body: {} });

  try {
    const { tracks = [] } = await callApi(token, `/edits/${edit.id}/tracks`);

    console.log(`\nCurrent Play tracks for ${PACKAGE_NAME}:`);
    for (const track of tracks) {
      console.log(`  ${track.track}`);
      const releases = track.releases ?? [];
      if (releases.length === 0) {
        console.log('      (no releases)');
      }
      for (const release of releases) {
        console.log(describeRelease(release));
      }
    }
    console.log('');

    const source = tracks.find(track => track.track === args.from);

    if (!source || (source.releases ?? []).length === 0) {
      throw new Error(`Track "${args.from}" has no releases to promote.`);
    }

    // Default to the highest version code sitting in the source track.
    const candidates = (source.releases ?? []).flatMap(release =>
      (release.versionCodes ?? []).map(code => ({ code: Number(code), release })),
    );

    const target =
      args.versionCode === null
        ? candidates.reduce((best, item) => (item.code > best.code ? item : best))
        : candidates.find(item => item.code === args.versionCode);

    if (!target) {
      throw new Error(
        `Version code ${args.versionCode} is not in the "${args.from}" track. ` +
          `Found: ${candidates.map(item => item.code).join(', ') || 'none'}`,
      );
    }

    // The target track may already hold an unpublished draft of this build — a
    // console rollout someone started and never finished. Its name and notes
    // are the ones a human actually wrote, so publish those rather than
    // overwrite them with whatever the source track happens to carry.
    const destination = tracks.find(track => track.track === args.to);
    const existingDraft = (destination?.releases ?? []).find(release =>
      (release.versionCodes ?? []).some(code => Number(code) === target.code),
    );

    const blueprint = existingDraft ?? target.release;

    const promoted = {
      name: blueprint.name,
      versionCodes: [String(target.code)],
      status: rollout >= 1 ? 'completed' : 'inProgress',
      ...(rollout < 1 ? { userFraction: rollout } : {}),
      ...(blueprint.releaseNotes ? { releaseNotes: blueprint.releaseNotes } : {}),
    };

    console.log(
      `Promote versionCode ${target.code} ("${blueprint.name ?? 'unnamed'}") ` +
        `from "${args.from}" to "${args.to}" as ${promoted.status}` +
        `${rollout < 1 ? ` at ${(rollout * 100).toFixed(1)}% rollout` : ' (full rollout)'}.`,
    );

    if (existingDraft) {
      console.log(
        `Reusing the existing "${existingDraft.status}" release already on "${args.to}" ` +
          'for its name and release notes.',
      );
    }

    if (args.dryRun) {
      await callApi(token, `/edits/${edit.id}`, { method: 'DELETE' });
      console.log('\nDry run — edit discarded, nothing changed in Play.\n');
      return;
    }

    await callApi(token, `/edits/${edit.id}/tracks/${args.to}`, {
      method: 'PUT',
      body: { track: args.to, releases: [promoted] },
    });

    await callApi(token, `/edits/${edit.id}:commit`, { method: 'POST' });

    console.log(`\n✔ Committed. versionCode ${target.code} is now on the "${args.to}" track.`);
    console.log('Google review can still gate when users actually receive it.\n');
  } catch (error) {
    // Leaving an edit open blocks later ones; drop it before surfacing the failure.
    await callApi(token, `/edits/${edit.id}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
};

main().catch(error => {
  console.error(`\n✖ ${error.message}\n`);
  process.exit(1);
});
