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
      if (!this.platform.config.alarmName) {
        this.platform.log.error('Alarm name not configured! Please set "alarmName" in the plugin configuration.');
        return;
      }

      this.platform.log.info(`Attempting to disarm Somfy Protect alarm: "${this.platform.config.alarmName}"...`);

      // Access the HAP bridge directly instead of platformAccessories
      // The bridge is stored in the API object but not exposed in types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const homebridgeAPI = this.platform.api as any;

      // Debug: Log available properties on the API object
      this.platform.log.info('Checking API object for bridge access...');
      this.platform.log.info('Available properties:', Object.keys(homebridgeAPI).join(', '));

      // Try different possible locations for the bridge
      const bridge = homebridgeAPI._bridge || homebridgeAPI.bridge || homebridgeAPI._server?.bridge;

      if (!bridge) {
        this.platform.log.error('Could not access Homebridge bridge instance');
        this.platform.log.error('This plugin requires both plugins to run on the Default Bridge');
        return;
      }

      this.platform.log.info('Successfully accessed bridge instance');

      const bridgedAccessories = bridge.bridgedAccessories || [];

      this.platform.log.info(`Searching through ${bridgedAccessories.length} HAP accessories on the bridge...`);

      // Log all accessory names for debugging
      if (bridgedAccessories.length > 0) {
        this.platform.log.info('Available accessories:');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bridgedAccessories.forEach((acc: any, index: number) => {
          this.platform.log.info(`  ${index + 1}. "${acc.displayName}"`);
        });
      } else {
        this.platform.log.error('No accessories found on the bridge.');
        this.platform.log.error('Make sure both plugins are running on the Default Bridge (not child bridges).');
        return;
      }

      // Look for the specific alarm by name (exact match)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const targetAccessory = bridgedAccessories.find((acc: any) => acc.displayName === this.platform.config.alarmName);

      if (!targetAccessory) {
        this.platform.log.error(`Could not find alarm with name "${this.platform.config.alarmName}"`);
        this.platform.log.error('Available accessories:');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bridgedAccessories.forEach((acc: any) => {
          this.platform.log.error(`  - "${acc.displayName}"`);
        });
        this.platform.log.error('Please update the "alarmName" setting to match exactly.');
        return;
      }

      this.platform.log.info(`Found target accessory: "${targetAccessory.displayName}"`);

      // List all services on this accessory
      const services = targetAccessory.services;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.platform.log.info(`  Services: ${services.map((s: any) => s.displayName || s.UUID).join(', ')}`);

      // Look for SecuritySystem service
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const securityService = services.find((s: any) =>
        s.UUID === this.platform.Service.SecuritySystem.UUID,
      );

      if (!securityService) {
        this.platform.log.error(`Accessory "${targetAccessory.displayName}" does not have a SecuritySystem service`);
        this.platform.log.error('Make sure this is the correct alarm accessory.');
        return;
      }

      this.platform.log.info('Found SecuritySystem service');

      // Get the target state characteristic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const targetStateChar = securityService.characteristics.find((c: any) =>
        c.UUID === this.platform.Characteristic.SecuritySystemTargetState.UUID,
      );

      if (!targetStateChar) {
        this.platform.log.error('SecuritySystem service does not have TargetState characteristic');
        return;
      }

      // Set to DISARM (value 3)
      const DISARM = this.platform.Characteristic.SecuritySystemTargetState.DISARM;

      this.platform.log.info(`Setting SecuritySystemTargetState to DISARM (${DISARM})...`);
      targetStateChar.setValue(DISARM);

      this.platform.log.info(`✓ Successfully sent DISARM command to "${targetAccessory.displayName}"`);
    } catch (error) {
      this.platform.log.error('Error disarming Somfy alarm:', error);
    }
  }
}
