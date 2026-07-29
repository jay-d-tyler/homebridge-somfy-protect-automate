# Homebridge Somfy Protect Automate

[![npm version](https://badge.fury.io/js/%40jay-d-tyler%2Fhomebridge-somfy-protect-automate.svg)](https://badge.fury.io/js/%40jay-d-tyler%2Fhomebridge-somfy-protect-automate)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

A Homebridge plugin that exposes three stateless HomeKit switches for Somfy Protect alarm automations:

- **Disarm Somfy Protect**
- **Arm Somfy Protect for Away**
- **Arm Somfy Protect for Night**

The switches call the local HTTP API provided by
[`@jay-d-tyler/homebridge-somfy-protect`](https://github.com/jay-d-tyler/homebridge-somfy-protect).
They reset to off one second after each request.

## Why this exists

HomeKit does not allow every security-system state change to be used directly in
automations. Stateless switches provide an automation-friendly trigger while the
Somfy Protect plugin remains responsible for authentication, site discovery, and
alarm control.

## Required companion API

Install `@jay-d-tyler/homebridge-somfy-protect` version 2.3.0 or later. Its
HTTP API exposes these endpoints:

| Switch | HTTP request | Somfy state |
| --- | --- | --- |
| Disarm Somfy Protect | `POST /disarm` | `disarmed` |
| Arm Somfy Protect for Away | `POST /arm/away` | `armed` |
| Arm Somfy Protect for Night | `POST /arm/night` | `partial` |

Each successful endpoint must return a 2xx JSON response containing
`{"success": true}`.

Older companion-plugin releases expose only `POST /disarm`. The Disarm switch
will continue to work with them, but the Away and Night switches require version
2.3.0 or later.

Both plugins may run on child bridges because they communicate over the local
HTTP API rather than trying to inspect each other's accessory cache.

## Installation

Install through Homebridge Config UI, or manually:

```bash
npm install -g @jay-d-tyler/homebridge-somfy-protect-automate
```

## Configuration

Enable the HTTP API in the companion Somfy Protect plugin, then configure this
plugin with the same port and token:

```json
{
  "platforms": [
    {
      "platform": "SomfyProtectAutomate",
      "name": "Somfy Protect Automate",
      "httpPort": 8582,
      "httpToken": "use-a-long-random-token"
    }
  ]
}
```

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `platform` | string | Yes | — | Must be `SomfyProtectAutomate` |
| `name` | string | No | `Somfy Protect Automate` | Platform name shown in Homebridge |
| `httpPort` | integer | No | `8582` | Companion HTTP API port, from 1 to 65535 |
| `httpToken` | string | Yes | — | Bearer token configured in both plugins |

Port 8581 is normally used by Homebridge Config UI. Use 8582 or another free
port.

### Security

`httpToken` is required in both plugins. Any client able to reach an
unauthenticated alarm-control port could otherwise change the alarm state. The
token is sent only to the IPv4 loopback address `127.0.0.1`. Keep the companion
server on its default `127.0.0.1` bind address; LAN exposure is unnecessary for
this integration.

## HomeKit automations

After restarting Homebridge, add any of the three switches to a scene or
automation. Turning a switch on sends its command immediately. The switch:

1. remains on while the companion API request is in flight;
2. reports an error if the API rejects, times out, or returns a non-success
   status;
3. resets to off one second after the request finishes.

Repeated triggers while the same command is already in flight are coalesced so a
single tap cannot send duplicate alarm commands.

## Troubleshooting

### Away or Night returns 404

Upgrade `@jay-d-tyler/homebridge-somfy-protect` to version 2.3.0 or later.

### A command returns 401

The `httpToken` values do not match. Update both plugin configurations and
restart their bridges.

### A command times out or refuses the connection

Confirm that:

- the companion Somfy Protect plugin is running;
- its HTTP API is enabled;
- both plugins use the same `httpPort`;
- the selected port is not already used by Homebridge Config UI or another
  process.

### A switch does not appear

Restart Homebridge and inspect the logs for
`Somfy Protect Automate`. The platform maintains exactly the three switches
listed above and removes obsolete cached switches from older releases.

## Development

```bash
npm ci
npm run check
```

`npm run check` runs linting, a clean TypeScript build, behavioural tests with
coverage thresholds, and build-artifact verification.

For local Homebridge development:

```bash
npm run watch
```

## License

Apache License 2.0. This project is independent and is not associated with
Somfy.
