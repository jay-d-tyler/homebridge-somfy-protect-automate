import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  CharacteristicValue,
} from 'homebridge';

const PLUGIN_NAME = '@jay-d-tyler/homebridge-somfy-protect-automate';
const PLATFORM_NAME = 'SomfyProtectAutomate';

interface SomfyProtectAutomatePlatformConfig extends PlatformConfig {
  name?: string;
  httpPort?: number;
  httpToken?: string;
}

export default (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, SomfyProtectAutomatePlatform);
};

class SomfyProtectAutomatePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: SomfyProtectAutomatePlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;
    this.log.info('=== Somfy Protect Automate v2.0.5 Initializing ===');
    this.log.info('Platform name:', this.config.name);
    this.log.info('HTTP API port:', this.config.httpPort || 8582);
    if (this.config.httpToken) {
      this.log.info('HTTP API authentication: enabled');
    }

    this.api.on('didFinishLaunching', () => {
      this.log.info('Homebridge finished launching, discovering devices...');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName, 'UUID:', accessory.UUID);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    this.log.info('Starting device discovery...');
    this.log.info(`Total cached accessories: ${this.accessories.length}`);
    this.accessories.forEach(acc => {
      this.log.info(`  - Cached: "${acc.displayName}" (UUID: ${acc.UUID})`);
    });

    const buttonLabel = 'Disarm Somfy Protect';
    const uuid = this.api.hap.uuid.generate(buttonLabel);
    this.log.info(`Generated UUID for "${buttonLabel}": ${uuid}`);

    // Clean up old accessories with different names
    const oldAccessoriesToRemove = this.accessories.filter(acc => acc.UUID !== uuid);
    if (oldAccessoriesToRemove.length > 0) {
      this.log.info(`Removing ${oldAccessoriesToRemove.length} old cached accessory(ies)...`);
      oldAccessoriesToRemove.forEach(acc => {
        this.log.info(`  - Removing: "${acc.displayName}" (UUID: ${acc.UUID})`);
        // Remove from our local array
        const index = this.accessories.indexOf(acc);
        if (index > -1) {
          this.accessories.splice(index, 1);
        }
      });
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, oldAccessoriesToRemove);
      this.log.info('✓ Old accessories removed');
    } else {
      this.log.info('No old accessories to remove');
    }

    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      new SomfyDisarmSwitch(this, existingAccessory);
    } else {
      this.log.info('Adding new accessory:', buttonLabel);
      const accessory = new this.api.platformAccessory(buttonLabel, uuid);
      new SomfyDisarmSwitch(this, accessory);
      this.log.info('Registering accessory with Homebridge...');
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.log.info('✓ Accessory registered successfully');
    }
  }
}

class SomfyDisarmSwitch {
  private service: Service;
  private switchState = false;

  constructor(
    private readonly platform: SomfyProtectAutomatePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.platform.log.info(`Initializing switch: "${accessory.displayName}"`);

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Jay Tyler')
      .setCharacteristic(this.platform.Characteristic.Model, 'Somfy Disarm Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'SDS-001');

    // Get or create the switch service
    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.displayName,
    );

    this.platform.log.info('Registering characteristic handlers...');

    // Register handlers for the On characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.platform.log.info('✓ Switch initialized and ready');
  }

  async setOn(value: CharacteristicValue) {
    const isOn = value as boolean;
    this.platform.log.info('Switch triggered:', isOn ? 'ON' : 'OFF');

    if (isOn) {
      // When switch is turned on, disarm the alarm
      this.platform.log.info('Activating disarm sequence...');
      await this.disarmSomfyAlarm();

      // Reset the switch to off after a short delay (stateless behavior)
      setTimeout(() => {
        this.switchState = false;
        this.service.updateCharacteristic(this.platform.Characteristic.On, false);
        this.platform.log.info('Switch reset to OFF (stateless)');
      }, 1000);
    }

    this.switchState = isOn;
  }

  getOn(): boolean {
    return this.switchState;
  }

  async disarmSomfyAlarm() {
    try {
      const port = this.platform.config.httpPort || 8582;
      const token = this.platform.config.httpToken;
      const url = `http://localhost:${port}/disarm`;

      this.platform.log.info(`Sending disarm command to Somfy Protect HTTP API at ${url}...`);

      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.platform.log.error(`HTTP API returned error ${response.status}: ${errorText}`);
        this.platform.log.error('Make sure the Somfy Protect plugin HTTP API is enabled and configured correctly.');
        return;
      }

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        this.platform.log.error(`HTTP API returned non-JSON response (${contentType || 'unknown type'})`);
        this.platform.log.error('Response preview:', responseText.substring(0, 200));

        // Check if this looks like Homebridge Config UI (port conflict)
        if (responseText.includes('<!doctype html>') && responseText.includes('Homebridge')) {
          this.platform.log.error('⚠️  Port conflict detected! The port is being used by Homebridge Config UI.');
          this.platform.log.error(`Make sure the Somfy Protect plugin HTTP API is configured on port ${port} (not 8581).`);
          this.platform.log.error('Port 8581 is reserved for Homebridge Config UI.');
        } else {
          this.platform.log.error('Make sure the Somfy Protect plugin HTTP API is properly configured.');
        }
        return;
      }

      const result = await response.json();
      this.platform.log.info('✓ Successfully disarmed alarm via HTTP API');
      if (result && typeof result === 'object') {
        this.platform.log.info(`Response: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          this.platform.log.error(`Could not connect to Somfy Protect HTTP API on port ${this.platform.config.httpPort || 8582}`);
          this.platform.log.error('Make sure the Somfy Protect plugin is running and HTTP API is enabled.');
          this.platform.log.error('Check that the httpPort in Somfy Protect plugin matches this configuration.');
        } else {
          this.platform.log.error('Error calling Somfy Protect HTTP API:', error.message);
        }
      } else {
        this.platform.log.error('Unknown error calling Somfy Protect HTTP API:', error);
      }
    }
  }
}
