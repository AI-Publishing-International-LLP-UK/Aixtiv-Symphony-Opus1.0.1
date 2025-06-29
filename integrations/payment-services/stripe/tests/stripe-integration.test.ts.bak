/**
 * Stripe Integration Test Suite
 * 
 * Tests for:
 * 1. Key rotation functionality
 * 2. Secure key storage
 * 3. Webhook signature verification
 * 4. Region compliance
 * 5. Telemetry configuration
 * 6. Integration with SecretsVault
 */

import { jest } from '@jest/globals';
import Stripe from 'stripe';
import { Request, Response } from 'express';
import { 
  StripeService,
  StripeWebhookHandler,
  StripeIntegrationConfig,
  StripeSecretReference,
  StripeAccessPolicy,
  REGION,
  validateStripeApiKey,
  getStripeEnvironment
} from '../';

// Mock dependencies
// Mock SecretsVault
class MockSecretsVault {
  private secrets: Map<string, any> = new Map();
  private secretCounter = 0;
  
  async storeSecret(secret: any, owner: any, accessPolicy: any): Promise<StripeSecretReference> {
    const id = `secret_${++this.secretCounter}`;
    this.secrets.set(id, {
      value: secret.value,
      metadata: secret.metadata,
      accessPolicy,
      owner
    });
    
    return {
      id,
      accessUrl: `secrets-vault://secrets/${id}`,
      metadata: secret.metadata,
      keyType: secret.metadata.keyType,
      environment: secret.metadata.keyType === 'live' ? 'production' : 'development',
      telemetryOptOut: secret.metadata.telemetryOptOut,
      region: REGION
    };
  }
  
  async accessSecret(secretRef: any, accessor: any, purpose: any, context: any): Promise<any> {
    const secret = this.secrets.get(secretRef.id);
    if (!secret) {
      throw new Error('Secret not found');
    }
    
    // Simple mock doesn't perform real validation
    return {
      value: secret.value,
      metadata: secret.metadata,
      accessedAt: new Date()
    };
  }
  
  async retrieveEncryptedSecret(id: string): Promise<any> {
    const secret = this.secrets.get(id);
    if (!secret) {
      throw new Error('Secret not found');
    }
    
    return {
      encryptedValue: 'encrypted-' + secret.value,
      metadata: secret.metadata,
      accessPolicy: secret.accessPolicy
    };
  }
  
  getSecretCount(): number {
    return this.secrets.size;
  }
}

// Mock Logger (to prevent console output during tests)
jest.mock('../../../../core/logging/logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }))
  };
});

