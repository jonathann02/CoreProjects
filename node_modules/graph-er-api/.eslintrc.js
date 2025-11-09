module.exports = {
  extends: ['../../packages/eslint-config/index.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    node: true,
    es2022: true,
  },
};
