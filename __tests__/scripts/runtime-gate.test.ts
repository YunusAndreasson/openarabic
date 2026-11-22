/**
 * Runtime gate (scripts/check-runtime.js) and the guarded OTA command
 * (scripts/eas-update.sh), each run as a child process in a throwaway project
 * with a stubbed `expo/fingerprint`. A fake `eas` on PATH records any call, so
 * no test can publish.
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const runtime = '1448.5.10';
const hashes = { ios: 'native-ios', android: 'native-android' };
const repoScripts = join(__dirname, '../../scripts');
let root: string;

function json(path: string, value: unknown) {
  writeFileSync(join(root, path), JSON.stringify(value));
}
function record(runtimes: Record<string, typeof hashes>, blocked: string[] = []) {
  json('native-runtimes.json', { blocked, runtimes });
}
function stubFingerprint(body: string) {
  writeFileSync(join(root, 'node_modules/expo/fingerprint.js'), body);
}
const completeFingerprint = `exports.createFingerprintAsync = async (_, { platforms: [p] }) => ({
  hash: 'native-' + p,
  sources: [{ id: 'expoAutolinkingConfig:' + p }, { id: 'rncoreAutolinkingConfig:' + p }],
});`;

function gate(...args: string[]) {
  return spawnSync(process.execPath, [join(root, 'scripts/check-runtime.js'), ...args], {
    encoding: 'utf8',
  });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'runtime-gate-'));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'node_modules/expo'), { recursive: true });
  copyFileSync(join(repoScripts, 'check-runtime.js'), join(root, 'scripts/check-runtime.js'));
  copyFileSync(join(repoScripts, 'eas-update.sh'), join(root, 'scripts/eas-update.sh'));
  stubFingerprint(completeFingerprint);
  json('app.json', { expo: { version: runtime, runtimeVersion: runtime } });
  record({ [runtime]: hashes });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('check-runtime.js', () => {
  it('accepts unchanged native source', () => {
    const result = gate();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`runtime ${runtime}`);
  });

  it('refuses a native change on either platform, even when recording', () => {
    for (const platform of ['ios', 'android'] as const) {
      record({ [runtime]: { ...hashes, [platform]: 'old-native-code' } });
      for (const args of [[], ['--record']]) {
        const result = gate(...args);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`NEW runtimeVersion`);
        expect(result.stderr).toContain(`(${platform})`);
      }
    }
  });

  it('requires deliberate recording of a new runtime, keyed by the runtimeVersion string', () => {
    record({});
    expect(gate().stderr).toContain('Unrecorded runtime');
    expect(gate('--record').status).toBe(0);
    const manifest = JSON.parse(readFileSync(join(root, 'native-runtimes.json'), 'utf8'));
    expect(manifest.runtimes).toEqual({ [runtime]: hashes });
    expect(gate().status).toBe(0);
  });

  it('refuses retired runtimes even if their hashes match', () => {
    record({ [runtime]: hashes }, [runtime]);
    expect(gate('--record').stderr).toContain('retired');
  });

  it('keeps 1448.6.13 retired after two different fingerprint pairs were recorded', () => {
    const ambiguousRuntime = '1448.6.13';
    copyFileSync(join(repoScripts, '../native-runtimes.json'), join(root, 'native-runtimes.json'));
    json('app.json', { expo: { runtimeVersion: ambiguousRuntime } });
    const result = gate('--record');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`Runtime ${ambiguousRuntime} is retired`);
  });

  it('refuses a runtime policy instead of a hand-set string', () => {
    json('app.json', { expo: { version: runtime, runtimeVersion: { policy: 'appVersion' } } });
    expect(gate().stderr).toContain('runtimeVersion string');
  });

  it('refuses an incomplete fingerprint instead of recording missing native modules', () => {
    stubFingerprint(
      'exports.createFingerprintAsync = async () => ({ hash: "partial", sources: [] });',
    );
    record({});
    const result = gate('--record');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Incomplete');
    expect(existsSync(join(root, 'native-runtimes.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(root, 'native-runtimes.json'), 'utf8')).runtimes).toEqual(
      {},
    );
  });

  it('rejects unknown arguments', () => {
    expect(gate('--force').stderr).toContain('Usage');
  });
});

describe('eas-update.sh', () => {
  let easLog: string;
  let env: NodeJS.ProcessEnv;

  function git(...args: string[]) {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', env });
    expect(result.status).toBe(0);
  }
  function ota(...args: string[]) {
    return spawnSync('bash', [join(root, 'scripts/eas-update.sh'), ...args], {
      cwd: root,
      encoding: 'utf8',
      env,
    });
  }

  beforeEach(() => {
    const bin = join(root, '.bin');
    easLog = join(root, '.eas-calls');
    mkdirSync(bin);
    writeFileSync(join(bin, 'eas'), `#!/bin/sh\necho "$@" >> "${easLog}"\n`);
    chmodSync(join(bin, 'eas'), 0o755);
    env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    };
    writeFileSync(join(root, '.gitignore'), '.bin/\n.eas-calls\n');
    git('init', '--quiet', '--bare', join(root, '.bin/remote.git'));
    git('init', '--quiet', '--initial-branch=main');
    git('add', '.');
    git('commit', '--quiet', '-m', 'init');
    git('remote', 'add', 'origin', join(root, '.bin/remote.git'));
    git('push', '--quiet', '-u', 'origin', 'main');
  });

  it('requires a message', () => {
    expect(ota('ios').stderr).toContain('message is required');
  });

  it('rejects a rollout outside 1-100', () => {
    for (const value of ['0', '101', '50%']) {
      expect(ota('m', '--rollout-percentage', value).status).toBe(2);
    }
  });

  it('refuses when the runtime gate fails', () => {
    record({ [runtime]: { ...hashes, ios: 'old-native-code' } });
    git('commit', '--quiet', '-am', 'stale record');
    git('push', '--quiet');
    const result = ota('Fix', '--dry-run');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Native source changed');
  });

  it('refuses a dirty tree', () => {
    writeFileSync(join(root, 'wip.ts'), '');
    const result = ota('Fix', '--dry-run');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('not clean');
  });

  it('refuses when HEAD is not the upstream', () => {
    git('commit', '--quiet', '--allow-empty', '-m', 'unpushed');
    const result = ota('Fix', '--dry-run');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not match origin/main');
  });

  it('pins the production branch and environment and defaults to every platform', () => {
    const result = ota('Fix the reader', '--dry-run');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'eas update --branch production --environment production --platform all --message Fix the reader',
    );
    expect(existsSync(easLog)).toBe(false);
  });

  it('passes the platform and rollout to eas update', () => {
    const result = ota('android', 'Fix', '--rollout-percentage', '10');
    expect(result.status).toBe(0);
    expect(readFileSync(easLog, 'utf8').trim()).toBe(
      'update --branch production --environment production --platform android --message Fix --rollout-percentage 10',
    );
  });
});
