module.exports = {
  extends: ['@fintech/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: process.cwd(),
  },
  rules: {
    // Node.js specific rules
    'node/no-missing-import': 'off', // TypeScript handles this
    'node/no-unsupported-features/es-syntax': 'off',

    // Allow console in gateway for debugging
    'no-console': 'warn',

    // Relax some rules for API gateway
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  env: {
    node: true,
    jest: true,
  },
};
