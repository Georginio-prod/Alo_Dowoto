// ESLint plat (flat config) basé sur la config Expo + Prettier.
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const prettier = require('eslint-config-prettier')

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'babel.config.js', 'metro.config.js'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
])
