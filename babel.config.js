module.exports = function (api) {
  // Config depends on NODE_ENV (console stripping) — cache per env, not forever.
  api.cache.using(() => process.env.NODE_ENV);

  const plugins = [
    // Reanimated 4’s plugin is an alias of `react-native-worklets/plugin` — list only one or Babel errors on duplicates.
    "react-native-reanimated/plugin",
  ];

  // Strip console.* from production bundles (keep error/warn for crash triage).
  if (process.env.NODE_ENV === "production" || process.env.BABEL_ENV === "production") {
    plugins.unshift([
      "transform-remove-console",
      { exclude: ["error", "warn"] },
    ]);
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};
