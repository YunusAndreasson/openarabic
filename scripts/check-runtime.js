#!/usr/bin/env node
// Keep each runtimeVersion's native fingerprint immutable once recorded, so a
// native change without a runtime bump can neither build nor publish an OTA.
// Runs from `yarn verify`, `eas-build-post-install` and scripts/eas-update.sh.
// The fingerprint options live in fingerprint.config.js, which EAS reads too.
const fs = require('node:fs');
const path = require('node:path');
const { createFingerprintAsync } = require('expo/fingerprint');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'native-runtimes.json');
const PLATFORMS = ['ios', 'android'];

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--record')) throw new Error('Usage: check-runtime.js [--record]');
  const record = args.includes('--record');
  const runtime = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo
    .runtimeVersion;
  if (typeof runtime !== 'string' || runtime === '') {
    throw new Error('Expected a hand-set runtimeVersion string in app.json.');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.blocked.includes(runtime)) {
    throw new Error(`Runtime ${runtime} is retired; set a NEW runtimeVersion in app.json.`);
  }
  const hashes = {};
  for (const platform of PLATFORMS) {
    const fingerprint = await createFingerprintAsync(root, { platforms: [platform] });
    const ids = new Set(fingerprint.sources.map(source => source.id));
    for (const id of [`expoAutolinkingConfig:${platform}`, `rncoreAutolinkingConfig:${platform}`]) {
      if (!ids.has(id)) {
        throw new Error(
          `Incomplete ${platform} native discovery (no ${id}); check node_modules and the local Node before recording or publishing.`,
        );
      }
    }
    hashes[platform] = fingerprint.hash;
  }
  const previous = manifest.runtimes[runtime];
  if (previous && PLATFORMS.some(platform => previous[platform] !== hashes[platform])) {
    const changed = PLATFORMS.filter(platform => previous[platform] !== hashes[platform]).join(
      ' and ',
    );
    throw new Error(
      `Native source changed within runtime ${runtime} (${changed}). Set a NEW runtimeVersion in app.json, then run yarn runtime:record. Never replace an existing runtime record.`,
    );
  }
  if (!previous) {
    if (!record) {
      throw new Error(
        `Unrecorded runtime ${runtime}. Run yarn runtime:record and commit native-runtimes.json before building or publishing.`,
      );
    }
    manifest.runtimes[runtime] = hashes;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(`Native compatibility verified for runtime ${runtime} (iOS and Android).`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
