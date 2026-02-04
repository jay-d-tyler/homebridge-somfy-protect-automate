# Testing & CI/CD Infrastructure

This plugin now includes a complete testing and continuous integration setup, matching the structure of `@jay-d-tyler/homebridge-somfy-protect`.

## What's Included

### 1. Testing with Jest

**Configuration:** `jest.config.js`

The plugin uses Jest for unit testing with TypeScript support via ts-jest.

**Coverage Thresholds:**
- Branches: 60%
- Functions: 70%
- Lines: 70%
- Statements: 70%

**Commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

**Test Files:**
- Located in `test/` directory
- Follow pattern `*.test.ts`
- Example: `test/platform.test.ts`

### 2. Code Quality with ESLint

**Configuration:** `eslint.config.js`

Modern ESLint 9.x configuration with TypeScript support.

**Rules:**
- Single quotes
- 2-space indentation
- Unix line breaks
- Required semicolons
- Trailing commas in multiline
- Max line length: 160
- And more...

**Commands:**
```bash
npm run lint          # Check code quality
```

### 3. Development Server with Nodemon

**Configuration:** `nodemon.json`

Auto-recompiles and restarts Homebridge when source files change.

**Test Configuration:**
- Located in `test/hbConfig/config.json`
- Provides a test Homebridge environment

**Commands:**
```bash
npm run watch         # Start dev server
```

**What it does:**
1. Watches `src/` directory for changes
2. Recompiles TypeScript
3. Restarts Homebridge with test config
4. Shows warnings with trace

### 4. GitHub Actions CI/CD

**Workflows:**

#### `build.yml` - Build and Lint
Runs on every push and pull request.

**Jobs:**
- Builds on Node.js 20.x, 22.x, and 24.x
- Runs linter
- Builds the project
- Checks for outdated dependencies
- Runs audit

#### `test.yml` - Test & Build
Runs on pushes/PRs to main, master, and develop branches.

**Jobs:**

**Lint and Test:**
- Runs on Node.js 20.x and 22.x
- Lints code
- Builds project
- Runs tests
- Generates coverage report
- Uploads to Codecov (optional)

**Build Check:**
- Verifies build artifacts exist
- Checks that `dist/index.js` exists
- Ensures no TypeScript files leaked into `dist/`

### 5. NPM Publishing Configuration

**File:** `.npmignore`

Excludes development files from NPM package:
- Source code (`src/`)
- Test files (`test/`)
- Configuration files
- GitHub workflows
- Coverage reports
- Development tools

**Published Files (defined in package.json):**
- `dist/` - Compiled JavaScript
- `config.schema.json` - Homebridge UI config
- `LICENSE` - Apache 2.0 license
- `README.md` - Documentation

## Pre-Publish Checklist

Before running `npm publish`, the following automatically runs:

```bash
npm run prepublishOnly
```

This executes:
1. `npm run lint` - Code quality check
2. `npm run build` - Compile TypeScript
3. `npm run verify-build` - Verify dist/ exists

If any step fails, publishing is aborted.

## Writing Tests

### Test Structure

```typescript
import type { API, PlatformConfig, Logging } from 'homebridge';

describe('Feature Name', () => {
  let mockLogger: jest.Mocked<Logging>;
  let mockApi: jest.Mocked<API>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mocks
  });

  it('should do something', () => {
    // Test implementation
    expect(something).toBe(expected);
  });
});
```

### Running Specific Tests

```bash
# Run specific test file
npm test -- platform.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Platform"

# Run with coverage for specific files
npm test -- --coverage --collectCoverageFrom="src/index.ts"
```

### Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run in watch mode (useful during development)
npm run test:watch
```

## CI/CD Badge Setup

Add these badges to your README.md:

```markdown
[![Build Status](https://github.com/jay-d-tyler/homebridge-somfy-protect-automate/workflows/Build%20and%20Lint/badge.svg)](https://github.com/jay-d-tyler/homebridge-somfy-protect-automate/actions)
[![Test Status](https://github.com/jay-d-tyler/homebridge-somfy-protect-automate/workflows/Test%20%26%20Build/badge.svg)](https://github.com/jay-d-tyler/homebridge-somfy-protect-automate/actions)
[![codecov](https://codecov.io/gh/jay-d-tyler/homebridge-somfy-protect-automate/branch/main/graph/badge.svg)](https://codecov.io/gh/jay-d-tyler/homebridge-somfy-protect-automate)
```

## Codecov Integration (Optional)

To enable code coverage tracking:

1. Go to https://codecov.io
2. Sign in with GitHub
3. Add the repository
4. No additional configuration needed - the workflow already uploads coverage

## Local Development Workflow

### Recommended Flow:

1. **Start development:**
   ```bash
   npm run watch
   ```
   This starts Homebridge with your plugin in development mode.

2. **In another terminal, run tests in watch mode:**
   ```bash
   npm run test:watch
   ```
   Tests automatically re-run when you change code.

3. **Make your changes** to `src/index.ts`

4. **Both terminals update automatically:**
   - Tests re-run
   - Homebridge restarts

5. **Before committing:**
   ```bash
   npm run lint          # Check code quality
   npm run test:coverage # Verify test coverage
   ```

6. **Commit and push:**
   GitHub Actions will automatically run all checks.

## Troubleshooting

### Tests fail locally but pass in CI

**Possible causes:**
- Node version mismatch
- Cached dependencies

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### ESLint errors

**Auto-fix many issues:**
```bash
npm run lint -- --fix
```

### Build artifacts not found

```bash
npm run build
npm run verify-build
```

### Nodemon not restarting

Check that:
1. You're in the project directory
2. Homebridge is installed globally or as dev dependency
3. Test config exists at `test/hbConfig/config.json`

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [ESLint Documentation](https://eslint.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Homebridge Plugin Development](https://developers.homebridge.io/)

---

**Summary:** This plugin now has enterprise-grade testing and CI/CD infrastructure, ensuring code quality and reliability before every release!
