module.exports = {
  extends: ['../../packages/eslint-config/index.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
