# Agent guide

Read `README.md`, `package.json`, and the relevant source and tests before editing.
Inspect Git state and preserve unrelated changes. Keep public documentation
technical; never include credentials or private deployment details.

`src/index.ts` owns the three stateless switches, command coalescing, and the
HTTP client. Preserve the Disarm/Away/Night endpoint mapping, required bearer
token, timeout handling, and fixed IPv4 loopback destination.

For code changes, install with `npm ci` and run `npm run check`.
Use the mocked tests under `test/`; do not validate by controlling real devices.
For documentation-only changes, verify paths and commands against source and
run `git diff --check`. Do not infer runtime success from documentation checks.

`npm run watch` links the package and starts a development runtime. Do not run
it, `npm link`, device requests, service changes, or publishing/release commands
without explicit authorisation for that operation. Keep changes local unless
commit or push is requested.
