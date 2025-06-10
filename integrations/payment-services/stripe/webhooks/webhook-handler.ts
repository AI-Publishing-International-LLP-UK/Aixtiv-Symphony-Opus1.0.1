/**
 * Stripe Webhook Handler
 * 
 * Secure handler for Stripe webhooks that:
 * - Verifies webhook signatures
 * - Handles different event types securely
 * - Integrates with secure gateway for key access
 * - Maintains proper logging and monitoring
 * - Supports zero-drift mode
 * - Handles environment-specific webhook configurations
 */

import Stripe from 'stripe';
import { Request, Response } from 'express';
import stripeConfig, { 
  StripeIntegrationConfig, 
  REGION
} from '../config/stripe-config';
import { StripeService } from '../core/stripe-service';
import { SecretsVault } from '../../../../integration/gateway/secrets-vault';
import { AuthenticationContext, Identity } from '../../../../integration/gateway/types';
import { Logger } from '../../../../core/logging/logger';
import { AuditService } from '../../../../core/audit/audit-service';
import { TelemetryService } from '../../../../core/telemetry/telemetry-service';

// Initialize logger
const logger = new Logger('stripe-webhook-handler');
const auditService = new AuditService();
const telemetryService = new TelemetryService();

// Event types with corresponding handlers
type EventHandlers = {
  [key: string]: (event: Stripe.Event, stripe: Stripe) => Promise<void>;
};

export interface WebhookConfig {
  endpointSecret: string;
  toleranceSeconds: number;
  region: string;
  environment: 'test' | 'live' | 'development' | 'production';
  zeroMode: 'zero-drift' | 'minimal-drift' | 'adaptive';
  allowedIPs: string[];
  enableRateLimit: boolean;
  rateLimitMax: number;
  rateLimitWindow: number; // in milliseconds
}

export class StripeWebhookHandler {
  private stripeService: StripeService;
  private secretsVault: SecretsVault;
  private config: WebhookConfig;
  private eventHandlers: EventHandlers = {};
  private rateLimitTracker: Map<string, { count: number, resetAt: number }> = new Map();
  
  constructor(
    stripeService: StripeService,
    secretsVault: SecretsVault,
    config: Partial<WebhookConfig> = {}
  ) {
    this.stripeService = stripeService;
    this.secretsVault = secretsVault;
    
    // Default webhook configuration with secure defaults
    this.config = {
      endpointSecret: '',
      toleranceSeconds: 300, // 5 minutes
      region: REGION,
      environment: 'development',
      zeroMode: 'zero-drift',
      allowedIPs: [],
      enableRateLimit: true,
      rateLimitMax: 100,
      rateLimitWindow: 60 * 1000, // 1 minute
      ...config
    };
    
    logger.info(`Initialized Stripe webhook handler in ${this.config.environment} environment`);
    logger.debug(`Region: ${this.config.region}, Zero-drift mode: ${this.config.zeroMode}`);
    
    // Register default event handlers
    this.registerDefaultEventHandlers();
  }
  
  /**
   * Set the webhook signing secret
   * @param endpointSecret Webhook signing secret from Stripe
   */
  setEndpointSecret(endpointSecret: string): void {
    this.config.endpointSecret = endpointSecret;
    logger.info('Webhook endpoint secret configured');
  }
  
  /**
   * Register a handler for a specific event type
   * @param eventType The Stripe event type to handle
   * @param handler The handler function for this event
   */
  registerEventHandler(
    eventType: string, 
    handler: (event: Stripe.Event, stripe: Stripe) => Promise<void>
  ): void {
    this.eventHandlers[eventType] = handler;
    logger.info(`Registered handler for event type: ${eventType}`);
  }
  
