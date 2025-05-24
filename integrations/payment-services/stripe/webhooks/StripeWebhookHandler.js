/**
 * @fileoverview Stripe webhook handler for ASOOS.
 * Processes incoming webhook events from Stripe and dispatches to appropriate handlers.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const crypto = require('crypto');
const config = require('../../config');
const stripeConfig = require('../config/stripe.config');
const loggingConfig = require('../../monitoring/logging.config');
const monitoringConfig = require('../../monitoring/monitoring.config');
const { createLogger } = require('../../utils/logger');

// Initialize logger
const logger = createLogger('stripe-webhook-handler', loggingConfig);

// Initialize metrics
const metrics = {
  webhookLatency: null,
  webhookCount: null,
  webhookErrors: null,
};

/**
 * Initializes metrics for monitoring webhook processing
 */
function initializeMetrics(metricsRegistry) {
  if (!metricsRegistry || !monitoringConfig.enabled) return;

  metrics.webhookLatency = metricsRegistry.createHistogram(
    monitoringConfig.metrics.stripe.webhookLatency.name,
    { 
      description: monitoringConfig.metrics.stripe.webhookLatency.description,
      boundaries: monitoringConfig.metrics.stripe.webhookLatency.buckets
    }
  );

  metrics.webhookCount = metricsRegistry.createCounter(
    'payment_services.stripe.webhook.count',
    { description: 'Count of Stripe webhook events processed' }
  );

  metrics.webhookErrors = metricsRegistry.createCounter(
    'payment_services.stripe.webhook.failures',
    { description: 'Count of Stripe webhook processing failures' }
  );
}

/**
 * Logs webhook event to FMS if enabled
 * @param {Object} event - Webhook event
 * @param {string} status - Processing status
 * @param {Object} metadata - Additional metadata
 */
async function logWebhookToFMS(event, status, metadata = {}) {
  if (!loggingConfig.fms || !loggingConfig.fms.enabled) return;

  try {
    const fmsClient = require('../../utils/fms-client');
    await fmsClient.logWebhookEvent({
      event_type: `webhook.${status}`,
      webhook_id: event.id,
      timestamp: new Date().toISOString(),
      service: 'stripe',
      event_name: event.type,
      status: status,
      metadata: {
        api_version: event.api_version,
        created: event.created,
        ...metadata
      }
    });
  } catch (error) {
    logger.error('Failed to log webhook event to FMS', { 
      error: error.message, 
      webhook_id: event.id
    });
  }
}

/**
 * Updates metrics based on webhook processing
 * @param {Object} event - Webhook event
 * @param {boolean} success - Whether processing was successful
 * @param {number} latencyMs - Processing latency in milliseconds
 */
function updateMetrics(event, success, latencyMs) {
  if (!monitoringConfig.enabled) return;

  try {
    // Update webhook count
    metrics.webhookCount.add(1, { 
      event_type: event.type,
      status: success ? 'success' : 'failed'
    });

    // Update webhook latency
    metrics.webhookLatency.record(latencyMs, {
      event_type: event.type,
      status: success ? 'success' : 'failed'
    });

    // Update webhook errors if failed
    if (!success) {
      metrics.webhookErrors.add(1, { event_type: event.type });
    }
  } catch (error) {
    logger.error('Failed to update webhook metrics', { error: error.message });
  }
}

/**
 * Stripe Webhook Handler
 */
class StripeWebhookHandler {
  /**
   * Creates a new instance of the StripeWebhookHandler
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.metricsRegistry = options.metricsRegistry;
    this.webhookSecret = stripeConfig.webhooks.secret;
    this.validateSignature = stripeConfig.webhooks.validateSignature;
    
    // Initialize metrics if registry is provided
    if (this.metricsRegistry) {
      initializeMetrics(this.metricsRegistry);
    }
    
    // Initialize event handlers
    this.eventHandlers = {};
    
    // Register default handlers
    this.registerDefaultHandlers();
    
    this.logger = logger;
  }

  /**
   * Registers default event handlers
   */
  registerDefaultHandlers() {
    // Payment Intent handlers
    this.registerHandler('payment_intent.succeeded', this.handlePaymentIntentSucceeded.bind(this));
    this.registerHandler('payment_intent.payment_failed', this.handlePaymentIntentFailed.bind(this));
    
    // Invoice handlers
    this.registerHandler('invoice.paid', this.handleInvoicePaid.bind(this));
    this.registerHandler('invoice.payment_failed', this.handleInvoicePaymentFailed.bind(this));
    
    // Subscription handlers
    this.registerHandler('customer.subscription.created', this.handleSubscriptionCreated.bind(this));
    this.registerHandler('customer.subscription.updated', this.handleSubscriptionUpdated.bind(this));
    this.registerHandler('customer.subscription.deleted', this.handleSubscriptionDeleted.bind(this));
    
    // Checkout handlers
    this.registerHandler('checkout.session.completed', this.handleCheckoutSessionCompleted.bind(this));
  }

  /**
   * Registers a handler for a specific event type
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler function
   */
  registerHandler(eventType, handler) {
    this.eventHandlers[eventType] = handler;
    this.logger.info(`Registered handler for event type: ${eventType}`);
  }

