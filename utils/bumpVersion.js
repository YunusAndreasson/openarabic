const { execSync } = require('child_process');
const fs = require('fs');

const moment = require('moment-hijri');

function runCheck(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

function getIslamicDateVersion() {
  // Get current Islamic date
  const now = moment();
  const islamicYear = now.iYear();
  const islamicMonth = now.iMonth() + 1; // iMonth() returns 0-11, we want 1-12
  const islamicDay = now.iDate();

  return {
    year: islamicYear,
    month: islamicMonth,
    day: islamicDay,
  };
}

function getHighestBuildNumber(appJson) {
  const iosBuildNumber = parseInt(appJson.expo?.ios?.buildNumber ?? '', 10);
  const androidVersionCode = parseInt(appJson.expo?.android?.versionCode ?? '', 10);

  return Math.max(iosBuildNumber, androidVersionCode);
}

function calculateNewVersion(currentVersion) {
  const { year, month, day } = getIslamicDateVersion();

  // Extract base version (remove build number if present)
  const baseVersion = currentVersion.includes('+') ? currentVersion.split('+')[0] : currentVersion;

  const parts = baseVersion.split('.');

  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${baseVersion}. Expected format: YEAR.MONTH.PATCH`);
  }

  const [currentYear, currentMonth, currentPatch] = parts.map(Number);
  const currentDateString = `${currentYear}.${currentMonth}`;
  const newDateString = `${year}.${month}`;

  // If we're on a new Islamic month/year, reset patch to day number
  if (currentDateString !== newDateString) {
    const newVersion = `${year}.${month}.${day}`;
    return newVersion;
  }

  // Same month - increment patch version for multiple releases per day
  // The patch number represents the release count for this month
  const newPatch = currentPatch + 1;
  const newVersion = `${year}.${month}.${newPatch}`;

  return newVersion;
}

function createVersionWithBuild(baseVersion, buildNumber) {
  return `${baseVersion}+${buildNumber}`;
}

function validateVersion(version) {
  const _currentYear = getIslamicDateVersion().year;
  const _currentMonth = getIslamicDateVersion().month;
  const parts = version.split('.').map(Number);
  const _versionYear = parts[0];
  const _versionMonth = parts[1];
  const patch = parts[2];

  // Validate year and month match current Islamic date (silently continue if mismatch)

  // Validate patch is reasonable (not negative, not extremely high)
  if (patch < 1) {
    throw new Error(`Invalid patch number: ${patch}. Must be >= 1`);
  }

  if (patch > 100) {
    // High patch number detected - validation will continue but user should verify
  }

  return true;
}

// Run type check
runCheck('yarn tsc --noEmit', 'TypeScript type check');
// Run lint
runCheck('yarn lint', 'Lint');

// Get current versions
const appJsonPath = './app.json';
const pkgPath = './package.json';

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const currentVersion = pkg.version;

// Get highest build number and increment it
const currentHighestBuild = getHighestBuildNumber(appJson);
const newBuildNumber = currentHighestBuild + 1;

// Calculate new base version (without build number)
const newBaseVersion = calculateNewVersion(currentVersion);
validateVersion(newBaseVersion);

// Create full version with build metadata (semver compliant)
const newFullVersion = createVersionWithBuild(newBaseVersion, newBuildNumber);

// Update app.json
const expo = appJson.expo;
expo.version = newBaseVersion; // Expo version stays as base version
if (!expo.ios) expo.ios = {};
expo.ios.buildNumber = newBuildNumber.toString(); // Set unified build number
if (!expo.android) expo.android = {};
expo.android.versionCode = newBuildNumber; // Set unified build number

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

// Update package.json with full version including build number
pkg.version = newFullVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// Version bump completed successfully
