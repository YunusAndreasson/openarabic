#!/usr/bin/env node

/**
 * Script to update app.json with theme colors from Colors.ts
 *
 * Usage: node scripts/update-app-config.js
 */

const fs = require('fs');
const path = require('path');

// Path to app.json and colors file
const APP_CONFIG_PATH = path.resolve(__dirname, '../app.json');
const COLORS_PATH = path.resolve(__dirname, '../constants/Colors.ts');

// Read the app config
const appConfig = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf8'));

// Extract colors from Colors.ts
function extractColorsFromTs() {
  const colorsContent = fs.readFileSync(COLORS_PATH, 'utf8');

  // Match dark elevation1 color
  const darkElevation1Match = colorsContent.match(/dark:\s*{[^}]*elevation1:\s*['"]([^'"]+)['"]/s);

  if (!darkElevation1Match) {
    console.error('Could not find dark elevation1 color in Colors.ts');
    process.exit(1);
  }

  return {
    darkElevation1: darkElevation1Match[1],
  };
}

// Get colors from Colors.ts
const colors = extractColorsFromTs();

// Update app config
appConfig.expo.android.adaptiveIcon.backgroundColor = colors.darkElevation1;

// Update splash screen color in plugins
if (appConfig.expo.plugins) {
  appConfig.expo.plugins.forEach(plugin => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') {
      plugin[1].backgroundColor = colors.darkElevation1;
    }
  });
}

// Update splash screen color
if (appConfig.expo.splash) {
  appConfig.expo.splash.backgroundColor = colors.darkElevation1;
}

// Write updated config back to app.json
fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(appConfig, null, 2) + '\n');

console.log('Updated app.json with theme colors from Colors.ts');
