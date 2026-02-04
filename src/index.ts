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
  alarmName: string;
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
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const buttonLabel = 'Disarm Somfy Protect';
    const uuid = this.api.hap.uuid.generate(buttonLabel);

    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      new SomfyDisarmSwitch(this, existingAccessory);
    } else {
      this.log.info('Adding new accessory:', buttonLabel);
      const accessory = new this.api.platformAccessory(buttonLabel, uuid);
      new SomfyDisarmSwitch(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
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

    // Register handlers for the On characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
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
      if (!this.platform.config.alarmName) {
        this.platform.log.error('Alarm name not configured! Please set "alarmName" in the plugin configuration.');
        return;
      }

      this.platform.log.info(`Attempting to disarm Somfy Protect alarm: "${this.platform.config.alarmName}"...`);

      // Get all accessories from Homebridge
      // Note: platformAccessories is not in the public API types but exists at runtime
      const allAccessories = (this.platform.api as unknown as { platformAccessories: PlatformAccessory[] }).platformAccessories || [];

      this.platform.log.info(`Searching through ${allAccessories.length} total accessories in Homebridge...`);

      // Log all accessory names for debugging
      if (allAccessories.length > 0) {
        this.platform.log.info('Available accessories:');
        allAccessories.forEach((acc, index) => {
          this.platform.log.info(`  ${index + 1}. "${acc.displayName}"`);
        });
      } else {
        this.platform.log.warn('No accessories found in platformAccessories array.');
        this.platform.log.warn('This likely means the Homebridge API does not expose other plugins\' accessories.');
        this.platform.log.warn('You may need to use a different approach to control your alarm.');
        return;
      }

      // Look for the specific alarm by name (exact match)
      const targetAccessory = allAccessories.find(acc => acc.displayName === this.platform.config.alarmName);

      if (!targetAccessory) {
        this.platform.log.error(`Could not find alarm with name "${this.platform.config.alarmName}"`);
        this.platform.log.error('Available accessories:');
        allAccessories.forEach(acc => {
          this.platform.log.error(`  - "${acc.displayName}"`);
        });
        this.platform.log.error('Please update the "alarmName" setting to match exactly.');
        return;
      }

      this.platform.log.info(`Found target accessory: "${targetAccessory.displayName}"`);

      // List all services on this accessory
      const services = targetAccessory.services;
      this.platform.log.info(`  Services: ${services.map(s => s.displayName || s.UUID).join(', ')}`);

      // Look for SecuritySystem service
      const securityService = targetAccessory.getService(this.platform.Service.SecuritySystem);

      if (!securityService) {
        this.platform.log.error(`Accessory "${targetAccessory.displayName}" does not have a SecuritySystem service`);
        this.platform.log.error('Make sure this is the correct alarm accessory.');
        return;
      }

      this.platform.log.info('Found SecuritySystem service');

      // Get the target state characteristic
      const targetStateChar = securityService.getCharacteristic(
        this.platform.Characteristic.SecuritySystemTargetState,
      );

      if (!targetStateChar) {
        this.platform.log.error('SecuritySystem service does not have TargetState characteristic');
        return;
      }

      // Set to DISARM (value 3)
      const DISARM = this.platform.Characteristic.SecuritySystemTargetState.DISARM;
      await targetStateChar.setValue(DISARM);

      this.platform.log.info(`✓ Successfully sent DISARM command to "${targetAccessory.displayName}"`);
    } catch (error) {
      this.platform.log.error('Error disarming Somfy alarm:', error);
    }
  }
}
