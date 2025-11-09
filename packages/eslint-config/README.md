# @fintech/eslint-config

Shared ESLint configuration for FinTech platform TypeScript/Node.js projects.

## Installation

```bash
npm install --save-dev @fintech/eslint-config eslint
```

## Usage

Create `.eslintrc.js` in your project root:

```javascript
module.exports = {
  extends: ['@fintech/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: process.cwd(),
  },
};
```

## Included Plugins

- **@typescript-eslint**: TypeScript-specific linting rules
- **import**: Import/export validation and ordering
- **node**: Node.js best practices
- **security**: Security vulnerability detection
- **sonarjs**: Code quality and maintainability

## Key Rules

### TypeScript
- Strict type checking
- No `any` types
- Explicit return types (warning)
- Proper async/await usage

### Imports
- Organized import groups
- Alphabetized imports
- No circular dependencies
- No unused modules

### Security
- Object injection detection
- Unsafe regex detection
- Non-literal regex warnings

### Code Quality
- Cognitive complexity limits (15)
- No duplicate strings (warning)
- No identical functions

## Environment

Configured for:
- Node.js runtime
- ES2022 features
- TypeScript projects

## Integration

Works seamlessly with:
- VS Code ESLint extension
- Pre-commit hooks
- CI/CD pipelines

## Customization

Extend the configuration for project-specific needs:

```javascript
module.exports = {
  extends: ['@fintech/eslint-config'],
  rules: {
    // Override rules as needed
    'no-console': 'off', // Allow console in specific cases
  },
};
```
