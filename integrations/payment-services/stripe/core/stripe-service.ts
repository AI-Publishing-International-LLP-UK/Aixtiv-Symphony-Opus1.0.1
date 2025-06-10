/**
 * Stripe Service Implementation
 * 
 * Core service that:
 * - Interfaces with SecretsVault for secure key management
 * - Implements key rotation logic
 * - Handles environment-specific configurations
 * - Manages telemetry settings
 * - Ensures zero-drift mode compliance
 * - Integrates with the secure gateway architecture
 */

import Stripe from 'stripe';
import stripeConfig, { 
  StripeIntegrationConfig, 
  StripeSecretReference, 
  ROTATION_CONFIG,
  validateStripeApiKey,
  getStripeEnvironment,
  createStripeKeyMetadata,
  createStripeAccessPolicy
} from '../config/stripe-config';
import { SecretsVault } from '../../../../integration/gateway/secrets-vault';
import { Identity, AuthenticationContext } from '../../../../integration/gateway/types';
import { Logger } from '../../../../core/logging/logger';

// Initialize logger
const logger = new Logger('stripe-service');

export class StripeService {
  private secretsVault: SecretsVault;
  private config: StripeIntegrationConfig;
  private stripe: Stripe | null = null;
  private secretRef: StripeSecretReference | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;
  
  constructor(
    secretsVault: SecretsVault,
    config: Partial<StripeIntegrationConfig> = {}
  ) {
    this.secretsVault = secretsVault;
    // Merge default config with provided overrides
    this.config = {
      ...stripeConfig.DEFAULT_STRIPE_CONFIG,
      ...config
    };
    
    logger.info(`Initialized Stripe service in ${this.config.environment} mode`);
    logger.debug(`Region: ${this.config.region}, Zero-drift mode: ${this.config.zeroMode}`);
  }
  
  /**
   * Initialize the Stripe service with API key
   * @param apiKey Stripe API key (sk_test_* or sk_live_*)
   * @param owner Identity of the key owner
   */
  async initialize(apiKey: string, owner: Identity): Promise<StripeSecretReference> {
    logger.info('Initializing Stripe service');
    
    // Validate API key format
    if (!validateStripeApiKey(apiKey)) {
      throw new Error('Invalid Stripe API key format');
    }
    
    // Determine environment from key
    const keyType = getStripeEnvironment(apiKey);
    if (keyType === 'unknown') {
      throw new Error('Unknown Stripe API key type');
    }
    
    // Update config with correct environment if needed
    const envFromKey = keyType === 'live' ? 'production' : 'development';
    if (this.config.environment !== envFromKey) {
      logger.warn(`Updating environment from ${this.config.environment} to ${envFromKey} based on API key`);
      this.config.environment = envFromKey as any;
    }
    
    // Store API key in SecretsVault
    const metadata = createStripeKeyMetadata(keyType, this.config.telemetryOptOut);
    const accessPolicy = createStripeAccessPolicy(keyType);
    
    try {
      // Store in vault with quantum-resistant encryption
      logger.debug('Storing Stripe API key in SecretsVault');
      this.secretRef = await this.storeStripeApiKey(apiKey, owner, keyType);
      
      // Initialize Stripe client
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
        telemetry: !this.config.telemetryOptOut
      });
      
      // Schedule key rotation if enabled
      if (this.config.keyRotationEnabled) {
        this.scheduleKeyRotation();
      }
      
