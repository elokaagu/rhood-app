module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4’s plugin is an alias of `react-native-worklets/plugin` — list only one or Babel errors on duplicates.
    plugins: ["react-native-reanimated/plugin"],
  };
};
