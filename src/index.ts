import {
  API,
  Characteristic,
  CharacteristicValue,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

const PLUGIN_NAME = '@jay-d-tyler/homebridge-somfy-protect-automate';
const PLATFORM_NAME = 'SomfyProtectAutomate';
const HTTP_HOST = '127.0.0.1';
const DEFAULT_HTTP_PORT = 8582;
const REQUEST_TIMEOUT_MS = 10_000;
const SWITCH_RESET_DELAY_MS = 1_000;

export interface SomfyProtectAutomatePlatformConfig extends PlatformConfig {
  name?: string;
  httpPort?: number;
  httpToken?: string;
}

export interface SomfyAction {
  id: 'disarm' | 'arm-away' | 'arm-night';
  label: string;
  endpoint: string;
  logDescription: string;
  serialNumber: string;
}

export const SOMFY_ACTIONS: readonly SomfyAction[] = [
  {
    id: 'disarm',
    label: 'Disarm Somfy Protect',
    endpoint: '/disarm',
    logDescription: 'disarm Somfy Protect',
    serialNumber: 'SPA-DISARM',
  },
  {
    id: 'arm-away',
    label: 'Arm Somfy Protect for Away',
    endpoint: '/arm/away',
    logDescription: 'arm Somfy Protect for Away',
    serialNumber: 'SPA-ARM-AWAY',
  },
  {
    id: 'arm-night',
    label: 'Arm Somfy Protect for Night',
    endpoint: '/arm/night',
    logDescription: 'arm Somfy Protect for Night',
    serialNumber: 'SPA-ARM-NIGHT',
  },
];

export default (api: API) => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, SomfyProtectAutomatePlatform);
};

export class SomfyProtectAutomatePlatform implements DynamicPlatformPlugin {
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
    this.log.info('=== Somfy Protect Automate Initializing ===');
    this.log.info('Platform name:', this.config.name);
    this.log.info('HTTP API port:', this.config.httpPort ?? DEFAULT_HTTP_PORT);
    if (this.config.httpToken?.trim()) {
      this.log.info('HTTP API authentication: enabled');
    } else {
      this.log.error('HTTP API authentication: missing required httpToken');
    }

    this.api.on('didFinishLaunching', () => {
      this.log.info('Homebridge finished launching, discovering switches...');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName, 'UUID:', accessory.UUID);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const expectedAccessories = new Map(
      SOMFY_ACTIONS.map(action => [this.api.hap.uuid.generate(action.label), action]),
    );
    const obsoleteAccessories = this.accessories.filter(accessory => !expectedAccessories.has(accessory.UUID));

    if (obsoleteAccessories.length > 0) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, obsoleteAccessories);
      obsoleteAccessories.forEach(accessory => {
        const index = this.accessories.indexOf(accessory);
        if (index >= 0) {
          this.accessories.splice(index, 1);
        }
      });
      this.log.info(`Removed ${obsoleteAccessories.length} obsolete cached accessory(ies)`);
    }

    const newAccessories: PlatformAccessory[] = [];

    for (const [uuid, action] of expectedAccessories) {
      let accessory = this.accessories.find(candidate => candidate.UUID === uuid);

      if (accessory) {
        this.log.info('Restoring switch from cache:', accessory.displayName);
      } else {
        accessory = new this.api.platformAccessory(action.label, uuid);
        this.accessories.push(accessory);
        newAccessories.push(accessory);
        this.log.info('Adding switch:', action.label);
      }

      new SomfyActionSwitch(this, accessory, action);
    }

    if (newAccessories.length > 0) {
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, newAccessories);
      this.log.info(`Registered ${newAccessories.length} new accessory(ies)`);
    }
  }
}

export class SomfyActionSwitch {
  private readonly service: Service;
  private switchState = false;
  private actionInFlight?: Promise<void>;
  private resetTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly platform: SomfyProtectAutomatePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly action: SomfyAction,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Jay Tyler')
      .setCharacteristic(this.platform.Characteristic.Model, 'Somfy Protect Automation Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, action.serialNumber);

    this.service = this.accessory.getService(this.platform.Service.Switch)
      || this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.displayName,
    );

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  async setOn(value: CharacteristicValue): Promise<void> {
    const isOn = Boolean(value);

    if (!isOn) {
      this.switchState = false;
      return;
    }

    this.switchState = true;

    if (this.actionInFlight) {
      this.platform.log.warn(`${this.action.label} is already in progress; ignoring duplicate trigger`);
      await this.actionInFlight;
      return;
    }

    const request = this.callSomfyHttpApi();
    this.actionInFlight = request;

    try {
      await request;
    } finally {
      if (this.actionInFlight === request) {
        this.actionInFlight = undefined;
      }
      this.scheduleReset();
    }
  }

  getOn(): boolean {
    return this.switchState;
  }

  private scheduleReset(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.switchState = false;
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
      this.platform.log.info(`${this.action.label} reset to OFF`);
    }, SWITCH_RESET_DELAY_MS);
  }

  private async callSomfyHttpApi(): Promise<void> {
    const port = this.platform.config.httpPort ?? DEFAULT_HTTP_PORT;
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      throw new Error(`Invalid Somfy Protect HTTP API port: ${port}`);
    }

    const url = `http://${HTTP_HOST}:${port}${this.action.endpoint}`;
    const token = this.platform.config.httpToken;
    if (!token?.trim()) {
      throw new Error('Somfy Protect HTTP API token is required');
    }

    const headers: Record<string, string> = {};
    headers.Authorization = `Bearer ${token}`;

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

    this.platform.log.info(`Sending request to ${this.action.logDescription} via ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = (await response.text()).substring(0, 500);
        throw new Error(`Somfy Protect HTTP API returned ${response.status}: ${errorText || response.statusText}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Somfy Protect HTTP API returned unexpected content type: ${contentType || 'unknown'}`);
      }

      const result: unknown = await response.json();
      if (
        typeof result !== 'object'
        || result === null
        || !('success' in result)
        || result.success !== true
      ) {
        throw new Error('Somfy Protect HTTP API response did not confirm success');
      }

      this.platform.log.debug(`Somfy Protect response: ${JSON.stringify(result)}`);
      this.platform.log.info(`Successfully sent command to ${this.action.logDescription}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const detail = error instanceof Error && error.name === 'AbortError'
        ? `request timed out after ${REQUEST_TIMEOUT_MS}ms`
        : message;
      this.platform.log.error(`Failed to ${this.action.logDescription}: ${detail}`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
