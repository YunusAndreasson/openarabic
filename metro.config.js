const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = path.resolve(__dirname);

const config = getDefaultConfig(projectRoot);

module.exports = config;
