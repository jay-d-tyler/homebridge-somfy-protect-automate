# Testing and CI

## Local quality gate

Run the same release gate used by `prepublishOnly`:

```bash
npm ci
npm run check
```

The check performs:

1. ESLint with zero warnings;
2. a clean TypeScript build;
3. Jest behavioural tests with coverage;
4. verification that `dist/index.js` exists.

Coverage must remain at or above 80% for branches, functions, lines, and
statements. The production source is included in coverage collection.

## What the tests cover

`test/platform.test.ts` executes the real plugin classes and verifies:

- Homebridge platform registration;
- creation and restoration of all three switches;
- removal of obsolete cached accessories;
- endpoint and bearer-token selection for Disarm, Away, and Night;
- stateless reset behaviour;
- duplicate-trigger coalescing;
- HTTP error propagation;
- invalid-port rejection;
- request timeout handling.

## Useful commands

```bash
npm test
npm run test:coverage
npm run lint
npm run build
npm run verify-build
npm run watch
```

## CI policy

GitHub Actions uses `npm ci` so CI executes the committed lockfile exactly.
Coverage failures are release failures. CI may report or fail on dependency
advisories, but it must never run `npm audit fix`: a verification job should not
silently rewrite the dependency graph it is meant to verify.
