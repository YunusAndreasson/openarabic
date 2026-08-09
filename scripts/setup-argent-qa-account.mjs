#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const secretsPath = resolve(projectRoot, '.argent/secrets.env');
const mcpConfigPath = resolve(projectRoot, '.mcp.json');
const supabaseConstantsPath = resolve(projectRoot, 'constants/supabase.ts');
const qaEmail = 'argent-qa@openarabic.app';
const execFileAsync = promisify(execFile);

function parseEnv(text) {
  return new Map(
    text
      .split(/\r?\n/)
      .filter(line => line && !line.trimStart().startsWith('#') && line.includes('='))
      .map(line => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function resolveConfigValue(value) {
  const match = /^\$\{([^}]+)\}$/.exec(value);
  return match ? process.env[match[1]] : value;
}

async function getSupabaseConfig() {
  const mcpConfig = JSON.parse(await readFile(mcpConfigPath, 'utf8'));
  const configured = mcpConfig.mcpServers?.supabase?.env ?? {};
  let serviceRoleKey = resolveConfigValue(configured.SUPABASE_SERVICE_ROLE_KEY);
  let url = resolveConfigValue(configured.SUPABASE_URL);

  if (!url) {
    const constants = await readFile(supabaseConstantsPath, 'utf8');
    url = constants.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)?.[1];
  }

  if (!url) {
    throw new Error('Supabase URL is not configured');
  }

  if (!serviceRoleKey) {
    const projectRef = new URL(url).hostname.split('.')[0];
    const { stdout } = await execFileAsync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'],
      { cwd: projectRoot, maxBuffer: 1024 * 1024 },
    );
    const apiKeys = JSON.parse(stdout);
    serviceRoleKey = apiKeys.find(key => key.name === 'service_role')?.api_key;
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Supabase service-role key is unavailable; authenticate the Supabase CLI first',
    );
  }

  return { url, serviceRoleKey };
}

async function adminRequest(url, serviceRoleKey, path, init = {}) {
  const response = await fetch(`${url}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Supabase admin request failed (${response.status}): ${body.message ?? body.msg ?? 'unknown error'}`,
    );
  }
  return body;
}

async function main() {
  const currentText = await readFile(secretsPath, 'utf8').catch(() => '');
  const secrets = parseEnv(currentText);
  const password =
    secrets.get('OPEN_ARABIC_TEST_PASSWORD') ?? `Argent-${randomBytes(24).toString('base64url')}!`;
  const { url, serviceRoleKey } = await getSupabaseConfig();

  const usersResponse = await adminRequest(url, serviceRoleKey, '/users?page=1&per_page=1000');
  const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse.users ?? []);
  const existing = users.find(user => user.email?.toLowerCase() === qaEmail);
  const payload = JSON.stringify({
    email: qaEmail,
    password,
    email_confirm: true,
    user_metadata: { purpose: 'argent-qa', reusable: true },
  });

  if (existing) {
    await adminRequest(url, serviceRoleKey, `/users/${existing.id}`, {
      method: 'PUT',
      body: payload,
    });
  } else {
    await adminRequest(url, serviceRoleKey, '/users', { method: 'POST', body: payload });
  }

  secrets.set('OPEN_ARABIC_TEST_EMAIL', qaEmail);
  secrets.set('OPEN_ARABIC_TEST_PASSWORD', password);
  await mkdir(dirname(secretsPath), { recursive: true });
  await writeFile(
    secretsPath,
    `${[...secrets.entries()].map(([key, value]) => `${key}=${value}`).join('\n')}\n`,
    { mode: 0o600 },
  );
  await chmod(secretsPath, 0o600);
  console.log(
    existing ? 'Reusable Argent QA account synchronized.' : 'Reusable Argent QA account created.',
  );
}

await main();
