/**
 * Stripe Integration Configuration
 * 
 * Provides secure configuration for Stripe API integration with:
 * - Key rotation (90-day schedule)
 * - Region-specific settings (us-west1)
 * - Integration with SecretsVault
 * - Zero-drift mode compatibility
 * - Environment-specific configuration
 * - Telemetry settings
 */

import { SecretReference, AccessPolicy } from '../../../../integration/gateway/types';

// Region configuration - always us-west1 per project standards
export const REGION = 'us-west1';

// Stripe API key validation pattern
export const STRIPE_API_KEY_PATTERN = /^sk_(test|live)_[0-9a-zA-Z]{24,}$/;

// Stripe integration configuration
export interface StripeIntegrationConfig {
  enabled: boolean;
  keyRotationEnabled: boolean;
  environment: 'test' | 'live' | 'development' | 'production';
  region: string;
  endpoint: string;
  telemetryOptOut: boolean;
  zeroMode: 'zero-drift' | 'minimal-drift' | 'adaptive';
}

// Stripe-specific Secret Reference extending base SecretReference
export interface StripeSecretReference extends SecretReference {
  keyType: 'test' | 'live';
  environment: string;
  telemetryOptOut: boolean;
  region: string;
}

// Stripe-specific Access Policy extending base AccessPolicy
export interface StripeAccessPolicy extends AccessPolicy {
  allowedServices: string[];
  allowedEnvironments: string[];
  restrictToRegion: string;
}

// Default Stripe integration configuration
export const DEFAULT_STRIPE_CONFIG: StripeIntegrationConfig = {
  enabled: true,
  keyRotationEnabled: true,
  environment: 'development',
  region: REGION,
  endpoint: 'https://api.stripe.com/v1',
  telemetryOptOut: false,
  zeroMode: 'zero-drift' // Symphony integration zero-drift mode
};

// Key rotation configuration
export const ROTATION_CONFIG = {
  interval: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
  strategy: 'overlap-and-verify' as const,
  backupCount: 1,
  enforceOnStartup: true
};

// Create a Stripe-specific access policy
export function createStripeAccessPolicy(
  environment: 'test' | 'live'
): StripeAccessPolicy {
  return {
    allowedServices: ['stripe-api', 'stripe-cli', 'payment-processor'],
    allowedEnvironments: [environment],
    restrictToRegion: REGION,
    maxAccessCount: -1, // unlimited
    timeConstraints: {
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }
  };
}

// Validate Stripe API key format
export function validateStripeApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  return STRIPE_API_KEY_PATTERN.test(apiKey);
}

// Determine environment from Stripe API key
export function getStripeEnvironment(apiKey: string): 'test' | 'live' | 'unknown' {
  if (!apiKey || typeof apiKey !== 'string') {
    return 'unknown';
  }
  
  if (apiKey.startsWith('sk_test_')) {
    return 'test';
  } else if (apiKey.startsWith('sk_live_')) {
    return 'live';
  }
  
  return 'unknown';
}

// Create metadata for Stripe API key
export function createStripeKeyMetadata(
  environment: 'test' | 'live', 
  telemetryOptOut: boolean
) {
  return {
    type: 'stripe',
    keyType: environment,
    createdAt: new Date().toISOString(),
    telemetryOptOut,
    region: REGION,
    rotationSchedule: {
      nextRotation: new Date(Date.now() + ROTATION_CONFIG.interval).toISOString(),
      interval: ROTATION_CONFIG.interval,
      strategy: ROTATION_CONFIG.strategy
    }
  };
}

// Configuration for GitHub Actions Secret
export const GITHUB_SECRET_CONFIG = {
  secretName: 'STRIPE_API_KEY',
  description: 'Stripe API key for payment processing',
  requiredForWorkflows: ['deploy-ci', 'payment-processing']
};

// Connect to SecretsVault for Stripe key operations
export async function connectToSecretsVault() {
  // In actual implementation, this would initialize a connection to the secrets management system
  console.log(`Connecting to SecretsVault in ${REGION} region for Stripe key operations`);
  return {
    connected: true,
    region: REGION,
    timestamp: new Date().toISOString()
  };
}

export default {
  DEFAULT_STRIPE_CONFIG,
  ROTATION_CONFIG,
  REGION,
  createStripeAccessPolicy,
  validateStripeApiKey,
  getStripeEnvironment,
  createStripeKeyMetadata,
  GITHUB_SECRET_CONFIG,
  connectToSecretsVault
};

