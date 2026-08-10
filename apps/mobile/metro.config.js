// Configuration Metro par défaut d'Expo. Séparée pour pouvoir y brancher
// Sentry ou des resolvers plus tard sans toucher au reste.
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

module.exports = config
