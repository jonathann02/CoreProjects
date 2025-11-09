# @fintech/tsconfig

Shared TypeScript configuration for FinTech platform.

## Installation

```bash
npm install --save-dev @fintech/tsconfig
```

## Usage

### Node.js Applications (Gateway)

Create `tsconfig.json` in your project root:

```json
{
  "extends": "@fintech/tsconfig/tsconfig.node.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Testing

For test files, create `tsconfig.test.json`:

```json
{
  "extends": "@fintech/tsconfig/tsconfig.test.json",
  "include": ["**/*.test.ts", "**/*.spec.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## Configurations

### Base Configuration (`tsconfig.json`)
- **Target**: ES2022
- **Module**: CommonJS
- **Strict Mode**: Enabled (all strict checks)
- **Path Mapping**: Configured for clean imports
- **Source Maps**: Enabled
- **Declarations**: Generated

### Node.js Configuration (`tsconfig.node.json`)
- Extends base config
- Optimized for Node.js runtime
- Includes Node.js types

### Test Configuration (`tsconfig.test.json`)
- Extends base config
- Includes Jest and testing types
- Relaxed unused variable checks

## Path Mapping

The configuration includes path mapping for clean imports:

```typescript
import { User } from '@/types/user';
import { apiClient } from '@/services/api';
import { validateEmail } from '@/utils/validation';
```

## Strict Settings

All configurations enable:
- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `exactOptionalPropertyTypes: true`
- `noPropertyAccessFromIndexSignature: false`

## Build Output

- Compiled JavaScript goes to `dist/` directory
- Source maps and type declarations are generated
- Build info is cached for incremental builds