  /**
   * Verifies the webhook signature
   * @param {Buffer} payload - Raw request payload
   * @param {string} signature - Stripe signature header
   * @returns {boolean} - Whether the signature is valid
   */
  verifySignature(payload, signature) {
    if (!this.validateSignature || !this.webhookSecret) {
      return true;
    }
    
    try {
      const stripeSignature = require('stripe').createWebhookSignature(
        payload,
        signature,
        this.webhookSecret
      );
      
      return true;
    } catch (error) {
      this.logger.error('Invalid webhook signature', { 
        error: error.message,
        signature: signature
      });
      
      return false;
    }
  }

  /**
   * Handles a webhook request
   * @param {Object} req - HTTP request object
   * @param {Object} res - HTTP response object
   * @returns {Promise<void>}
   */
  async handleWebhook(req, res) {
    const startTime = Date.now();
    let success = false;
    let event = null;
    
    try {
      // Get the raw request payload and signature
      const payload = req.rawBody || req.body;
      const signature = req.headers['stripe-signature'];
      
      // Verify signature
      if (!this.verifySignature(payload, signature)) {
        res.status(400).send('Invalid signature');
        return;
      }
      
      // Parse the event
      if (typeof payload === 'string') {
        event = JSON.parse(payload);
      } else {
        event = payload;
      }
      
      this.logger.info('Received Stripe webhook event', { 
        event_id: event.id,
        event_type: event.type
      });
      
      // Find the appropriate handler
      const handler = this.eventHandlers[event.type];
      
      if (!handler) {
        this.logger.warn('No handler registered for event type', { event_type: event.type });
        res.status(200).send(`Unhandled event type: ${event.type}`);
        
        // Still log unhandled events
        await logWebhookToFMS(event, 'unhandled');
        return;
      }
      
      // Handle the event
      await handler(event.data.object, event);
      
      // Log successful processing
      await logWebhookToFMS(event, 'processed');
      
      success = true;
      res.status(200).send('Webhook processed successfully');
    } catch (error) {
      this.logger.error('Error processing webhook', { 
        error: error.message,
        event_id: event ? event.id : 'unknown',
        event_type: event ? event.type : 'unknown'
      });
      
      // Log failure to FMS
      if (event) {
        await logWebhookToFMS(event, 'failed', { error: error.message });
      }
      
      // Return 200 to prevent Stripe from retrying
      // We'll handle the retry logic ourselves if needed
      res.status(200).send('Webhook received, but processing failed');
    } finally {
      // Update metrics
      const latencyMs = Date.now() - startTime;
      
      if (event) {
        updateMetrics(event, success, latencyMs);
      }
    }
  }

  /**
   * Handles payment_intent.succeeded events
   * @param {Object} paymentIntent - Payment intent object
   * @param {Object} event - Full event object
   */
  async handlePaymentIntentSucceeded(paymentIntent, event) {
    this.logger.info('Processing payment_intent.succeeded event', { 
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
    
    try {
      // Update order status in e-commerce system
      if (paymentIntent.metadata && paymentIntent.metadata.order_id) {
        const orderService = require('../../utils/order-service');
        await orderService.updateOrderStatus(
          paymentIntent.metadata.order_id, 
          'paid',
          {
            payment_id: paymentIntent.id,
            payment_method: paymentIntent.payment_method_types[0],
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          }
        );
      }
      
      // Create invoice in Xero if applicable
      if (config.xero && config.xero.enabled) {
        const xeroInvoiceService = require('../../xero/services/InvoiceService');
        await xeroInvoiceService.createInvoiceFromPayment(paymentIntent);
      }
      
      // Grant product entitlements if applicable
      if (paymentIntent.metadata && paymentIntent.metadata.product_id) {
        const entitlementService = require('../../utils/entitlement-service');
        await entitlementService.grantEntitlement(
          paymentIntent.metadata.user_id,
          paymentIntent.metadata.product_id,
          {
            payment_id: paymentIntent.id,
            order_id: paymentIntent.metadata.order_id
          }
        );
      }
      
      // Send confirmation email to customer
      if (paymentIntent.receipt_email) {
        const emailService = require('../../utils/email-service');
        await emailService.sendPaymentConfirmation(
          paymentIntent.receipt_email,
          {
            payment_id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            date: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      this.logger.error('Error handling payment_intent.succeeded event', { 
        error: error.message,
        payment_intent_id: paymentIntent.id
      });
      
      // Re-throw to trigger retry logic
      throw error;
    }
  }

  /**
   * Handles payment_intent.payment_failed events
   * @param {Object} paymentIntent - Payment intent object
   * @param {Object} event - Full event object
   */
  async handlePaymentIntentFailed(paymentIntent, event) {
    this.logger.info('Processing payment_intent.payment_failed event', { 
      payment_intent_id: paymentIntent.id,
      error: paymentIntent.last_payment_error
    });
    
    try {
      // Update order status in e-commerce system
      if (paymentIntent.metadata && paymentIntent.metadata.order_id) {
        const orderService = require('../../utils/order-service');
        await orderService.updateOrderStatus(
          paymentIntent.metadata.order_id, 
          'payment_failed',
          {
            payment_id: paymentIntent.id,
            error: paymentIntent.last_payment_error
              ? paymentIntent.

