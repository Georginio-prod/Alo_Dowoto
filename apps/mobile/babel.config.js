module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Doit rester en dernier (exigence react-native-reanimated / worklets).
      'react-native-worklets/plugin',
    ],
  }
}
