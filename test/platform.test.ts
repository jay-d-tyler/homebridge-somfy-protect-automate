import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type {
  API,
  Characteristic,
  Logger,
  PlatformAccessory,
  Service,
} from 'homebridge';
import registerPlugin, {
  SOMFY_ACTIONS,
  SomfyAction,
  SomfyActionSwitch,
  SomfyProtectAutomatePlatform,
  SomfyProtectAutomatePlatformConfig,
} from '../src/index.js';

const serviceTypes = {
  AccessoryInformation: Symbol('AccessoryInformation'),
  Switch: Symbol('Switch'),
} as unknown as typeof Service;

const characteristicTypes = {
  Manufacturer: Symbol('Manufacturer'),
  Model: Symbol('Model'),
  Name: Symbol('Name'),
  On: Symbol('On'),
  SerialNumber: Symbol('SerialNumber'),
} as unknown as typeof Characteristic;

interface AccessoryFixture {
  accessory: PlatformAccessory;
  characteristicHandler: {
    onSet: jest.Mock;
    onGet: jest.Mock;
  };
  informationService: {
    setCharacteristic: jest.Mock;
  };
  switchService: {
    setCharacteristic: jest.Mock;
    getCharacteristic: jest.Mock;
    updateCharacteristic: jest.Mock;
  };
}

interface ApiFixture {
  api: API;
  registerPlatform: jest.Mock;
  registerPlatformAccessories: jest.Mock;
  unregisterPlatformAccessories: jest.Mock;
}

const originalFetch = globalThis.fetch;

function createLogger(): Logger {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    prefix: 'Somfy Protect Automate',
    success: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;
}

function createAccessory(displayName: string, uuid: string): AccessoryFixture {
  const characteristicHandler = {
    onSet: jest.fn(),
    onGet: jest.fn(),
  };
  characteristicHandler.onSet.mockReturnValue(characteristicHandler);
  characteristicHandler.onGet.mockReturnValue(characteristicHandler);

  const informationService = {
    setCharacteristic: jest.fn(),
  };
  informationService.setCharacteristic.mockReturnValue(informationService);

  const switchService = {
    setCharacteristic: jest.fn(),
    getCharacteristic: jest.fn(() => characteristicHandler),
    updateCharacteristic: jest.fn(),
  };
  switchService.setCharacteristic.mockReturnValue(switchService);
  switchService.updateCharacteristic.mockReturnValue(switchService);

  const accessory = {
    UUID: uuid,
    addService: jest.fn(() => switchService),
    displayName,
    getService: jest.fn((serviceType: unknown) => {
      if (serviceType === serviceTypes.AccessoryInformation) {
        return informationService;
      }
      if (serviceType === serviceTypes.Switch) {
        return switchService;
      }
      return undefined;
    }),
  } as unknown as PlatformAccessory;

  return {
    accessory,
    characteristicHandler,
    informationService,
    switchService,
  };
}

function createApi(): ApiFixture {
  const registerPlatform = jest.fn();
  const registerPlatformAccessories = jest.fn();
  const unregisterPlatformAccessories = jest.fn();
  const platformAccessory = jest.fn((displayName: string, uuid: string) => {
    return createAccessory(displayName, uuid).accessory;
  });

  const api = {
    hap: {
      Characteristic: characteristicTypes,
      Service: serviceTypes,
      uuid: {
        generate: jest.fn((name: string) => `uuid-${name}`),
      },
    },
    on: jest.fn(),
    platformAccessory,
    registerPlatform,
    registerPlatformAccessories,
    unregisterPlatformAccessories,
  } as unknown as API;

  return {
    api,
    registerPlatform,
    registerPlatformAccessories,
    unregisterPlatformAccessories,
  };
}

function createPlatform(
  config: Partial<SomfyProtectAutomatePlatformConfig> = {},
): { platform: SomfyProtectAutomatePlatform; logger: Logger; apiFixture: ApiFixture } {
  const logger = createLogger();
  const apiFixture = createApi();
  const platform = new SomfyProtectAutomatePlatform(
    logger,
    {
      httpToken: 'test-token',
      name: 'Somfy Protect Automate',
      platform: 'SomfyProtectAutomate',
      ...config,
    },
    apiFixture.api,
  );

  return { platform, logger, apiFixture };
}

function createResponse(options: {
  body?: unknown;
  contentType?: string;
  ok?: boolean;
  status?: number;
  statusText?: string;
} = {}): Response {
  const {
    body = { success: true },
    contentType = 'application/json',
    ok = true,
    status = 200,
    statusText = 'OK',
  } = options;

  return {
    headers: {
      get: jest.fn(() => contentType),
    },
    json: jest.fn(async () => body),
    ok,
    status,
    statusText,
    text: jest.fn(async () => String(body)),
  } as unknown as Response;
}

function createActionSwitch(
  action: SomfyAction,
  config: Partial<SomfyProtectAutomatePlatformConfig> = {},
) {
  const { platform, logger } = createPlatform(config);
  const accessoryFixture = createAccessory(action.label, `uuid-${action.label}`);
  const actionSwitch = new SomfyActionSwitch(platform, accessoryFixture.accessory, action);
  return { actionSwitch, accessoryFixture, logger };
}

