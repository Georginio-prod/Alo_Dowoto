// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // Matériel de référence vendored (prototype tiers), pas du code applicatif.
    // `backend/**` est un sous-projet Express autonome, linté par sa propre
    // config (voir docs/adr — extraction backend) : le lint Nuxt racine l'ignore.
    name: 'worktogo/ignores',
    ignores: ['docs/design-reference/**', 'backend/**']
  },
  {
    name: 'worktogo/custom-rules',
    rules: {
      // ---- Taille des fichiers ----
      // Aucun fichier ne doit dépasser 300 lignes (hors lignes vides et commentaires).
      // Un fichier qui grossit trop doit être découpé en composants/composables.
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

      // ---- Qualité générale ----
      // `== null` / `!= null` est un idiome volontaire (couvre null ET undefined) ;
      // l'exiger strict casserait ce comportement. On garde `===` partout ailleurs.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',

      // ---- Vue ----
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off'
    }
  }
)