  /**
   * Register default event handlers for common Stripe events
   */
  private registerDefaultEventHandlers(): void {
    // Payment Intent handlers
    this.registerEventHandler('payment_intent.succeeded', async (event, stripe) => {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logger.info(`Payment succeeded: ${paymentIntent.id}`);
      
      await auditService.logEvent({
        type: 'payment.succeeded',
        resource: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        timestamp: new Date(),
        metadata: {
          paymentMethod: paymentIntent.payment_method_types[0],
          region: this.config.region,
          environment: this.config.environment
        }
      });
      
      // Track metric in telemetry
      telemetryService.recordMetric('payment_success', 1, {
        environment: this.config.environment,
        region: this.config.region
      });
    });
    
    this.registerEventHandler('payment_intent.payment_failed', async (event, stripe) => {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logger.warn(`Payment failed: ${paymentIntent.id}`);
      
      await auditService.logEvent({
        type: 'payment.failed',
        resource: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        timestamp: new Date(),
        metadata: {
          paymentMethod: paymentIntent.payment_method_types[0],
          errorMessage: paymentIntent.last_payment_error?.message,
          region: this.config.region,
          environment: this.config.environment
        }
      });
      
      // Track metric in telemetry
      telemetryService.recordMetric('payment_failure', 1, {
        environment: this.config.environment,
        region: this.config.region,
        reason: paymentIntent.last_payment_error?.code || 'unknown'
      });
    });
    
    // Subscription handlers
    this.registerEventHandler('customer.subscription.created', async (event, stripe) => {
      const subscription = event.data.object as Stripe.Subscription;
      logger.info(`Subscription created: ${subscription.id}`);
      
      await auditService.logEvent({
        type: 'subscription.created',
        resource: subscription.id,
        amount: subscription.items.data[0].price.unit_amount,
        timestamp: new Date(),
        metadata: {
          customerId: subscription.customer as string,
          plan: subscription.items.data[0].price.id,
          region: this.config.region,
          environment: this.config.environment
        }
      });
    });
    
    // Handle more event types as needed...
    
    logger.info('Default event handlers registered');
  }
  
  /**
   * Check if IP is allowed
   * @param ip IP address to check
   */
  private isIPAllowed(ip: string): boolean {
    // If no allowed IPs configured, allow all
    if (this.config.allowedIPs.length === 0) {
      return true;
    }
    
    return this.config.allowedIPs.includes(ip);
  }
  
  /**
   * Check if request is within rate limits
   * @param ip IP address to check
   */
  private checkRateLimit(ip: string): boolean {
    if (!this.config.enableRateLimit) {
      return true;
    }
    
    const now = Date.now();
    const trackedData = this.rateLimitTracker.get(ip);
    
    // First request from this IP
    if (!trackedData) {
      this.rateLimitTracker.set(ip, {
        count: 1,
        resetAt: now + this.config.rateLimitWindow
      });
      return true;
    }
    
    // Check if window has reset
    if (now > trackedData.resetAt) {
      this.rateLimitTracker.set(ip, {
        count: 1,
        resetAt: now + this.config.rateLimitWindow
      });
      return true;
    }
    
    // Check if over limit
    if (trackedData.count >= this.config.rateLimitMax) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return false;
    }
    