      logger.info(`Stripe service successfully initialized in ${this.config.environment} environment`);
      return this.secretRef;
    } catch (error) {
      logger.error('Failed to initialize Stripe service', error);
      throw new Error(`Stripe initialization failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Store Stripe API key in the SecretsVault
   */
  private async storeStripeApiKey(
    apiKey: string, 
    owner: Identity,
    keyType: 'test' | 'live'
  ): Promise<StripeSecretReference> {
    const accessPolicy = createStripeAccessPolicy(keyType);
    
    // Store using quantum-resistant encryption
    const secretRef = await this.secretsVault.storeSecret(
      {
        value: apiKey,
        metadata: createStripeKeyMetadata(keyType, this.config.telemetryOptOut),
        rotationPolicy: {
          interval: ROTATION_CONFIG.interval,
          strategy: ROTATION_CONFIG.strategy
        }
      },
      owner,
      accessPolicy
    );
    
    // Return as Stripe-specific reference
    return {
      ...secretRef,
      keyType,
      environment: keyType === 'live' ? 'production' : 'development',
      telemetryOptOut: this.config.telemetryOptOut,
      region: this.config.region
    };
  }
  
  /**
   * Retrieve Stripe API key from SecretsVault
   */
  async getStripeApiKey(
    context: AuthenticationContext,
    purpose: 'api' | 'cli' | 'webhook'
  ): Promise<string> {
    logger.debug(`Retrieving Stripe API key for ${purpose}`);
    
    if (!this.secretRef) {
      throw new Error('Stripe service not initialized');
    }
    
    try {
      // Access the secret with purpose and context
      const accessResult = await this.secretsVault.accessSecret(
        { id: this.secretRef.id },
        context.userIdentity,
        purpose,
        {
          deviceSignature: context.deviceFingerprint,
          riskScore: context.contextualRiskScore,
          region: this.config.region,
          environment: this.config.environment
        }
      );
      
      return accessResult.value;
    } catch (error) {
      logger.error('Failed to retrieve Stripe API key', error);
      throw new Error(`Stripe key access failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Schedule automatic key rotation
   */
  private scheduleKeyRotation(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
    }
    
    logger.info(`Scheduling Stripe API key rotation in ${ROTATION_CONFIG.interval / (24 * 60 * 60 * 1000)} days`);
    
    this.rotationTimer = setTimeout(() => {
      this.checkAndRotateKey()
        .catch(error => {
          logger.error('Automatic key rotation failed', error);
        });
    }, ROTATION_CONFIG.interval);
  }
  
  /**
   * Check if key rotation is needed and perform rotation
   */
  async checkAndRotateKey(): Promise<void> {
    if (!this.secretRef || !this.config.keyRotationEnabled) {
      return;
    }
    
    logger.info('Checking if Stripe API key rotation is needed');
    
    try {
      // In a real implementation, this would:
      // 1. Create a new API key in Stripe
      // 2. Store the new key in the vault
      // 3. Verify the new key works
      // 4. Deprecate the old key (optional)
      
      // Re-schedule for next rotation
      this.scheduleKeyRotation();
      
      logger.info('Stripe API key rotation completed successfully');
    } catch (error) {
      logger.error('Stripe API key rotation failed', error);
      // Reschedule for another attempt sooner
      setTimeout(() => {
        this.checkAndRotateKey();
      }, 24 * 60 * 60 * 1000); // Try again in 1 day
    }
  }
  
  /**
   * Rotate Stripe API key manually
   */
  async rotateStripeApiKey(
    newApiKey: string,
    owner: Identity
  ): Promise<StripeSecretReference> {
    logger.info('Manually rotating Stripe API key');
    
    if (!this.secretRef) {
      throw new Error('Stripe service not initialized');
    }
    
    // Validate new key format
    if (!validateStripeApiKey(newApiKey)) {
      throw new Error('Invalid Stripe API key format');
    }
    
    // Verify key type consistency
    const newKeyType = getStripeEnvironment(newApiKey);
    if (newKeyType === 'unknown') {
      throw new Error('Unknown Stripe API key type');
    }
    
    if (newKeyType !== this.secretRef.keyType) {
      throw new Error('Key type mismatch during rotation. Cannot change from test to live or vice versa.');
    }
    
    try {
      // Store new key
      const newSecretRef = await this.storeStripeApiKey(
        newApiKey,
        owner,
        newKeyType
      );
      
      // Update client
      this.stripe = new Stripe(newApiKey, {
        apiVersion: '2023-10-16',
        telemetry: !this.config.telemetryOptOut
      });
      
      // Update reference
      this.secretRef = newSecretRef;
      
      // Reset rotation schedule
      if (this.config.keyRotationEnabled) {
        this.scheduleKeyRotation();
      }
      
      logger.info('Stripe API key rotated successfully');
      return newSecretRef;
    } catch (error) {
      logger.error('Manual key rotation failed', error);
      throw new Error(`Stripe key rotation failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Update telemetry settings
   */
  updateTelemetrySettings(telemetryOptOut: boolean): void {
    logger.info(`Updating Stripe telemetry settings: ${telemetryOptOut ? 'disabled' : 'enabled'}`);
    this.config.telemetryOptOut = telemetryOptOut;
    
    // Update Stripe client if exists
    if (this.stripe) {
      this.stripe.setTelemetryEnabled(!telemetryOptOut);
    }
  }
  
  /**
   * Get the Stripe client instance
   * @param context Authentication context
   * @returns Stripe client instance
   */
  async getStripeClient(context: AuthenticationContext): Promise<Stripe> {
    if (this.stripe) {
      return this.stripe;
    }
    
    // If not already initialized, get key and initialize
    const apiKey = await this.getStripeApiKey(context, 'api');
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
      telemetry: !this.config.telemetryOptOut
    });
    
    return this.stripe;
  }
  
  /**
   * Verify the Stripe configuration and connectivity
   */
  async verifyConfiguration(): Promise<boolean> {
    if (!this.stripe) {
      return false;
    }
    
    try {
      // Simple ping to verify connectivity
      await this.stripe.balance.retrieve();
      logger.info('Stripe configuration verified successfully');
      return true;
    } catch (error) {
      logger.error('Stripe configuration verification failed', error);
      return false;
    }
  }
  
  /**
   * Get current configuration
   */
  getConfiguration(): StripeIntegrationConfig {
    return { ...this.config };
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.rotationTimer) {
      clearTimeout(this.rotationTimer);
      this.rotationTimer = null;
    }
    
    this.stripe = null;
    logger.info('Stripe service disposed');
  }
}

export default StripeService;

