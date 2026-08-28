// @ts-check
// Config ESLint propre au sous-projet backend (Express + TypeScript, sans Nuxt/Vue).
//
// Le lint racine (eslint.config.mjs) ignore `backend/**` : ce paquet est un
// sous-projet autonome (ADR-0014) avec sa propre cible (Node, CommonJS) et son
// propre jeu de règles. Les paquets @typescript-eslint / @eslint/js / globals
// sont résolus depuis le node_modules hoisté de la racine (apportés par
// @nuxt/eslint), donc aucune dépendance supplémentaire à installer ici.
import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import globals from 'globals'

export default [
  {
    name: 'backend/ignores',
    ignores: ['dist/**', 'node_modules/**', 'prisma/migrations/**']
  },
  js.configs.recommended,
  {
    name: 'backend/typescript',
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
      },
      globals: {
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      // ---- Taille des fichiers ----
      // Même règle que la racine : 300 lignes max (hors vides/commentaires).
      'max-lines': [
        'error',
        { max: 300, skipBlankLines: true, skipComments: true }
      ],

      // ---- TypeScript ----
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      // `no-undef` est inutile et bruyant en TypeScript (le typage couvre ça).
      'no-undef': 'off',

      // ---- Qualité générale ----
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error'
    }
  },
  {
    name: 'backend/tests',
    files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      // Les tests peuvent dépasser 300 lignes (jeux de cas exhaustifs).
      'max-lines': 'off',
      // `row!.id` après un `expect(row).not.toBeNull()` est un idiome de test légitime.
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  }
]
