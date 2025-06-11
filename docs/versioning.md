# Islamic Calendar Versioning System

## Overview

Our app uses a unique versioning system based on the Islamic (Hijri) calendar that aligns with our Arabic language learning mission and provides meaningful version numbers for our users.

## Version Format

```
{ISLAMIC_YEAR}.{ISLAMIC_MONTH}.{RELEASE_NUMBER}
```

### Examples

- `1446.10.74` - Release #74 in the 10th month (Shawwal) of Islamic year 1446
- `1446.11.1` - First release in the 11th month (Dhu al-Qi'dah) of Islamic year 1446
- `1447.1.15` - Release #15 in the 1st month (Muharram) of Islamic year 1447

## How It Works

### New Month/Year

When we move to a new Islamic month or year:

- The version resets to use the current Islamic day as the starting release number
- Example: If today is the 15th of Muharram 1447, the version becomes `1447.1.15`

### Multiple Releases in Same Month

When making multiple releases within the same Islamic month:

- The release number increments sequentially
- This represents the total number of releases made in that month
- Example: `1446.10.74` → `1446.10.75` → `1446.10.76`

## Semantic Versioning Compliance

Our system maintains semver principles while using Islamic calendar dates:

- **Major Version (Year)**: Islamic year changes represent significant time periods
- **Minor Version (Month)**: Islamic month changes represent regular feature cycles
- **Patch Version (Release)**: Incremental releases within a month for fixes and features

## Benefits

1. **Cultural Alignment**: Reflects our Arabic/Islamic educational mission
2. **Meaningful Dates**: Version numbers have cultural significance for our audience
3. **Clear Chronology**: Easy to understand when releases were made
4. **Predictable**: Follows consistent rules for automatic bumping

## Islamic Calendar Reference

| Month # | Arabic Name     | English Translation  |
| ------- | --------------- | -------------------- |
| 1       | Muharram        | The Sacred Month     |
| 2       | Safar           | The Empty/Yellow     |
| 3       | Rabi' al-awwal  | First Spring         |
| 4       | Rabi' al-thani  | Second Spring        |
| 5       | Jumada al-awwal | First Freezing       |
| 6       | Jumada al-thani | Second Freezing      |
| 7       | Rajab           | The Respected Month  |
| 8       | Sha'ban         | The Separated Month  |
| 9       | Ramadan         | The Scorching Month  |
| 10      | Shawwal         | The Lifted Month     |
| 11      | Dhu al-Qi'dah   | The Sitting Month    |
| 12      | Dhu al-Hijjah   | The Pilgrimage Month |

## Usage

### Automatic Bumping

```bash
yarn bump
```

This command:

1. Runs TypeScript type checking
2. Runs linting
3. Calculates the new version based on Islamic calendar
4. Updates both `package.json` and `app.json`
5. Updates iOS build numbers and Android version codes
6. Provides detailed output about the Islamic date and release number

### Release Process

```bash
yarn release
```

This command:

1. Runs the bump process
2. Commits the version changes
3. Creates a git tag
4. Pushes to the repository

## Example Output

```
🕌 Islamic Calendar Version Bumping
=====================================
📦 Current version: 1446.10.73

🔄 Same Islamic month - incrementing release number
📊 Release #74 for Islamic month 1446/10

✅ Version Bump Complete!
=========================
📱 App version: 1446.10.74
🍎 iOS build: 74
🤖 Android version code: 7
📅 Islamic date: 25 Shawwal 1446 AH
📊 This is release #74 for this Islamic month
```

## Technical Implementation

The versioning system uses the `moment-hijri` library to:

- Get accurate Islamic calendar dates
- Convert between Gregorian and Islamic calendars
- Handle Islamic year/month transitions correctly

The system validates that:

- Version format is correct (YEAR.MONTH.PATCH)
- Patch numbers are reasonable (>= 1, warns if > 100)
- Provides warnings for date mismatches
