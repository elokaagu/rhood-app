const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin to add use_modular_headers! to Podfile for Firebase compatibility
 * This is required because Firebase Swift pods need modular headers
 */
module.exports = function withFirebaseModularHeaders(config) {
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

      // Don't add global use_modular_headers! as it conflicts with React Native
      // Instead, Firebase pods will be handled by the @react-native-firebase/app plugin
      // which should configure them properly

      fs.writeFileSync(podfilePath, podfileContents);
      return config;
    },
  ]);
};