describe('plugin registration and discovery', () => {
  it('registers the dynamic platform', () => {
    const { api, registerPlatform } = createApi();

    registerPlugin(api);

    expect(registerPlatform).toHaveBeenCalledWith(
      '@jay-d-tyler/homebridge-somfy-protect-automate',
      'SomfyProtectAutomate',
      SomfyProtectAutomatePlatform,
    );
  });

  it('creates and registers all three action switches', () => {
    const { platform, apiFixture } = createPlatform();

    platform.discoverDevices();

    expect(apiFixture.registerPlatformAccessories).toHaveBeenCalledTimes(1);
    const registeredAccessories = apiFixture.registerPlatformAccessories.mock.calls[0][2] as PlatformAccessory[];
    expect(registeredAccessories.map(accessory => accessory.displayName)).toEqual(
      SOMFY_ACTIONS.map(action => action.label),
    );
    expect(platform.accessories).toHaveLength(3);
  });

  it('restores expected cached switches and removes obsolete ones', () => {
    const { platform, apiFixture } = createPlatform();
    const expectedAccessories = SOMFY_ACTIONS.map(action => {
      return createAccessory(action.label, `uuid-${action.label}`).accessory;
    });
    const obsoleteAccessory = createAccessory('Legacy Somfy Switch', 'legacy-uuid').accessory;

    [...expectedAccessories, obsoleteAccessory].forEach(accessory => {
      platform.configureAccessory(accessory);
    });
    platform.discoverDevices();

    expect(apiFixture.unregisterPlatformAccessories).toHaveBeenCalledWith(
      '@jay-d-tyler/homebridge-somfy-protect-automate',
      'SomfyProtectAutomate',
      [obsoleteAccessory],
    );
    expect(apiFixture.registerPlatformAccessories).not.toHaveBeenCalled();
    expect(platform.accessories).toEqual(expectedAccessories);
  });
});

describe('Somfy action switches', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn<typeof fetch>();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it.each(SOMFY_ACTIONS)(
    'calls $endpoint for the $id action and resets the switch',
    async action => {
      fetchMock.mockResolvedValue(createResponse());
      const { actionSwitch, accessoryFixture } = createActionSwitch(action, {
        httpPort: 9000,
        httpToken: 'secret-token',
      });

      await actionSwitch.setOn(true);

      expect(fetchMock).toHaveBeenCalledWith(
        `http://127.0.0.1:9000${action.endpoint}`,
        expect.objectContaining({
          headers: { Authorization: 'Bearer secret-token' },
          method: 'POST',
          signal: expect.any(AbortSignal),
        }),
      );
      expect(actionSwitch.getOn()).toBe(true);

      jest.advanceTimersByTime(1_000);

      expect(actionSwitch.getOn()).toBe(false);
      expect(accessoryFixture.switchService.updateCharacteristic).toHaveBeenCalledWith(
        characteristicTypes.On,
        false,
      );
    },
  );

  it('rejects a missing token before making an unauthenticated request', async () => {
    const { actionSwitch } = createActionSwitch(SOMFY_ACTIONS[0], { httpToken: '' });

    await expect(actionSwitch.setOn(true)).rejects.toThrow(
      'Somfy Protect HTTP API token is required',
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing when HomeKit turns a switch off', async () => {
    const { actionSwitch } = createActionSwitch(SOMFY_ACTIONS[0]);

    await actionSwitch.setOn(false);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(actionSwitch.getOn()).toBe(false);
  });

  it('coalesces duplicate triggers while an action is in flight', async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    fetchMock.mockImplementation(() => {
      return new Promise<Response>(resolve => {
        resolveResponse = resolve;
      });
    });
    const { actionSwitch, logger } = createActionSwitch(SOMFY_ACTIONS[1]);

    const firstTrigger = actionSwitch.setOn(true);
    const secondTrigger = actionSwitch.setOn(true);
    resolveResponse?.(createResponse());
    await Promise.all([firstTrigger, secondTrigger]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Arm Somfy Protect for Away is already in progress; ignoring duplicate trigger',
    );
  });

  it('rejects HTTP failures so Homebridge does not report a false success', async () => {
    fetchMock.mockResolvedValue(createResponse({
      body: 'Unauthorized',
      contentType: 'text/plain',
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    }));
    const { actionSwitch, logger } = createActionSwitch(SOMFY_ACTIONS[0]);

    await expect(actionSwitch.setOn(true)).rejects.toThrow(
      'Somfy Protect HTTP API returned 401: Unauthorized',
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to disarm Somfy Protect: Somfy Protect HTTP API returned 401: Unauthorized',
    );
  });

  it('rejects a successful-looking response that does not confirm the command', async () => {
    fetchMock.mockResolvedValue(createResponse({ body: { success: false } }));
    const { actionSwitch } = createActionSwitch(SOMFY_ACTIONS[1]);

    await expect(actionSwitch.setOn(true)).rejects.toThrow(
      'Somfy Protect HTTP API response did not confirm success',
    );
  });

  it('rejects non-JSON responses such as a Homebridge UI port conflict', async () => {
    fetchMock.mockResolvedValue(createResponse({ contentType: 'text/html' }));
    const { actionSwitch } = createActionSwitch(SOMFY_ACTIONS[0]);

    await expect(actionSwitch.setOn(true)).rejects.toThrow(
      'Somfy Protect HTTP API returned unexpected content type: text/html',
    );
  });

  it('rejects invalid port configuration before making a request', async () => {
    const { actionSwitch } = createActionSwitch(SOMFY_ACTIONS[0], { httpPort: 70_000 });

    await expect(actionSwitch.setOn(true)).rejects.toThrow(
      'Invalid Somfy Protect HTTP API port: 70000',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts an unresponsive API request after ten seconds', async () => {
    fetchMock.mockImplementation((_url, init) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });
    const { actionSwitch, logger } = createActionSwitch(SOMFY_ACTIONS[2]);

    const trigger = actionSwitch.setOn(true);
    const rejection = expect(trigger).rejects.toThrow('Request aborted');
    await jest.advanceTimersByTimeAsync(10_000);

    await rejection;
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to arm Somfy Protect for Night: request timed out after 10000ms',
    );
  });
});
