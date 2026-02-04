# Quick Start Guide

## What You Have

This is a complete Homebridge plugin called `@jay-d-tyler/homebridge-somfy-protect-automate` that creates a stateless switch to disarm your Somfy Protect alarm via HomeKit automations.

## Project Structure

```
homebridge-somfy-protect-automate/
├── .github/
│   └── workflows/
│       ├── build.yml         # CI/CD build workflow
│       └── test.yml          # CI/CD test workflow
├── src/
│   └── index.ts              # Main plugin code
├── test/
│   ├── hbConfig/
│   │   └── config.json       # Test Homebridge config
│   └── platform.test.ts      # Unit tests
├── config.schema.json        # Homebridge UI configuration
├── eslint.config.js          # ESLint configuration
├── jest.config.js            # Jest test configuration
├── nodemon.json              # Nodemon dev server config
├── package.json              # NPM package configuration
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
├── .npmignore                # NPM publish ignore rules
├── LICENSE                   # Apache 2.0 license
└── README.md                 # Full documentation
```

## Next Steps

### 1. Initialize Git Repository (Optional)

```bash
cd homebridge-somfy-protect-automate
git init
git add .
git commit -m "Initial commit: Homebridge Somfy Protect Automate plugin"
```

### 2. Set Up GitHub Repository

1. Go to https://github.com/jay-d-tyler
2. Create a new repository called `homebridge-somfy-protect-automate`
3. Don't initialize it with README (we already have one)
4. Run these commands:

```bash
git remote add origin https://github.com/jay-d-tyler/homebridge-somfy-protect-automate.git
git branch -M main
git push -u origin main
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Build the Plugin

```bash
npm run build
```

This will compile the TypeScript code to JavaScript in the `dist/` folder.

### 5. Run Tests and Linting

Run the linter to check code quality:

```bash
npm run lint
```

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run tests in watch mode (auto-rerun on changes):

```bash
npm run test:watch
```

### 6. Test Locally with Homebridge

Link the plugin for local testing:

```bash
npm link
```

Then add the plugin configuration to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "SomfyProtectAutomate",
      "name": "Somfy Protect Automate",
      "buttonLabel": "Disarm Somfy"
    }
  ]
}
```

Restart Homebridge and check the logs.

### 7. Publish to NPM (When Ready)

1. Make sure you're logged into NPM:
   ```bash
   npm login
   ```

2. Publish the package:
   ```bash
   npm publish --access public
   ```

   (The `--access public` flag is required for scoped packages like `@jay-d-tyler/...`)

3. Verify on NPM:
   - Visit https://www.npmjs.com/package/@jay-d-tyler/homebridge-somfy-protect-automate

### 8. Update Homebridge Plugin List

After publishing, submit your plugin to the Homebridge plugin registry:
- https://github.com/homebridge/homebridge/wiki/Verified-Plugins

## How It Works

1. **Stateless Switch**: The plugin creates a switch that automatically turns off after being turned on
2. **Auto-Detection**: It searches for any accessory with "somfy" or "protect" in the name
3. **Disarm Command**: When activated, it finds the SecuritySystem service and sets it to DISARM (state 3)
4. **Reset**: The switch resets to OFF after 1 second

## Key Features

- ✅ Works around HomeKit's automation restriction on security systems
- ✅ No configuration needed beyond plugin installation
- ✅ Automatically finds your Somfy Protect alarm
- ✅ Stateless behavior prevents accidental arming
- ✅ Simple and reliable

## Configuration Options

In Homebridge Config UI X or `config.json`:

- **name**: The name in Homebridge logs (default: "Somfy Protect Automate")
- **buttonLabel**: The name shown in HomeKit (default: "Disarm Somfy")

## Troubleshooting

### Plugin not finding alarm

Check that:
1. Your Somfy Protect plugin is installed and working
2. The alarm accessory name contains "somfy" or "protect"
3. Look at Homebridge logs for detection messages

### Switch doesn't appear in HomeKit

1. Remove the bridge from HomeKit and re-add it
2. Check config.json for typos
3. Restart Homebridge

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (auto-rebuild on changes and run Homebridge)
npm run watch

# Lint code
npm run lint

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Verify build artifacts
npm run verify-build

# Link for local testing
npm link

# Unlink after testing
npm unlink -g @jay-d-tyler/homebridge-somfy-protect-automate
```

## Support

If you encounter issues:
1. Check Homebridge logs
2. Open an issue on GitHub
3. Include log output and your configuration

---

**Ready to publish?** Run `npm publish --access public` when you're satisfied with the plugin!
