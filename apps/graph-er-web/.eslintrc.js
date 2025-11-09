module.exports = {
  extends: ['../../packages/eslint-config/index.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    // React-specific rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/prop-types': 'off', // Using TypeScript for prop validation
  },
};
