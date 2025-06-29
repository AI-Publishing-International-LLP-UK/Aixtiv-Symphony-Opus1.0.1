module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb-base',
    'plugin:prettier/recommended'
  ]
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
  ],
  overrides: [
    {
      files: ['src/**/*.ts'],
      rules: {
        // TypeScript-specific rules
        '@typescript-eslint/explicit-module-boundary-types': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
      }
    }
  ],
  rules: {
    // Allow console statements in the CLI application
    'no-console': 'off',

    // TypeScript rules
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Code style rules
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    'prefer-arrow-callback': 'error',
    'callback-return': ['error', ['callback', 'cb', 'next', 'done']],
    'no-eval': 'error',
    'no-undef-init': 'error',
    'no-use-before-define': ['error', { functions: false, classes: true }],
    'import/no-unresolved': 'off',
    'linebreak-style': ['error', 'unix'],
    'max-len': ['error', {
      code: 100,
      ignoreComments: true,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],

    // Prettier integration
    'prettier/prettier': ['error', {
      singleQuote: true,
      printWidth: 100,
      tabWidth: 2,
      semi: true,
      arrowParens: 'always',
      trailingComma: 'es5'
    }]
  },
};
