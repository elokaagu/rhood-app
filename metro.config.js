const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Disable New Architecture support for now
// config.resolver.unstable_enablePackageExports = true;

module.exports = config;
