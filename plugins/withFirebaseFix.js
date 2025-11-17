const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin to ensure Firebase pods are properly configured
 * This fixes issues with Firebase pod installation in EAS builds
 */
module.exports = function withFirebaseFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContents = fs.readFileSync(podfilePath, "utf-8");

      // Ensure iOS deployment target is at least 13.0 (required for Firebase)
      if (!podfileContents.includes("platform :ios")) {
        // This shouldn't happen, but handle it gracefully
        return config;
      }

      // Ensure minimum iOS version is 13.0 or higher
      const platformMatch = podfileContents.match(/platform :ios, ['"]([\d.]+)['"]/);
      if (platformMatch) {
        const currentVersion = parseFloat(platformMatch[1]);
        if (currentVersion < 13.0) {
          podfileContents = podfileContents.replace(
            /platform :ios, ['"][\d.]+['"]/,
            "platform :ios, '13.0'"
          );
        }
      }

      // Add use_modular_headers! if not present (required for some Firebase pods)
      if (!podfileContents.includes("use_modular_headers!")) {
        // Add after platform declaration
        podfileContents = podfileContents.replace(
          /(platform :ios, ['"][\d.]+['"])/,
          "$1\nuse_modular_headers!"
        );
      }

      fs.writeFileSync(podfilePath, podfileContents);
      return config;
    },
  ]);
};

