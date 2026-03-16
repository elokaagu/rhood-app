const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;

// Disable New Architecture support for now
// config.resolver.unstable_enablePackageExports = true;

// Fix asset path resolution to handle URL-encoded paths
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), "jsx", "js", "ts", "tsx"];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");

// Alias "assets" -> project assets folder so require("assets/...") avoids "./" (which can become .%2F in URLs and cause ENOENT)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  assets: path.join(projectRoot, "assets"),
};

// Ensure proper asset directory resolution
config.watchFolders = [path.resolve(__dirname)];

// Add custom server middleware to decode URL-encoded asset paths
config.server = config.server || {};
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    // Decode URL-encoded paths in asset requests before processing
    if (req.url && req.url.includes("%2F")) {
      try {
        const decodedUrl = decodeURIComponent(req.url);
        // Only update if decoding succeeds and changes the URL
        if (decodedUrl !== req.url) {
          req.url = decodedUrl;
        }
      } catch (e) {
        // If decoding fails, continue with original URL
        console.warn("Failed to decode URL:", req.url, e);
      }
    }
    
    // Call original middleware if it exists, otherwise use the provided middleware
    if (originalEnhanceMiddleware) {
      return originalEnhanceMiddleware(middleware)(req, res, next);
    }
    return middleware(req, res, next);
  };
};

module.exports = config;
