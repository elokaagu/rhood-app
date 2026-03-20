const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;

// Disable New Architecture support for now
// config.resolver.unstable_enablePackageExports = true;

// Fix asset path resolution to handle URL-encoded paths
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), "jsx", "js", "ts", "tsx"];
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");

// Normalize module paths where "./" was encoded as ".%2F" (fixes ENOENT scandir '.%2Fassets')
config.resolver.resolveRequest = (context, moduleName, platform) => {
  let next = moduleName;
  if (typeof next === "string") {
    next = next.replace(/\.%2F/gi, "./");
    if (next.includes("%")) {
      try {
        next = decodeURIComponent(next);
      } catch (_e) {
        /* keep next */
      }
    }
  }
  if (next !== moduleName) {
    try {
      return context.resolveRequest(context, next, platform);
    } catch (_e) {
      /* fall through */
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Ensure proper asset directory resolution
config.watchFolders = [path.resolve(__dirname)];

// Add custom server middleware to fix malformed asset URLs (e.g. ./ encoded as .%2F)
config.server = config.server || {};
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    if (req.url) {
      const qIndex = req.url.indexOf("?");
      const pathPart = qIndex >= 0 ? req.url.slice(0, qIndex) : req.url;
      const queryPart = qIndex >= 0 ? req.url.slice(qIndex) : "";
      let fixed = pathPart.replace(/\.%2F/gi, "./");
      if (fixed.includes("%")) {
        try {
          const once = decodeURIComponent(fixed);
          if (once !== fixed) fixed = once;
        } catch (e) {
          /* keep fixed */
        }
      }
      if (fixed + queryPart !== req.url) {
        req.url = fixed + queryPart;
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
