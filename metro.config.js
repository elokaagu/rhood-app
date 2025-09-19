const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable New Architecture support
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