// Mock AuditService
jest.mock('../../../../core/audit/audit-service', () => {
  return {
    AuditService: jest.fn().mockImplementation(() => ({
      logEvent: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

// Mock TelemetryService
jest.mock('../../../../core/telemetry/telemetry-service', () => {
  return {
    TelemetryService: jest.fn().mockImplementation(() => ({
      recordMetric: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    setTelemetryEnabled: jest.fn(),
    balance: {
      retrieve: jest.fn().mockResolvedValue({ available: [] })
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation((payload, signature, secret, tolerance) => {
        if (signature === 'valid-signature' && secret === 'valid-secret') {
          return {
            id: 'evt_123',
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: 'pi_123',
                amount: 1000,
                currency: 'usd',
                payment_method_types: ['card']
              }
            }
          };
        } else {
          throw new Error('Invalid signature');
        }
      })
    }
  }));
});

describe('Stripe Integration', () => {
  let secretsVault: MockSecretsVault;
  let mockOwner: Identity;
  let mockAuthContext: AuthenticationContext;
  const testApiKey = 'sk_test_1234567890abcdefghijklmnopqrstuvwxyz';
  const liveApiKey = 'sk_live_1234567890abcdefghijklmnopqrstuvwxyz';
  
  beforeEach(() => {
    secretsVault = new MockSecretsVault();
    
    // Mock owner identity
    mockOwner = {
      id: 'user-123',
      type: 'user',
      publicKey: 'test-public-key',
      permissions: ['stripe:admin']
    };
    
    // Mock auth context
    mockAuthContext = {
      userIdentity: mockOwner,
      deviceFingerprint: {
        id: 'device-123',
        signature: 'test-signature',
        attributes: {}
      },
      behaviometrics: {
        patternScore: 1.0,
        confidenceLevel: 'high'
      },
      contextualRiskScore: 0.1,
      authenticationFactors: [{ type: 'password', verified: true }]
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('API Key Validation', () => {
    test('validates correct test API key format', () => {
      expect(validateStripeApiKey(testApiKey)).toBe(true);
    });
    
    test('validates correct live API key format', () => {
      expect(validateStripeApiKey(liveApiKey)).toBe(true);
    });
    
    test('rejects invalid API key format', () => {
      expect(validateStripeApiKey('invalid-key')).toBe(false);
      expect(validateStripeApiKey('')).toBe(false);
    });
    
    test('correctly identifies key environment', () => {
      expect(getStripeEnvironment(testApiKey)).toBe('test');
      expect(getStripeEnvironment(liveApiKey)).toBe('live');
      expect(getStripeEnvironment('invalid-key')).toBe('unknown');
    });
  });
  
  describe('StripeService', () => {
    let stripeService: StripeService;
    
    beforeEach(() => {
      stripeService = new StripeService(secretsVault as any);
    });
    
    test('initializes with test API key', async () => {
      const secretRef = await stripeService.initialize(testApiKey, mockOwner);
      
      expect(secretRef).toBeDefined();
      expect(secretRef.keyType).toBe('test');
      expect(secretRef.environment).toBe('development');
      expect(secretRef.region).toBe(REGION);
      expect(secretsVault.getSecretCount()).toBe(1);
    });
    
    test('initializes with live API key', async () => {
      const secretRef = await stripeService.initialize(liveApiKey, mockOwner);
      
      expect(secretRef).toBeDefined();
      expect(secretRef.keyType).toBe('live');
      expect(secretRef.environment).toBe('production');
      expect(secretRef.region).toBe(REGION);
      expect(secretsVault.getSecretCount()).toBe(1);
    });
    
    test('fails initialization with invalid API key', async () => {
      await expect(stripeService.initialize('invalid-key', mockOwner))
        .rejects.toThrow('Invalid Stripe API key format');
    });
    
    test('enforces region compliance', async () => {
      const secretRef = await stripeService.initialize(testApiKey, mockOwner);
      const config = stripeService.getConfiguration();
      
      expect(config.region).toBe(REGION);
      expect(secretRef.region).toBe(REGION);
    });
    
    test('rotates API key properly', async () => {
      // Initialize with first key
      await stripeService.initialize(testApiKey, mockOwner);
      expect(secretsVault.getSecretCount()).toBe(1);
      
      // Rotate to a new key
      const newTestApiKey = 'sk_test_0987654321zyxwvutsrqponmlkjihgfedcba';
      const newSecretRef = await stripeService.rotateStripeApiKey(newTestApiKey, mockOwner);
      
      expect(newSecretRef).toBeDefined();
      expect(newSecretRef.keyType).toBe('test');
      expect(secretsVault.getSecretCount()).toBe(2);
    });
    
    test('prevents key type change during rotation', async () => {
      // Initialize with test key
      await stripeService.initialize(testApiKey, mockOwner);
      
      // Try to rotate to a live key (should fail)
      await expect(stripeService.rotateStripeApiKey(liveApiKey, mockOwner))
        .rejects.toThrow('Key type mismatch during rotation');
    });
    
    test('manages telemetry settings', async () => {
      await stripeService.initialize(testApiKey, mockOwner);
      
      // Start with telemetry enabled (default)
      expect(stripeService.getConfiguration().telemetryOptOut).toBe(false);
      
      // Update to disabled
      stripeService.updateTelemetrySettings(true);
      expect(stripeService.getConfiguration().telemetryOptOut).toBe(true);
      
      // Update back to enabled
      stripeService.updateTelemetrySettings(false);
      expect(stripeService.getConfiguration().telemetryOptOut).toBe(false);
    });
    
    test('retrieves Stripe client', async () => {
      await stripeService.initialize(testApiKey, mockOwner);
      const stripe = await stripeService.getStripeClient(mockAuthContext);
      expect(stripe).toBeDefined();
    });
    
    test('verifies configuration successfully', async () => {
      await stripeService.initialize(testApiKey, mockOwner);
      const isValid = await stripeService.verifyConfiguration();
      expect(isValid).toBe(true);
    });
    
    test('cleans up resources on dispose', async () => {
      await stripeService.initialize(testApiKey, mockOwner);
      stripeService.dispose();
      // Verification would typically check internal state
      // This is a bit limited since we don't expose the stripe client property
    });
  });
  
  describe('StripeWebhookHandler', () => {
    let stripeService: StripeService;
    let webhookHandler: StripeWebhookHandler;
    
    beforeEach(async () => {
      stripeService = new StripeService(secretsVault as any);
      await stripeService.initialize(testApiKey, mockOwner);
      
      webhookHandler = new StripeWebhookHandler(
        stripeService as any, 
        secretsVault as any, 
        {
          environment: 'development',
          region: REGION,
          zeroMode: 'zero-drift'
        }
      );
      
      // Set webhook secret
      webhookHandler.setEndpointSecret('valid-secret');
    });
    
    test('creates handler function', () => {
      const handler = webhookHandler.createHandler();
      expect(typeof handler).toBe('function');
    });
    
    test('rejects requests with invalid content type', async () => {
      const req = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        headers: { 'content-type': 'text/plain' },
        body: '{"type":"payment_intent.succeeded"}'
      } as unknown as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as Response;
      
      await webhookHandler.handleWebhook(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
    
    test('rejects requests with missing signature', async () => {
      const req = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        headers: { 'content-type': 'application/json' },
        body: { type: 'payment_intent.succeeded' }
      } as unknown as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as Response;
      
      await webhookHandler.handleWebhook(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
    
    test('validates webhook signature', async () => {
      const req = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        headers: { 
          'content-type': 'application/json',
          'stripe-signature': 'valid-signature'
        },
        body: { type: 'payment_intent.succeeded' }
      } as unknown as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as Response;
      
      await webhookHandler.handleWebhook(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ received: true }));
    });
    
    test('rejects invalid webhook signature', async () => {
      const req = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        headers: { 
          'content-type': 'application/json',
          'stripe-signature': 'invalid-signature'
        },
        body: { type: 'payment_intent.succeeded' }
      } as unknown as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as Response;
      
      await webhookHandler.handleWebhook(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
    test('handles rate limiting', async () => {
      const req = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        headers: { 'content-type': 'application/json' },
        body: { type: 'payment_intent.succeeded' }
      } as unknown as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as Response;
      
      // Configure rate limiting
      (webhookHandler as any).config.enableRateLimit = true;
      (webhookHandler as any).config.rateLimitMax = 2;
      
      // First request (allowed)
      await webhookHandler.handleWebhook(req, res);
      
      // Second request (allowed)
      await webhookHandler.handleWebhook(req, res);
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Third request (should be rate limited)
      await webhookHandler.handleWebhook(req, res);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error: 'Too Many Requests' }));
    });
    
    test('respects zero-drift mode', async () => {
      const req = {
        ip: '192.168.1.1',
        connection: { remoteAddress: '192.168.1.1' },
        headers: { 
          'content-type': 'application/json',
          'stripe-signature': 'valid-signature'
        },
        body: { type: 'payment_intent.succeeded' }
      } as unknown as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      } as unknown as Response;
      
      // Register handler that throws an error
      (webhookHandler as any).registerEventHandler('payment_intent.succeeded', async () => {
        throw new Error('Test error');
      });
      
      // With zero-drift mode (should still return 200 despite error)
      (webhookHandler as any).config.zeroMode = 'zero-drift';
      await webhookHandler.handleWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      
      // Reset mocks
      jest.clearAllMocks();
      
      // With minimal-drift mode (should return 500 on error)
      (webhookHandler as any).config.zeroMode = 'minimal-drift';
      await webhookHandler.handleWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

// Types for test mocking
interface Identity {
  id: string;
  type: string;
  publicKey: string;
  permissions: string[];
}

interface AuthenticationContext {
  userIdentity: Identity;
  deviceFingerprint: {
    id: string;
    signature: string;
    attributes: any;
  };
  behaviometrics: {
    patternScore: number;
    confidenceLevel: string;
  };
  contextualRiskScore: number;
  authenticationFactors: Array<{ type: string; verified: boolean }>;
}

