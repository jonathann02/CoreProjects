# Sample CSV Fixtures

This directory contains sample CSV files for testing and development of the Graph & Entity Resolution Lab.

## Files

### `sample-entities.csv`
A comprehensive dataset with 10 records containing various entity types with intentional duplicates and variations.

**Expected Results:**
- Should create ~7-8 golden records
- Should identify several duplicate clusters
- Tests normalization of names, emails, phones, and addresses

### `small-sample.csv`
A minimal dataset with 3 records, perfect for quick testing.

**Expected Results:**
- Should create 2-3 golden records
- Tests basic duplicate detection

### `complex-sample.csv`
An advanced dataset with edge cases including:
- Name variations (Dr., capitalization, accents)
- Email format variations
- Phone number formats (US, international)
- Address variations
- Organization name variations
- Unicode characters

**Expected Results:**
- Should create ~8-9 golden records
- Tests advanced normalization and matching algorithms
- Demonstrates handling of international data

## CSV Format

All files follow the standard format:

```csv
name,email,phone,address,organizationName
John Doe,john@example.com,+1-555-0123,123 Main St,Tech Corp
```

### Required Columns
- `name` - Full name (required)
- `email` - Email address (required for matching)

### Optional Columns
- `phone` - Phone number
- `address` - Physical address
- `organizationName` - Company/organization name

## Usage

### With the API
```bash
# Upload via the web interface or API
curl -X POST http://localhost:4000/v1/upload/start \
  -H "Content-Type: application/json" \
  -d '{"filename":"sample-entities.csv"}'

# Then upload the file chunks and commit
```

### For Testing
```typescript
import { processETLBatch } from './src/services/etl.js';

const result = await processETLBatch('./fixtures/sample-entities.csv', 'test-batch-id');
console.log('ETL Result:', result);
```

## Data Scenarios Covered

1. **Exact Duplicates**: Same person with identical information
2. **Near Duplicates**: Same person with slight variations
3. **Name Variations**: Different formats, titles, middle names
4. **Email Variations**: Different cases, aliases
5. **Phone Variations**: Different formats, extensions
6. **Address Variations**: Abbreviations, different formats
7. **Organization Variations**: Different legal forms, abbreviations
8. **International Data**: Unicode names, international phone formats

These fixtures ensure comprehensive testing of the entity resolution algorithms.