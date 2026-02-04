# Homebridge Somfy Protect Automate

[![npm version](https://badge.fury.io/js/%40jay-d-tyler%2Fhomebridge-somfy-protect-automate.svg)](https://badge.fury.io/js/%40jay-d-tyler%2Fhomebridge-somfy-protect-automate)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

A Homebridge plugin that provides a stateless switch to disarm Somfy Protect alarms via HomeKit automations.

## Why This Plugin?

HomeKit has a built-in security restriction that prevents automations from directly disarming security alarms. This is a safety feature to prevent unauthorized access. However, other accessories (like switches) can still control the alarm programmatically.

This plugin creates a workaround by providing a **stateless switch** that, when activated, automatically disarms your Somfy Protect alarm. You can then use this switch in HomeKit automations, effectively giving you the ability to automate alarm disarming.

## Features

- 🔘 **Stateless Switch**: Acts like a button that automatically resets after use
- 🌐 **HTTP API Communication**: Uses REST API for reliable cross-plugin communication
- 🔒 **One-Way Operation**: Only disarms (prevents accidental arming via automation)
- ⚡ **Instant Response**: Triggers immediately when activated
- 🎯 **Simple Setup**: Minimal configuration required
- 🔐 **Optional Security**: Supports token-based authentication

## Prerequisites

This plugin requires the main Somfy Protect plugin (v2.2.0+) to be installed and configured with HTTP API enabled:

- [@jay-d-tyler/homebridge-somfy-protect](https://github.com/jay-d-tyler/homebridge-somfy-protect)

### Enable HTTP API in Somfy Protect Plugin:

1. Go to Somfy Protect plugin settings
2. Set `httpPort` to `8582` (recommended, as 8581 is used by Homebridge Config UI)
3. Optionally set `httpToken` for authentication
4. Restart Homebridge

Make sure your Somfy Protect alarm is working in HomeKit before installing this automation helper.

## Installation

### Option 1: Homebridge Config UI X (Recommended)

1. Search for `@jay-d-tyler/homebridge-somfy-protect-automate` in the Homebridge Config UI X plugin search
2. Click **Install**
3. Configure the plugin (see Configuration section below)
4. Restart Homebridge

### Option 2: Manual Installation

```bash
npm install -g @jay-d-tyler/homebridge-somfy-protect-automate
```

Then add the platform to your `config.json` (see Configuration section below).

## Configuration

Add this platform to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "SomfyProtectAutomate",
      "name": "Somfy Protect Automate",
      "httpPort": 8582,
      "httpToken": "optional-secret-token"
    }
  ]
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `platform` | string | Yes | `SomfyProtectAutomate` | Must be `SomfyProtectAutomate` |
| `name` | string | No | `Somfy Protect Automate` | The name that appears in Homebridge logs |
| `httpPort` | number | No | `8582` | Port the Somfy Protect HTTP API is listening on (Note: 8581 is used by Homebridge Config UI) |
| `httpToken` | string | No | - | Optional authentication token (must match Somfy Protect plugin) |

## Usage

### Setting Up HomeKit Automations

1. **Add the Switch to HomeKit**
   - After restarting Homebridge, the switch will appear in your Home app
   - It will be named according to your `buttonLabel` configuration

2. **Create an Automation**
   - Open the Home app
   - Go to the Automation tab
   - Create a new automation (e.g., "When I arrive home")
   - Add action: Turn on the "Disarm Somfy" switch
   - The alarm will disarm automatically when the automation runs

3. **Example Automations**
   - **Arrive Home**: Disarm when you arrive home
   - **Wake Up**: Disarm at a specific time in the morning
   - **Scene-Based**: Disarm when you activate a "Good Morning" scene
   - **Geofencing**: Disarm when family members arrive

### How It Works

```
HomeKit Automation → Turns on Switch → Plugin Detects Switch On →
Plugin Finds Somfy Alarm → Plugin Sends Disarm Command →
Switch Resets to Off (stateless)
```

The switch automatically resets to the "off" state after 1 second, making it act like a momentary button rather than a persistent switch.

## Troubleshooting

### The switch doesn't disarm the alarm

1. **Check that Somfy Protect is working**:
   - Open the Home app
   - Try manually disarming the alarm using the main Somfy Protect accessory
   - If this doesn't work, the issue is with the main Somfy plugin

2. **Check Homebridge logs**:
   ```bash
   tail -f ~/.homebridge/homebridge.log
   ```
   Look for messages starting with `[Somfy Protect Automate]`

3. **Verify the alarm is detected**:
   - Look for log message: `Found Somfy Protect security system: [name]`
   - If you don't see this, the plugin cannot find your alarm

### The switch doesn't appear in HomeKit

1. Remove the accessory from HomeKit and re-add it
2. Restart Homebridge
3. Check that the platform is correctly configured in `config.json`

### The alarm name doesn't contain "Somfy" or "Protect"

The plugin looks for accessories with these keywords. If your alarm has a different name, you may need to modify the detection logic. Open a GitHub issue with your alarm's name.

## Advanced Usage

### Multiple Alarms

Currently, the plugin will disarm the **first** Somfy Protect alarm it finds. If you have multiple alarms and need to control them separately, you'll need to:

1. Create multiple instances of this plugin with different names
2. Modify the code to target specific alarms (custom development)

Open a GitHub issue if you need this feature!

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/jay-d-tyler/homebridge-somfy-protect-automate.git
cd homebridge-somfy-protect-automate

# Install dependencies
npm install

# Build
npm run build

# Link for local development
npm link
```

### Project Structure

```
homebridge-somfy-protect-automate/
├── src/
│   └── index.ts          # Main plugin code
├── config.schema.json    # Homebridge UI configuration schema
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Related Projects

- [@jay-d-tyler/homebridge-somfy-protect](https://github.com/jay-d-tyler/homebridge-somfy-protect) - The main Somfy Protect plugin

## Author

**Jay Tyler**

## Acknowledgments

- Thanks to the Homebridge community for the excellent platform
- Thanks to Somfy for their API documentation

## Changelog

### 1.0.0
- Initial release
- Stateless switch for disarming Somfy Protect alarms
- Auto-detection of Somfy accessories
- Basic configuration options

---

**Note**: This plugin is not officially associated with Somfy. It is an independent project created to enhance HomeKit automation capabilities.
