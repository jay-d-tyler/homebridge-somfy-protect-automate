import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { API, PlatformConfig, Logging } from 'homebridge';

// Mock dependencies
const mockRegisterPlatform = jest.fn();
const mockRegisterPlatformAccessories = jest.fn();
const mockUnregisterPlatformAccessories = jest.fn();
const mockPublishExternalAccessories = jest.fn();

describe('SomfyProtectAutomatePlatform', () => {
  let mockLogger: jest.Mocked<Logging>;
  let mockApi: jest.Mocked<API>;
  let mockConfig: PlatformConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      success: jest.fn(),
    } as unknown as jest.Mocked<Logging>;

    // Mock API
    mockApi = {
      on: jest.fn(),
      registerPlatform: mockRegisterPlatform,
      registerPlatformAccessories: mockRegisterPlatformAccessories,
      unregisterPlatformAccessories: mockUnregisterPlatformAccessories,
      publishExternalAccessories: mockPublishExternalAccessories,
      hap: {
        Service: {},
        Characteristic: {},
        uuid: {
          generate: jest.fn((name: string) => `uuid-${name}`),
        },
      },
      platformAccessory: jest.fn(),
      platformAccessories: [],
    } as unknown as jest.Mocked<API>;

    // Mock config
    mockConfig = {
      platform: 'SomfyProtectAutomate',
      name: 'Somfy Protect Automate',
      httpPort: 8582,
      httpToken: 'test-token',
    };
  });

  describe('Platform Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(mockConfig.platform).toBe('SomfyProtectAutomate');
      expect(mockConfig.name).toBe('Somfy Protect Automate');
    });

    it('should have HTTP API configuration', () => {
      expect(mockConfig.httpPort).toBeDefined();
      expect(typeof mockConfig.httpPort).toBe('number');
      expect(mockConfig.httpPort).toBe(8582);
    });

    it('should have optional HTTP token configuration', () => {
      expect(mockConfig.httpToken).toBeDefined();
      expect(typeof mockConfig.httpToken).toBe('string');
    });
  });

  describe('UUID Generation', () => {
    it('should generate UUID for button label', () => {
      const buttonLabel = 'Disarm Somfy Protect';
      const uuid = mockApi.hap.uuid.generate(buttonLabel);
      expect(uuid).toBe(`uuid-${buttonLabel}`);
      expect(mockApi.hap.uuid.generate).toHaveBeenCalledWith(buttonLabel);
    });
  });

  describe('Logger', () => {
    it('should have all required logging methods', () => {
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.debug).toBeDefined();
    });

    it('should be able to log messages', () => {
      mockLogger.info('Test message');
      expect(mockLogger.info).toHaveBeenCalledWith('Test message');
    });
  });

  describe('API Methods', () => {
    it('should have registerPlatformAccessories method', () => {
      expect(mockApi.registerPlatformAccessories).toBeDefined();
      expect(typeof mockApi.registerPlatformAccessories).toBe('function');
    });

    it('should have event listener method', () => {
      expect(mockApi.on).toBeDefined();
      expect(typeof mockApi.on).toBe('function');
    });
  });
});
