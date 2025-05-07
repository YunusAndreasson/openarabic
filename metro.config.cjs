const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable package exports resolution to avoid Node.js module issues
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
