const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Reduce the number of files watched
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/.*/,
  /backend\/.*/,
  /demo\/.*/,
  /temp_backup\/.*/,
];

// Limit workers to reduce resource usage
config.maxWorkers = 1;

module.exports = config;
