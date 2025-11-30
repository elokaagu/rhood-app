const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Disable New Architecture support for now
// config.resolver.unstable_enablePackageExports = true;

// Fix asset path resolution to handle URL-encoded paths
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), "jsx", "js", "ts", "tsx"];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");

// Ensure proper asset directory resolution
config.watchFolders = [path.resolve(__dirname)];

module.exports = config;
