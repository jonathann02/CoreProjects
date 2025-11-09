module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: process.cwd(),
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'node',
    'security',
    'sonarjs'
  ],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:node/recommended',
    'plugin:security/recommended',
    'plugin:sonarjs/recommended'
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/require-await': 'error',

    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true }
      }
    ],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-unused-modules': 'warn',

    // Node.js rules
    'node/no-missing-import': 'off', // Handled by TypeScript
    'node/no-unsupported-features/es-syntax': 'off', // Allow modern syntax
    'node/shebang': 'off', // Not needed for modules

    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',

    // SonarJS rules (code quality)
    'sonarjs/no-duplicate-string': 'warn',
    'sonarjs/cognitive-complexity': ['warn', 15],
    'sonarjs/no-identical-functions': 'warn',

    // General rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-labels': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'no-void': 'error',
    'prefer-promise-reject-errors': 'error',
    'require-await': 'off', // Use @typescript-eslint/require-await instead

    // Disable rules that conflict with TypeScript
    'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars
    'no-array-constructor': 'off', // Use @typescript-eslint/no-array-constructor
    'no-empty-function': 'off', // Use @typescript-eslint/no-empty-function
    'no-extra-semi': 'off', // Use @typescript-eslint/no-extra-semi
    'no-loss-of-precision': 'off', // Use @typescript-eslint/no-loss-of-precision
    'no-useless-constructor': 'off', // Use @typescript-eslint/no-useless-constructor
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
      node: {
        extensions: ['.js', '.ts', '.tsx'],
      },
    },
  },
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    '*.js',
    '*.d.ts',
    'coverage/',
    '.nyc_output/',
  ],
};
