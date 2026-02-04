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
    this.log.info('=== Somfy Protect Automate v1.0.10 Initializing ===');
    this.log.info('Platform name:', this.config.name);
    this.log.info('Alarm name configured:', this.config.alarmName || '(not set)');

    this.api.on('didFinishLaunching', () => {
      this.log.info('Homebridge finished launching, discovering devices...');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    this.log.info('Starting device discovery...');
    const buttonLabel = 'Disarm Somfy Protect';
    const uuid = this.api.hap.uuid.generate(buttonLabel);
    this.log.info(`Generated UUID for "${buttonLabel}": ${uuid}`);

    // Clean up old accessories with different names
    const oldAccessoriesToRemove = this.accessories.filter(acc => acc.UUID !== uuid);
    if (oldAccessoriesToRemove.length > 0) {
      this.log.info(`Removing ${oldAccessoriesToRemove.length} old cached accessory(ies)...`);
      oldAccessoriesToRemove.forEach(acc => {
        this.log.info(`  - Removing: "${acc.displayName}"`);
      });
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, oldAccessoriesToRemove);
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
      const port = this.platform.config.httpPort || 8581;
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

      const result = await response.json();
      this.platform.log.info('✓ Successfully disarmed alarm via HTTP API');
      this.platform.log.info(`Response: ${JSON.stringify(result)}`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          this.platform.log.error(`Could not connect to Somfy Protect HTTP API on port ${this.platform.config.httpPort || 8581}`);
          this.platform.log.error('Make sure the Somfy Protect plugin is running and HTTP API is enabled.');
        } else {
          this.platform.log.error('Error calling Somfy Protect HTTP API:', error.message);
        }
      } else {
        this.platform.log.error('Unknown error calling Somfy Protect HTTP API:', error);
      }
    }
  }
}
