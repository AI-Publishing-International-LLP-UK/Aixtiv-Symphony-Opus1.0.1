/**
 * Stripe Integration for Aixtiv Symphony
 * 
 * This module provides a secure, quantum-resistant integration with Stripe's payment services.
 * Features include:
 * 
 * - Secure API key management with automatic rotation
 * - Region-specific configuration (us-west1)
 * - Zero-drift mode compatibility
 * - Environment-specific configurations (test/live)
 * - Secure webhook handling with signature verification
 * - Telemetry configuration and monitoring
 * - Complete audit logging
 * 
 * The implementation follows Aixtiv Symphony's security standards and integrates
 * with the secure gateway architecture for key management and rotation.
 */

// Export configuration
export * from './config/stripe-config';
import stripeConfig, { 
  StripeIntegrationConfig,
  StripeSecretReference,
  StripeAccessPolicy,
  REGION,
  ROTATION_CONFIG,
  DEFAULT_STRIPE_CONFIG,
  validateStripeApiKey,
  getStripeEnvironment,
  createStripeKeyMetadata,
  createStripeAccessPolicy
} from './config/stripe-config';

// Export core service
export { StripeService } from './core/stripe-service';
import StripeService from './core/stripe-service';

// Export webhook handler
export { StripeWebhookHandler, WebhookConfig } from './webhooks/webhook-handler';
import StripeWebhookHandler from './webhooks/webhook-handler';

// Re-export necessary types from Stripe
import Stripe from 'stripe';

// Import secure gateway architecture components
import { SecretsVault } from '../../../integration/gateway/secrets-vault';
import { 
  IntegrationGateway,
  AuthenticationContext,
  Identity
} from '../../../integration/gateway/types';

/**
 * Creates and initializes a fully configured Stripe integration
 * 
 * @param secretsVault The SecretsVault instance for secure key management
 * @param apiKey Stripe API key (sk_test_* or sk_live_*)
 * @param owner Identity of the key owner
 * @param config Optional configuration overrides
 * @returns Initialized StripeService and StripeWebhookHandler
 */
export async function createStripeIntegration(
  secretsVault: SecretsVault,
  apiKey: string,
  owner: Identity,
  config: Partial<StripeIntegrationConfig> = {}
) {
  // Create and initialize the service
  const stripeService = new StripeService(secretsVault, config);
  const secretRef = await stripeService.initialize(apiKey, owner);
  
  // Create webhook handler
  const webhookHandler = new StripeWebhookHandler(stripeService, secretsVault, {
    environment: secretRef.environment as any,
    region: REGION,
    zeroMode: 'zero-drift'
  });
  
  return {
    service: stripeService,
    webhookHandler: webhookHandler,
    secretReference: secretRef
  };
}

/**
 * Example usage of the Stripe integration
 * 
 * ```typescript
 * // Import the Stripe integration
 * import { createStripeIntegration, StripeService, StripeWebhookHandler } from 'integrations/payment-services/stripe';
 * 
 * // Initialize secure components
 * const secretsVault = new SecretsVault(
 *   encryptionService,
 *   keyRotationService,
 *   accessControlService
 * );
 * 
 * // Create authentication context (typically from auth middleware)
 * const authContext = getAuthenticationContext(req);
 * 
 * // Initialize integration with Stripe API key
 * const { service, webhookHandler, secretReference } = await createStripeIntegration(
 *   secretsVault,
 *   process.env.STRIPE_API_KEY!,
 *   authContext.userIdentity,
 *   {
 *     environment: 'development',
 *     telemetryOptOut: process.env.STRIPE_CLI_TELEMETRY_OPTOUT === '1',
 *     region: 'us-west1'
 *   }
 * );
 * 
 * // Set up webhook
 * app.post('/webhooks/stripe', webhookHandler.createHandler());
 * 
 * // Use Stripe client
 * app.post('/create-payment', async (req, res) => {
 *   const stripe = await service.getStripeClient(authContext);
 *   const paymentIntent = await stripe.paymentIntents.create({
 *     amount: 1000,
 *     currency: 'usd'
 *   });
 *   res.json({ clientSecret: paymentIntent.client_secret });
 * });
 * 
 * // Setup automatic key rotation
 * // This is handled automatically by the service
 * ```
 */

/**
 * Integration with GitHub Actions for CI/CD
 * 
 * To securely integrate Stripe keys with GitHub Actions:
 * 
 * 1. Store STRIPE_API_KEY as a repository secret:
 *    ```bash
 *    gh secret set STRIPE_API_KEY -b "sk_test_your_test_key_here"
 *    ```
 * 
 * 2. Reference in GitHub Actions workflow:
 *    ```yaml
 *    steps:
 *      - name: Configure Stripe CLI
 *        env:
 *          STRIPE_API_KEY: ${{ secrets.STRIPE_API_KEY }}
 *          STRIPE_DEVICE_NAME: "asoos-ci-${{ github.run_id }}"
 *          STRIPE_CLI_TELEMETRY_OPTOUT: "1"
 *        run: |
 *          # Use environment variables directly with Stripe CLI
 *    ```
 */

/**
 * Configuration for different environments
 * 
 * Development:
 * ```
 * {
 *   environment: 'development',
 *   keyRotationEnabled: true,
 *   telemetryOptOut: true,
 *   region: 'us-west1',
 *   zeroMode: 'zero-drift'
 * }
 * ```
 * 
 * Production:
 * ```
 * {
 *   environment: 'production',
 *   keyRotationEnabled: true,
 *   telemetryOptOut: false,
 *   region: 'us-west1',
 *   zeroMode: 'zero-drift'
 * }
 * ```
 */

// Default export with all components
export default {
  config: stripeConfig,
  StripeService,
  StripeWebhookHandler,
  createStripeIntegration,
  REGION
};

