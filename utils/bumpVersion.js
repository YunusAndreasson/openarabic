const { execSync } = require('child_process');
const fs = require('fs');

function runCheck(cmd, name) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.error(`\n❌ ${name} failed. Aborting version bump.\n`);
    process.exit(1);
  }
}

function bumpPatch(version) {
  const parts = version.split('.');
  parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
  return parts.join('.');
}

// Run type check
runCheck('tsc --noEmit', 'TypeScript type check');
// Run lint
runCheck('yarn lint', 'Lint');

// Bump app.json
const appJsonPath = './app.json';
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const expo = appJson.expo;
expo.version = bumpPatch(expo.version);
if (!expo.ios) expo.ios = {};
expo.ios.buildNumber = String(Number(expo.ios.buildNumber || 0) + 1);
if (!expo.android) expo.android = {};
expo.android.versionCode = Number(expo.android.versionCode || 0) + 1;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

// Bump package.json
const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = bumpPatch(pkg.version);
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log(
  `\n✅ Bumped to app.json version: ${expo.version}, build: ${expo.ios.buildNumber}, android: ${expo.android.versionCode}`
);
console.log(`✅ Bumped to package.json version: ${pkg.version}`);
