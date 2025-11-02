// plugins/with-now-playing-info.js
// Expo Config Plugin to add native iOS code for MPNowPlayingInfoCenter

const { withInfoPlist, withXcodeProject } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Add native iOS module for MPNowPlayingInfoCenter
 */
function withNowPlayingInfo(config) {
  // Add Info.plist entry if needed (already configured)
  config = withInfoPlist(config, (config) => {
    // No Info.plist changes needed - audio background mode already enabled
    return config;
  });

  // Add native Swift code for MPNowPlayingInfoCenter
  config = withXcodeProject(config, (config) => {
    const projectPath = path.join(
      config.modRequest.platformProjectRoot,
      "RHOODApp.xcodeproj/project.pbxproj"
    );

    // The native code will be added via a separate manual step
    // This plugin just marks that the feature is enabled
    console.log(
      "📱 Now Playing Info plugin: Native code needs to be added manually"
    );

    return config;
  });

  return config;
}

module.exports = withNowPlayingInfo;
