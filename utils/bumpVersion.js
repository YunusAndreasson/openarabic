const { execSync } = require('child_process');
const fs = require('fs');

const moment = require('moment-hijri');

function runCheck(cmd, name) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    console.error(`\n❌ ${name} failed. Aborting version bump.\n`);
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

function calculateNewVersion(currentVersion) {
  const { year, month, day } = getIslamicDateVersion();
  const parts = currentVersion.split('.');

  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${currentVersion}. Expected format: YEAR.MONTH.PATCH`);
  }

  const [currentYear, currentMonth, currentPatch] = parts.map(Number);
  const currentDateString = `${currentYear}.${currentMonth}`;
  const newDateString = `${year}.${month}`;

  // If we're on a new Islamic month/year, reset patch to day number
  if (currentDateString !== newDateString) {
    const newVersion = `${year}.${month}.${day}`;
    console.log(`📅 New Islamic month detected: ${currentDateString} → ${newDateString}`);
    console.log(`🎯 Version will be: ${newVersion} (Islamic date: ${year}/${month}/${day})`);
    return newVersion;
  }

  // Same month - increment patch version for multiple releases per day
  // The patch number represents the release count for this month
  const newPatch = currentPatch + 1;
  const newVersion = `${year}.${month}.${newPatch}`;

  console.log(`🔄 Same Islamic month - incrementing release number`);
  console.log(`📊 Release #${newPatch} for Islamic month ${year}/${month}`);

  return newVersion;
}

function validateVersion(version) {
  const { year, month } = getIslamicDateVersion();
  const parts = version.split('.').map(Number);
  const [versionYear, versionMonth, patch] = parts;

  // Validate year and month match current Islamic date
  if (versionYear !== year || versionMonth !== month) {
    console.warn(
      `⚠️  Warning: Version date (${versionYear}/${versionMonth}) doesn't match current Islamic date (${year}/${month})`
    );
  }

  // Validate patch is reasonable (not negative, not extremely high)
  if (patch < 1) {
    throw new Error(`Invalid patch number: ${patch}. Must be >= 1`);
  }

  if (patch > 100) {
    console.warn(
      `⚠️  Warning: High patch number (${patch}) detected. Consider if this is correct.`
    );
  }

  return true;
}

// Run type check
runCheck('yarn tsc --noEmit', 'TypeScript type check');
// Run lint
runCheck('yarn lint', 'Lint');

console.log('\n🕌 Islamic Calendar Version Bumping');
console.log('=====================================');

// Get current versions
const appJsonPath = './app.json';
const pkgPath = './package.json';

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const currentVersion = pkg.version;
console.log(`📦 Current version: ${currentVersion}`);

// Calculate new version
const newVersion = calculateNewVersion(currentVersion);
validateVersion(newVersion);

// Update app.json
const expo = appJson.expo;
expo.version = newVersion;
if (!expo.ios) expo.ios = {};
expo.ios.buildNumber = newVersion.split('.')[2]; // Use patch number as build number
if (!expo.android) expo.android = {};
expo.android.versionCode = Number(expo.android.versionCode || 0) + 1;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

// Show Islamic date info
const { year, month, day } = getIslamicDateVersion();
const islamicMonths = [
  'Muharram',
  'Safar',
  "Rabi' al-awwal",
  "Rabi' al-thani",
  'Jumada al-awwal',
  'Jumada al-thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];

console.log('\n✅ Version Bump Complete!');
console.log('=========================');
console.log(`📱 App version: ${newVersion}`);
console.log(`🍎 iOS build: ${expo.ios.buildNumber}`);
console.log(`🤖 Android version code: ${expo.android.versionCode}`);
console.log(`📅 Islamic date: ${day} ${islamicMonths[month - 1]} ${year} AH`);
console.log(`📊 This is release #${newVersion.split('.')[2]} for this Islamic month`);
console.log('');