    // Increment counter
    trackedData.count += 1;
    this.rateLimitTracker.set(ip, trackedData);
    return true;
  }
  
  /**
   * Construct authentication context for secure key access
   */
  private createAuthContext(): AuthenticationContext {
    // In a real implementation, this would be constructed from valid auth data
    // For now, we'll use system identity for webhook processing
    const systemIdentity: Identity = {
      id: 'system-webhook-processor',
      type: 'system',
      publicKey: 'system-webhook-key',
      permissions: ['stripe:webhook:process']
    };
    
    return {
      userIdentity: systemIdentity,
      deviceFingerprint: {
        id: 'webhook-processor',
        signature: 'system-verified',
        attributes: {
          environment: this.config.environment,
          region: this.config.region
        }
      },
      behaviometrics: {
        patternScore: 1.0,
        confidenceLevel: 'high'
      },
      contextualRiskScore: 0.1, // Low risk for system operations
      authenticationFactors: [{ type: 'system', verified: true }]
    };
  }
  
  /**
   * Handle webhook request from Stripe
   * @param req Express request
   * @param res Express response
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const ip = req.ip || req.connection.remoteAddress || '';
    
    try {
      // 1. Basic security checks
      if (!this.isIPAllowed(ip)) {
        logger.warn(`Webhook request from unauthorized IP: ${ip}`);
        res.status(403).send({ error: 'Forbidden' });
        return;
      }
      
      if (!this.checkRateLimit(ip)) {
        res.status(429).send({ error: 'Too Many Requests' });
        return;
      }
      
      // 2. Validate request
      if (!req.body || req.headers['content-type'] !== 'application/json') {
        logger.warn('Invalid webhook request format');
        res.status(400).send({ error: 'Invalid request format' });
        return;
      }
      
      // 3. Extract signature from headers
      const signature = req.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        logger.warn('Missing Stripe signature');
        res.status(400).send({ error: 'Missing signature' });
        return;
      }
      
      if (!this.config.endpointSecret) {
        logger.error('Webhook endpoint secret not configured');
        res.status(500).send({ error: 'Webhook not properly configured' });
        return;
      }
      
      // 4. Get Stripe client through secure service
      const authContext = this.createAuthContext();
      const stripe = await this.stripeService.getStripeClient(authContext);
      
      // 5. Verify signature and parse event
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          this.config.endpointSecret,
          this.config.toleranceSeconds
        );
      } catch (err) {
        const error = err as Error;
        logger.warn(`Webhook signature verification failed: ${error.message}`);
        
        await auditService.logEvent({
          type: 'webhook.signature_failed',
          resource: 'stripe-webhook',
          timestamp: new Date(),
          metadata: {
            error: error.message,
            ip
          }
        });
        
        res.status(400).send(`Webhook Error: ${error.message}`);
        return;
      }
      
      // 6. Process the verified event
      logger.info(`Received Stripe event: ${event.type}`);
      
      // 7. Log audit event for received webhook
      await auditService.logEvent({
        type: 'webhook.received',
        resource: event.id,
        timestamp: new Date(),
        metadata: {
          eventType: event.type,
          region: this.config.region,
          environment: this.config.environment,
          ip
        }
      });
      
      // 8. Handle the event with appropriate handler
      const handler = this.eventHandlers[event.type];
      if (handler) {
        try {
          await handler(event, stripe);
          logger.info(`Successfully processed event: ${event.type}`);
        } catch (error) {
          logger.error(`Error handling event ${event.type}:`, error);
          
          // In zero-drift mode, we don't want to return errors to Stripe
          // as that would cause retries and potential drift
          if (this.config.zeroMode === 'zero-drift') {
            // Log but acknowledge receipt to Stripe
            await auditService.logEvent({
              type: 'webhook.processing_error',
              resource: event.id,
              timestamp: new Date(),
              metadata: {
                eventType: event.type,
                error: (error as Error).message,
                handled: 'acknowledged-with-error'
              }
            });
          } else {
            // In other modes, return error to trigger Stripe retry
            res.status(500).send({ error: 'Event processing failed' });
            return;
          }
        }
      } else {
        // No handler for this event type
        logger.warn(`No handler registered for event type: ${event.type}`);
      }
      
      // 9. Record performance metrics
      const processingTime = Date.now() - startTime;
      telemetryService.recordMetric('webhook_processing_time', processingTime, {
        eventType: event.type,
        environment: this.config.environment,
        region: this.config.region
      });
      
      // 10. Acknowledge receipt
      res.status(200).send({ received: true });
      
    } catch (error) {
      logger.error('Unexpected error processing webhook:', error);
      
      // In zero-drift mode, always acknowledge to prevent retries
      if (this.config.zeroMode === 'zero-drift') {
        res.status(200).send({ received: true, error: 'Processed with errors' });
      } else {
        res.status(500).send({ error: 'Internal server error' });
      }
    }
  }
  
  /**
   * Create an Express route handler
   */
  createHandler() {
    return async (req: Request, res: Response) => {
      await this.handleWebhook(req, res);
    };
  }
}

export default StripeWebhookHandler;

