# Test Directory

This directory contains all test files for the Recipe App, organized by functionality.

## Directory Structure

```
__tests__/
├── setup.ts              # Jest test setup and configuration
├── database/             # Database-related tests
│   ├── database-integration.test.ts    # Comprehensive integration tests
│   ├── database-factory.test.ts        # Database factory tests
│   └── watermelon-imports.test.ts      # WatermelonDB import verification
└── storage/              # Storage-related tests
    ├── mmkv-storage.test.ts            # MMKV storage implementation tests
    ├── storage-facade.test.ts          # Storage facade tests
    ├── storage-factory.test.ts         # Storage factory tests
    ├── storage-integration.test.ts     # Storage integration tests
    └── storage-types.test.ts           # Storage type definitions tests
```

## Test Categories

### Database Tests (`database/`)
- **Integration Tests**: Comprehensive tests for the WatermelonDB facade system
- **Factory Tests**: Database creation and management tests
- **Import Tests**: Verification that WatermelonDB imports work correctly

### Storage Tests (`storage/`)
- **MMKV Tests**: Key-value storage implementation tests
- **Facade Tests**: Storage abstraction layer tests
- **Factory Tests**: Storage instance creation tests
- **Integration Tests**: End-to-end storage functionality tests
- **Type Tests**: Storage type system validation

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test __tests__/database/
npm test __tests__/storage/

# Run specific test files
npm test __tests__/database/database-integration.test.ts
npm test __tests__/storage/storage-facade.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Utilities

- `setup.ts`: Contains shared test configuration, mocks, and utilities
- Individual test files use Jest and follow the naming convention `*.test.ts`

## Examples

For usage examples and documentation, see the `/examples` directory in the project root.
