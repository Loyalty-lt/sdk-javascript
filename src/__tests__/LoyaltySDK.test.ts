import { LoyaltySDK } from '../LoyaltySDK';
import { LoyaltySDKError } from '../types';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: {
      headers: {},
      baseURL: '',
      timeout: 30000
    },
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    }
  }))
}));

// Mock Ably
jest.mock('ably', () => ({
  Realtime: jest.fn(() => ({
    connection: {
      on: jest.fn()
    },
    channels: {
      get: jest.fn(() => ({
        subscribe: jest.fn()
      }))
    }
  }))
}));

describe('LoyaltySDK', () => {
  let sdk: LoyaltySDK;

  beforeEach(() => {
    sdk = new LoyaltySDK({
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      partnerId: 'test-partner-id',
      environment: 'staging'
    });
  });

  describe('Constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(sdk).toBeInstanceOf(LoyaltySDK);
      expect(sdk.getConfig().apiKey).toBe('test-api-key');
      expect(sdk.getConfig().environment).toBe('staging');
    });

    it('should throw error with invalid configuration', () => {
      expect(() => {
        new LoyaltySDK({} as any);
      }).toThrow(LoyaltySDKError);
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      sdk.updateConfig({ debug: true });
      expect(sdk.getConfig().debug).toBe(true);
    });

    it('should switch environment', () => {
      sdk.switchEnvironment('production');
      expect(sdk.getConfig().environment).toBe('production');
    });

    it('should set API credentials', () => {
      sdk.setApiCredentials('new-key', 'new-secret');
      expect(sdk.getConfig().apiKey).toBe('new-key');
      expect(sdk.getConfig().apiSecret).toBe('new-secret');
    });
  });

  describe('Authentication', () => {
    it('should set and get token', () => {
      const token = 'test-token';
      sdk.setToken(token);
      expect(sdk.getToken()).toBe(token);
      expect(sdk.isAuthenticated()).toBe(true);
    });

    it('should clear tokens', () => {
      sdk.setToken('test-token');
      sdk.clearTokens();
      expect(sdk.getToken()).toBeUndefined();
      expect(sdk.isAuthenticated()).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should return SDK version', () => {
      expect(sdk.getVersion()).toBe('2.0.0');
    });
  });
}); 
 
 