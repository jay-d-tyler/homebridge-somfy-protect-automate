# Quick Start

## 1. Configure the companion plugin

Install `@jay-d-tyler/homebridge-somfy-protect` version 2.3.0 or later. Its HTTP
API provides:

- `POST /disarm`
- `POST /arm/away`
- `POST /arm/night`

Successful calls must return a 2xx JSON response containing `{"success": true}`.

Configure a free port and a strong token in that plugin, and keep its `httpHost`
on the default `127.0.0.1`. Port 8582 is the recommended default; 8581 is
normally occupied by Homebridge Config UI.

## 2. Install this plugin

Use Homebridge Config UI, or:

```bash
npm install -g @jay-d-tyler/homebridge-somfy-protect-automate
```

## 3. Use matching configuration

```json
{
  "platform": "SomfyProtectAutomate",
  "name": "Somfy Protect Automate",
  "httpPort": 8582,
  "httpToken": "use-the-same-long-random-token"
}
```

Restart Homebridge. Three switches will appear:

- Disarm Somfy Protect
- Arm Somfy Protect for Away
- Arm Somfy Protect for Night

Use the switches in HomeKit scenes or automations. Each switch resets to off
after its API request finishes.

## Development

```bash
npm ci
npm run check
npm run watch
```

If Away or Night returns 404, upgrade the companion plugin to version 2.3.0 or
later.
