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
<<<<<<< HEAD
=======
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
>>>>>>> 89e66f3 (Comprehensive update for aixtiv-cli infrastructure and dependencies)
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
        // You can specify rules specific to src files here if needed
      }
    }
  ],
  rules: {
<<<<<<< HEAD
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
=======
    // Allow console statements in the CLI application
    'no-console': 'off',

    // Enforce consistent use of single quotes
    quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],

    // Enforce consistent spacing after function name
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],

    // Prefer arrow functions
    'prefer-arrow-callback': 'error',

    // Require consistent return statements in callbacks
    'callback-return': ['error', ['callback', 'cb', 'next', 'done']],

    // Disallow use of eval()
    'no-eval': 'error',

    // Enforce the consistent use of either backticks, double, or single quotes
    quotes: ['error', 'single', { avoidEscape: true }],

    // Disallow use of undefined when initializing variables
    'no-undef-init': 'error',

    // Disallow use of variables before they are defined
    'no-use-before-define': ['error', { functions: false, classes: true }],

    // Allow require statements that don't resolve in imports/exports
    'import/no-unresolved': 'off',

    // Ensure consistent line endings
    'linebreak-style': ['error', 'unix'],

    // Max line length
    'max-len': [
      'error',
      {
        code: 100,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],

    // Prettier integration
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        printWidth: 100,
        tabWidth: 2,
        semi: true,
        arrowParens: 'always',
        trailingComma: 'es5',
      },
    ],
>>>>>>> 89e66f3 (Comprehensive update for aixtiv-cli infrastructure and dependencies)
  },
};
