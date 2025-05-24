/**
 * @fileoverview Stripe subscription service for ASOOS.
 * Manages subscription creation, lifecycle, plan management, and billing operations.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const stripe = require('stripe');
const config = require('../../../config');
const stripeConfig = require('../../config/stripe.config');
const loggingConfig = require('../../../monitoring/logging.config');
const monitoringConfig = require('../../../monitoring/monitoring.config');
const { createLogger } = require('../../../utils/logger');

// Initialize the Stripe client
const stripeClient = stripe(stripeConfig.apiKey, {
  apiVersion: stripeConfig.apiVersion,
  maxNetworkRetries: stripeConfig.errorHandling.maxRetries,
  timeout: 30000, // 30 second timeout
});

// Initialize logger
const logger = createLogger('subscription-service', loggingConfig);

// Initialize metrics
const metrics = {
  subscriptionCount: null,
  subscriptionUpdates: null,
  subscriptionCancellations: null,
  invoiceCount: null,
  priceCreations: null,
  operationLatency: null
};

/**
 * Initializes metrics for monitoring subscription operations
 */
function initializeMetrics(metricsRegistry) {
  if (!metricsRegistry || !monitoringConfig.enabled) return;

  metrics.subscriptionCount = metricsRegistry.createCounter(
    'payment_services.stripe.subscription.count',
    { description: 'Count of Stripe subscriptions created' }
  );

  metrics.subscriptionUpdates = metricsRegistry.createCounter(
    'payment_services.stripe.subscription.updates',
    { description: 'Count of Stripe subscription updates' }
  );

  metrics.subscriptionCancellations = metricsRegistry.createCounter(
    'payment_services.stripe.subscription.cancellations',
    { description: 'Count of Stripe subscription cancellations' }
  );

  metrics.invoiceCount = metricsRegistry.createCounter(
    'payment_services.stripe.invoice.count',
    { description: 'Count of Stripe invoices processed' }
  );

  metrics.priceCreations = metricsRegistry.createCounter(
    'payment_services.stripe.price.creations',
    { description: 'Count of Stripe prices created' }
  );

  metrics.operationLatency = metricsRegistry.createHistogram(
    'payment_services.stripe.subscription.operation_latency',
    { 
      description: 'Latency of Stripe subscription operations',
      boundaries: [50, 100, 250, 500, 1000, 2500, 5000]
    }
  );
}

/**
 * Logs subscription event for audit purposes
 * @param {Object} subscription - Subscription details
 * @param {string} action - Action performed on subscription
 * @param {Object} metadata - Additional metadata
 */
async function logSubscriptionEvent(subscription, action, metadata = {}) {
  try {
    // Log to local system
    logger.info('Subscription event', {
      subscription_id: subscription.id,
      timestamp: new Date().toISOString(),
      action: action,
      customer_id: subscription.customer,
      plan: subscription.items?.data?.[0]?.price?.id || 'unknown',
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: {
        ...subscription.metadata,
        ...metadata
      }
    });

    // Log to FMS if enabled
    if (loggingConfig.fms && loggingConfig.fms.enabled) {
      const fmsClient = require('../../../utils/fms-client');
      await fmsClient.logSubscriptionEvent({
        event_type: `subscription.${action}`,
        subscription_id: subscription.id,
        timestamp: new Date().toISOString(),
        customer_id: subscription.customer,
        plan: subscription.items?.data?.[0]?.price?.id || 'unknown',
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: {
          ...subscription.metadata,
          ...metadata
        }
      });
    }
  } catch (error) {
    logger.error('Failed to log subscription event', { 
      error: error.message, 
      subscription_id: subscription.id 
    });
  }
}

/**
 * Updates metrics for subscription operations
 * @param {string} operation - Operation type
 * @param {Object} subscription - Subscription details
 * @param {number} latencyMs - Operation latency in milliseconds
 */
function updateMetrics(operation, subscription, latencyMs) {
  if (!monitoringConfig.enabled) return;

  try {
    // Update relevant counter based on operation type
    switch (operation) {
      case 'create':
        metrics.subscriptionCount.add(1, { 
          plan: subscription.items?.data?.[0]?.price?.id || 'unknown',
          status: subscription.status
        });
        break;
      case 'update':
        metrics.subscriptionUpdates.add(1, { 
          plan: subscription.items?.data?.[0]?.price?.id || 'unknown',
          status: subscription.status
        });
        break;
      case 'cancel':
        metrics.subscriptionCancellations.add(1, {
          plan: subscription.items?.data?.[0]?.price?.id || 'unknown',
          cancel_at_period_end: subscription.cancel_at_period_end ? 'true' : 'false'
        });
        break;
      case 'invoice':
        metrics.invoiceCount.add(1, {
          status: subscription.status
        });
        break;
      case 'price':
        metrics.priceCreations.add(1, {
          recurring: subscription.recurring ? 'true' : 'false'
        });
        break;
    }

    // Update operation latency
    metrics.operationLatency.record(latencyMs, {
      operation: operation,
      plan: subscription.items?.data?.[0]?.price?.id || 'unknown'
    });
  } catch (error) {
    logger.error('Failed to update subscription metrics', { error: error.message });
  }
}

/**
 * Stripe Subscription Service
 */
class SubscriptionService {
  /**
   * Creates a new instance of the SubscriptionService
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.metricsRegistry = options.metricsRegistry;
    
    // Initialize metrics if registry is provided
    if (this.metricsRegistry) {
      initializeMetrics(this.metricsRegistry);
    }
    
    this.stripeClient = stripeClient;
    this.logger = logger;
  }

  /**
   * Creates a subscription for a customer
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<Object>} - Created subscription
   */
  async createSubscription(subscriptionData) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Creating subscription', { 
        customer_id: subscriptionData.customer,
        plan: subscriptionData.items?.[0]?.price || 'unknown'
      });
      
      // Prepare subscription creation parameters
      const subscriptionParams = {
        customer: subscriptionData.customer,
        items: subscriptionData.items,
        metadata: {
          user_id: subscriptionData.user_id,
          order_id: subscriptionData.order_id,
          ...subscriptionData.metadata
        },
        expand: ['latest_invoice.payment_intent']
      };
      
      // Add optional parameters if provided
      if (subscriptionData.trial_period_days) {
        subscriptionParams.trial_period_days = subscriptionData.trial_period_days;
      } else if (subscriptionData.trial_end) {
        subscriptionParams.trial_end = subscriptionData.trial_end;
      }
      
      if (subscriptionData.coupon) {
        subscriptionParams.coupon = subscriptionData.coupon;
      }
      
      if (subscriptionData.promotion_code) {
        subscriptionParams.promotion_code = subscriptionData.promotion_code;
      }
      
      if (subscriptionData.payment_behavior) {
        subscriptionParams.payment_behavior = subscriptionData.payment_behavior;
      }
      
      if (subscriptionData.proration_behavior) {
        subscriptionParams.proration_behavior = subscriptionData.proration_behavior;
      }
      
      if (subscriptionData.payment_method) {
        subscriptionParams.default_payment_method = subscriptionData.payment_method;
      }
      
      if (subscriptionData.collection_method) {
        subscriptionParams.collection_method = subscriptionData.collection_method;
      }
      
      if (subscriptionData.days_until_due) {
        subscriptionParams.days_until_due = subscriptionData.days_until_due;
      }
      
      // Create the subscription
      const subscription = await this.stripeClient.subscriptions.create(subscriptionParams);
      
      // Log the event
      await logSubscriptionEvent(subscription, 'created', { 
        order_id: subscriptionData.order_id,
        user_id: subscriptionData.user_id
      });
      
      // Create invoice in Xero if applicable
      if (config.xero && config.xero.enabled && subscription.latest_invoice) {
        try {
          const xeroInvoiceService = require('../../../xero/services/InvoiceService');
          await xeroInvoiceService.createInvoiceFromSubscription(subscription);
        } catch (xeroError) {
          this.logger.error('Failed to create Xero invoice for subscription', {
            error: xeroError.message,
            subscription_id: subscription.id
          });
          // Don't throw, allow subscription to succeed even if Xero integration fails
        }
      }
      
      // Grant product entitlements if applicable
      if (subscriptionData.user_id && subscription.status === 'active') {
        try {
          const entitlementService = require('../../../utils/entitlement-service');
          await entitlementService.grantSubscriptionEntitlements(
            subscriptionData.user_id,
            subscription.id,
            subscription.items.data.map(item => item.price.product)
          );
        } catch (entitlementError) {
          this.logger.error('Failed to grant entitlements for subscription', {
            error: entitlementError.message,
            subscription_id: subscription.id,
            user_id: subscriptionData.user_id
          });
          // Don't throw, allow subscription to succeed even if entitlement granting fails
        }
      }
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('create', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_data: subscriptionData
      });
      
      throw error;
    }
  }

  /**
   * Retrieves a subscription by ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} - Retrieved subscription
   */
  async getSubscription(subscriptionId) {
    try {
      this.logger.info('Retrieving subscription', { subscription_id: subscriptionId });
      
      const subscription = await this.stripeClient.subscriptions.retrieve(subscriptionId);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to retrieve subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId
      });
      
      throw error;
    }
  }

  /**
   * Updates a subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} - Updated subscription
   */
  async updateSubscription(subscriptionId, updateData) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Updating subscription', { 
        subscription_id: subscriptionId,
        update_data: updateData
      });
      
      // Handle proration settings
      if (updateData.proration_behavior === undefined && updateData.items) {
        // Default to prorating changes by default
        updateData.proration_behavior = stripeConfig.subscriptions.prorationEnabled ? 'create_prorations' : 'none';
      }
      
      // Handle metadata merging
      if (updateData.metadata) {
        // Retrieve current subscription to merge metadata
        const currentSubscription = await this.stripeClient.subscriptions.retrieve(subscriptionId);
        updateData.metadata = {
          ...currentSubscription.metadata,
          ...updateData.metadata
        };
      }
      
      const subscription = await this.stripeClient.subscriptions.update(
        subscriptionId,
        updateData
      );
      
      // Log the event
      await logSubscriptionEvent(subscription, 'updated', updateData);
      
      // Update entitlements if plan changed
      if (updateData.items && updateData.user_id) {
        try {
          const entitlementService = require('../../../utils/entitlement-service');
          await entitlementService.updateSubscriptionEntitlements(
            updateData.user_id,
            subscription.id,
            subscription.items.data.map(item => item.price.product)
          );
        } catch (entitlementError) {
          this.logger.error('Failed to update entitlements for subscription', {
            error: entitlementError.message,
            subscription_id: subscription.id,
            user_id: updateData.user_id
          });
        }
      }
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('update', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to update subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId,
        update_data: updateData
      });
      
      throw error;
    }
  }

  /**
   * Cancels a subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} cancelOptions - Cancellation options
   * @returns {Promise<Object>} - Cancelled subscription
   */
  async cancelSubscription(subscriptionId, cancelOptions = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Cancelling subscription', { 
        subscription_id: subscriptionId,
        at_period_end: cancelOptions.at_period_end || false
      });
      
      let subscription;
      
      if (cancelOptions.at_period_end) {
        // Cancel at period end (update with cancel_at_period_end = true)
        subscription = await this.stripeClient.subscriptions.update(
          subscriptionId,
          { cancel_at_period_end: true }
        );
      } else {
        // Cancel immediately
        subscription = await this.stripeClient.subscriptions.del(
          subscriptionId,
          cancelOptions
        );
      }
      
      // Log the event
      await logSubscriptionEvent(subscription, 'cancelled', cancelOptions);
      
      // Revoke entitlements if subscription is fully cancelled (not at period end)
      if (!cancelOptions.at_period_end && subscription.metadata && subscription.metadata.user_id) {
        try {
          const entitlementService = require('../../../utils/entitlement-service');
          await entitlementService.revokeSubscriptionEntitlements(
            subscription.metadata.user_id,
            subscription.id
          );
        } catch (entitlementError) {
          this.logger.error('Failed to revoke entitlements for cancelled subscription', {
            error: entitlementError.message,
            subscription_id: subscription.id,
            user_id: subscription.metadata.user_id
          });
        }
      }
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('cancel', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to cancel subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId,
        cancel_options: cancelOptions
      });
      
      throw error;
    }
  }

  /**
   * Pauses a subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} pauseOptions - Pause options
   * @returns {Promise<Object>} - Paused subscription
   */
  async pauseSubscription(subscriptionId, pauseOptions = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Pausing subscription', { 
        subscription_id: subscriptionId,
        options: pauseOptions
      });
      
      const subscription = await this.stripeClient.subscriptions.update(
        subscriptionId,
        { 
          pause_collection: {
            behavior: pauseOptions.behavior || 'keep_as_draft',
            resumes_at: pauseOptions.resumes_at
          }
        }
      );
      
      // Log the event
      await logSubscriptionEvent(subscription, 'paused', pauseOptions);
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('update', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to pause subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId,
        pause_options: pauseOptions
      });
      
      throw error;
    }
  }

  /**
   * Resumes a paused subscription
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} - Resumed subscription
   */
  async resumeSubscription(subscriptionId) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Resuming subscription', { subscription_id: subscriptionId });
      
      const subscription = await this.stripeClient.subscriptions.update(
        subscriptionId,
        { pause_collection: null }
      );
      
      // Log the event
      await logSubscriptionEvent(subscription, 'resumed');
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('update', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to resume subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId
      });
      
      throw error;
    }
  }

  /**
   * Updates subscription items
   * @param {string} subscriptionId - Subscription ID
   * @param {Array} items - Subscription items to update
   * @param {Object} options - Update options
   * @returns {Promise<Object>} - Updated subscription
   */
  async updateSubscriptionItems(subscriptionId, items, options = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Updating subscription items', { 
        subscription_id: subscriptionId,
        items: items,
        options: options
      });
      
      // Get existing subscription
      const subscription = await this.stripeClient.subscriptions.retrieve(subscriptionId);
      
      // Build items array with proper structure
      const formattedItems = items.map(item => {
        if (item.id) {
          // Update existing item
          return {
            id: item.id,
            price: item.price,
            quantity: item.quantity || 1
          };
        } else {
          // Add new item
          return {
            price: item.price,
            quantity: item.quantity || 1
          };
        }
      });
      
      // Update subscription with new items
      const updatedSubscription = await this.stripeClient.subscriptions.update(
        subscriptionId,
        { 
          items: formattedItems,
          proration_behavior: options.proration_behavior || 
            (stripeConfig.subscriptions.prorationEnabled ? 'create_prorations' : 'none')
        }
      );
      
      // Log the event
      await logSubscriptionEvent(updatedSubscription, 'items_updated', { 
        items: formattedItems,
        options: options
      });
      
      // Update entitlements if user ID is available
      if (subscription.metadata && subscription.metadata.user_id) {
        try {
          const entitlementService = require('../../../utils/entitlement-service');
          await entitlementService.updateSubscriptionEntitlements(
            subscription.metadata.user_id,
            subscription.id,
            updatedSubscription.items.data.map(item => item.price.product)
          );
        } catch (entitlementError) {
          this.logger.error('Failed to update entitlements for subscription items update', {
            error: entitlementError.message,
            subscription_id: subscription.id,
            user_id: subscription.metadata.user_id
          });
        }
      }
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('update', updatedSubscription, latencyMs);
      
      return updatedSubscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to update subscription items', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId,
        items: items
      });
      
      throw error;
    }
  }

  /**
   * Creates a product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} - Created product
   */
  async createProduct(productData) {
    try {
      this.logger.info('Creating product', { 
        name: productData.name,
        active: productData.active !== false
      });
      
      const product = await this.stripeClient.products.create({
        name: productData.name,
        description: productData.description,
        active: productData.active !== false,
        metadata: productData.metadata || {},
        statement_descriptor: productData.statement_descriptor,
        unit_label: productData.unit_label,
        images: productData.images,
        tax_code: productData.tax_code
      });
      
      this.logger.info('Product created successfully', { 
        product_id: product.id,
        name: product.name
      });
      
      return product;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create product', { 
        error: error.message, 
        error_code: error.code,
        product_data: productData
      });
      
      throw error;
    }
  }

  /**
   * Creates a price
   * @param {Object} priceData - Price data
   * @returns {Promise<Object>} - Created price
   */
  async createPrice(priceData) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Creating price', { 
        product: priceData.product,
        unit_amount: priceData.unit_amount,
        currency: priceData.currency
      });
      
      const price = await this.stripeClient.prices.create({
        product: priceData.product,
        unit_amount: priceData.unit_amount,
        currency: priceData.currency || stripeConfig.products.defaultCurrency,
        recurring: priceData.recurring,
        nickname: priceData.nickname,
        active: priceData.active !== false,
        metadata: priceData.metadata || {},
        tax_behavior: priceData.tax_behavior,
        tiers: priceData.tiers,
        tiers_mode: priceData.tiers_mode,
        billing_scheme: priceData.billing_scheme || 'per_unit',
        transfer_lookup_key: priceData.transfer_lookup_key,
        transform_quantity: priceData.transform_quantity
      });
      
      this.logger.info('Price created successfully', { 
        price_id: price.id,
        product: price.product,
        unit_amount: price.unit_amount,
        currency: price.currency
      });
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('price', price, latencyMs);
      
      return price;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create price', { 
        error: error.message, 
        error_code: error.code,
        price_data: priceData
      });
      
      throw error;
    }
  }

  /**
   * Lists products
   * @param {Object} options - List options
   * @returns {Promise<Array>} - List of products
   */
  async listProducts(options = {}) {
    try {
      this.logger.info('Listing products', { options: options });
      
      const products = await this.stripeClient.products.list({
        active: options.active,
        limit: options.limit || 100,
        starting_after: options.starting_after,
        ending_before: options.ending_before,
      });
      
      return products.data;
    } catch (error) {
      // Log error
      this.logger.error('Failed to list products', { 
        error: error.message, 
        error_code: error.code,
        options: options
      });
      
      throw error;
    }
  }

  /**
   * Lists prices
   * @param {Object} options - List options
   * @returns {Promise<Array>} - List of prices
   */
  async listPrices(options = {}) {
    try {
      this.logger.info('Listing prices', { options: options });
      
      const prices = await this.stripeClient.prices.list({
        active: options.active,
        product: options.product,
        currency: options.currency,
        type: options.type || 'recurring',
        limit: options.limit || 100,
        starting_after: options.starting_after,
        ending_before: options.ending_before,
      });
      
      return prices.data;
    } catch (error) {
      // Log error
      this.logger.error('Failed to list prices', { 
        error: error.message, 
        error_code: error.code,
        options: options
      });
      
      throw error;
    }
  }

  /**
   * Lists a customer's subscriptions
   * @param {string} customerId - Customer ID
   * @param {Object} options - List options
   * @returns {Promise<Array>} - List of subscriptions
   */
  async listCustomerSubscriptions(customerId, options = {}) {
    try {
      this.logger.info('Listing customer subscriptions', { 
        customer_id: customerId,
        options: options
      });
      
      const subscriptions = await this.stripeClient.subscriptions.list({
        customer: customerId,
        limit: options.limit || 10,
        status: options.status || 'all'
      });
      
      return subscriptions.data;
    } catch (error) {
      // Log error
      this.logger.error('Failed to list customer subscriptions', { 
        error: error.message, 
        error_code: error.code,
        customer_id: customerId
      });
      
      throw error;
    }
  }

  /**
   * Retrieves an invoice by ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} - Retrieved invoice
   */
  async getInvoice(invoiceId) {
    try {
      this.logger.info('Retrieving invoice', { invoice_id: invoiceId });
      
      const invoice = await this.stripeClient.invoices.retrieve(invoiceId);
      
      return invoice;
    } catch (error) {
      // Log error
      this.logger.error('Failed to retrieve invoice', { 
        error: error.message, 
        error_code: error.code,
        invoice_id: invoiceId
      });
      
      throw error;
    }
  }

  /**
   * Pays an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} payOptions - Payment options
   * @returns {Promise<Object>} - Paid invoice
   */
  async payInvoice(invoiceId, payOptions = {}) {
    try {
      this.logger.info('Paying invoice', { invoice_id: invoiceId });
      
      const invoice = await this.stripeClient.invoices.pay(
        invoiceId,
        payOptions
      );
      
      this.logger.info('Invoice paid successfully', { 
        invoice_id: invoiceId,
        amount_paid: invoice.amount_paid,
        status: invoice.status
      });
      
      return invoice;
    } catch (error) {
      // Log error
      this.logger.error('Failed to pay invoice', { 
        error: error.message, 
        error_code: error.code,
        invoice_id: invoiceId
      });
      
      throw error;
    }
  }

  /**
   * Creates an upcoming invoice preview
   * @param {string} customerId - Customer ID
   * @param {Object} options - Preview options
   * @returns {Promise<Object>} - Upcoming invoice
   */
  async createUpcomingInvoice(customerId, options = {}) {
    try {
      this.logger.info('Creating upcoming invoice preview', { 
        customer_id: customerId,
        options: options
      });
      
      const upcomingInvoice = await this.stripeClient.invoices.retrieveUpcoming({
        customer: customerId,
        ...options
      });
      
      return upcomingInvoice;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create upcoming invoice preview', { 
        error: error.message, 
        error_code: error.code,
        customer_id: customerId
      });
      
      throw error;
    }
  }

  /**
   * Processes a subscription invoice event
   * @param {Object} invoice - Invoice object
   * @param {string} eventType - Event type
   */
  async processInvoiceEvent(invoice, eventType) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Processing invoice event', { 
        invoice_id: invoice.id,
        event_type: eventType,
        subscription_id: invoice.subscription
      });
      
      // Create invoice in Xero if applicable
      if (config.xero && config.xero.enabled && event

/**
 * @fileoverview Stripe subscription service for ASOOS.
 * Manages subscription lifecycle, updates, cancellations, and invoice processing.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const stripe = require('stripe');
const config = require('../../../config');
const stripeConfig = require('../../config/stripe.config');
const loggingConfig = require('../../../monitoring/logging.config');
const monitoringConfig = require('../../../monitoring/monitoring.config');
const { createLogger } = require('../../../utils/logger');

// Initialize the Stripe client
const stripeClient = stripe(stripeConfig.apiKey, {
  apiVersion: stripeConfig.apiVersion,
  maxNetworkRetries: stripeConfig.errorHandling.maxRetries,
  timeout: 30000, // 30 second timeout
});

// Initialize logger
const logger = createLogger('subscription-service', loggingConfig);

// Initialize metrics
const metrics = {
  subscriptionCount: null,
  subscriptionUpdates: null,
  subscriptionCancellations: null,
  invoiceCount: null,
  operationLatency: null
};

/**
 * Initializes metrics for monitoring subscription operations
 */
function initializeMetrics(metricsRegistry) {
  if (!metricsRegistry || !monitoringConfig.enabled) return;

  metrics.subscriptionCount = metricsRegistry.createCounter(
    'payment_services.stripe.subscription.count',
    { description: 'Count of Stripe subscriptions created' }
  );

  metrics.subscriptionUpdates = metricsRegistry.createCounter(
    'payment_services.stripe.subscription.updates',
    { description: 'Count of Stripe subscription updates' }
  );

  metrics.subscriptionCancellations = metricsRegistry.createCounter(
    'payment_services.stripe.subscription.cancellations',
    { description: 'Count of Stripe subscription cancellations' }
  );

  metrics.invoiceCount = metricsRegistry.createCounter(
    'payment_services.stripe.invoice.count',
    { description: 'Count of Stripe invoices created' }
  );

  metrics.operationLatency = metricsRegistry.createHistogram(
    'payment_services.stripe.subscription.operation_latency',
    { 
      description: 'Latency of Stripe subscription operations',
      boundaries: [50, 100, 250, 500, 1000, 2500, 5000]
    }
  );
}

/**
 * Logs subscription event for audit purposes
 * @param {Object} subscription - Subscription details
 * @param {string} action - Action performed on subscription
 * @param {Object} metadata - Additional metadata
 */
async function logSubscriptionEvent(subscription, action, metadata = {}) {
  try {
    // Log to local system
    logger.info('Subscription event', {
      subscription_id: subscription.id,
      timestamp: new Date().toISOString(),
      action: action,
      customer_id: subscription.customer,
      plan: subscription.items?.data?.[0]?.plan?.id || 'unknown',
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: {
        ...subscription.metadata,
        ...metadata
      }
    });

    // Log to FMS if enabled
    if (loggingConfig.fms && loggingConfig.fms.enabled) {
      const fmsClient = require('../../../utils/fms-client');
      await fmsClient.logSubscriptionEvent({
        event_type: `subscription.${action}`,
        subscription_id: subscription.id,
        timestamp: new Date().toISOString(),
        customer_id: subscription.customer,
        plan: subscription.items?.data?.[0]?.plan?.id || 'unknown',
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: {
          ...subscription.metadata,
          ...metadata
        }
      });
    }
  } catch (error) {
    logger.error('Failed to log subscription event', { 
      error: error.message, 
      subscription_id: subscription.id 
    });
  }
}

/**
 * Updates metrics for subscription operations
 * @param {string} operation - Operation type
 * @param {Object} subscription - Subscription details
 * @param {number} latencyMs - Operation latency in milliseconds
 */
function updateMetrics(operation, subscription, latencyMs) {
  if (!monitoringConfig.enabled) return;

  try {
    // Update relevant counter based on operation type
    switch (operation) {
      case 'create':
        metrics.subscriptionCount.add(1, { 
          plan: subscription.items?.data?.[0]?.plan?.id || 'unknown',
          status: subscription.status
        });
        break;
      case 'update':
        metrics.subscriptionUpdates.add(1, { 
          plan: subscription.items?.data?.[0]?.plan?.id || 'unknown',
          status: subscription.status
        });
        break;
      case 'cancel':
        metrics.subscriptionCancellations.add(1, {
          plan: subscription.items?.data?.[0]?.plan?.id || 'unknown',
          cancel_at_period_end: subscription.cancel_at_period_end ? 'true' : 'false'
        });
        break;
      case 'invoice':
        metrics.invoiceCount.add(1, {
          status: subscription.status
        });
        break;
    }

    // Update operation latency
    metrics.operationLatency.record(latencyMs, {
      operation: operation,
      plan: subscription.items?.data?.[0]?.plan?.id || 'unknown'
    });
  } catch (error) {
    logger.error('Failed to update subscription metrics', { error: error.message });
  }
}

/**
 * Stripe Subscription Service
 */
class SubscriptionService {
  /**
   * Creates a new instance of the SubscriptionService
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.metricsRegistry = options.metricsRegistry;
    
    // Initialize metrics if registry is provided
    if (this.metricsRegistry) {
      initializeMetrics(this.metricsRegistry);
    }
    
    this.stripeClient = stripeClient;
    this.logger = logger;
  }

  /**
   * Creates a subscription for a customer
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<Object>} - Created subscription
   */
  async createSubscription(subscriptionData) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Creating subscription', { 
        customer_id: subscriptionData.customer,
        plan: subscriptionData.items?.[0]?.price || 'unknown'
      });
      
      // Prepare subscription creation parameters
      const subscriptionParams = {
        customer: subscriptionData.customer,
        items: subscriptionData.items,
        metadata: {
          user_id: subscriptionData.user_id,
          order_id: subscriptionData.order_id,
          ...subscriptionData.metadata
        },
        expand: ['latest_invoice.payment_intent']
      };
      
      // Add optional parameters if provided
      if (subscriptionData.trial_period_days) {
        subscriptionParams.trial_period_days = subscriptionData.trial_period_days;
      }
      
      if (subscriptionData.coupon) {
        subscriptionParams.coupon = subscriptionData.coupon;
      }
      
      if (subscriptionData.payment_behavior) {
        subscriptionParams.payment_behavior = subscriptionData.payment_behavior;
      }
      
      if (subscriptionData.proration_behavior) {
        subscriptionParams.proration_behavior = subscriptionData.proration_behavior;
      }
      
      // Create the subscription
      const subscription = await this.stripeClient.subscriptions.create(subscriptionParams);
      
      // Log the event
      await logSubscriptionEvent(subscription, 'created', { 
        order_id: subscriptionData.order_id
      });
      
      // Create invoice in Xero if applicable
      if (config.xero && config.xero.enabled && subscription.latest_invoice) {
        const xeroInvoiceService = require('../../../xero/services/InvoiceService');
        await xeroInvoiceService.createInvoiceFromSubscription(subscription);
      }
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('create', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_data: subscriptionData
      });
      
      throw error;
    }
  }

  /**
   * Retrieves a subscription by ID
   * @param {string} subscriptionId - Subscription ID
   * @returns {Promise<Object>} - Retrieved subscription
   */
  async getSubscription(subscriptionId) {
    try {
      this.logger.info('Retrieving subscription', { subscription_id: subscriptionId });
      
      const subscription = await this.stripeClient.subscriptions.retrieve(subscriptionId);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to retrieve subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId
      });
      
      throw error;
    }
  }

  /**
   * Updates a subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} - Updated subscription
   */
  async updateSubscription(subscriptionId, updateData) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Updating subscription', { 
        subscription_id: subscriptionId,
        update_data: updateData
      });
      
      const subscription = await this.stripeClient.subscriptions.update(
        subscriptionId,
        updateData
      );
      
      // Log the event
      await logSubscriptionEvent(subscription, 'updated', updateData);
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('update', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to update subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId,
        update_data: updateData
      });
      
      throw error;
    }
  }

  /**
   * Cancels a subscription
   * @param {string} subscriptionId - Subscription ID
   * @param {Object} cancelOptions - Cancellation options
   * @returns {Promise<Object>} - Cancelled subscription
   */
  async cancelSubscription(subscriptionId, cancelOptions = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Cancelling subscription', { 
        subscription_id: subscriptionId,
        at_period_end: cancelOptions.at_period_end || false
      });
      
      const subscription = await this.stripeClient.subscriptions.del(
        subscriptionId,
        { at_period_end: cancelOptions.at_period_end || false }
      );
      
      // Log the event
      await logSubscriptionEvent(subscription, 'cancelled', cancelOptions);
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('cancel', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to cancel subscription', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId,
        cancel_options: cancelOptions
      });
      
      throw error;
    }
  }

  /**
   * Updates subscription items
   * @param {string} subscriptionId - Subscription ID
   * @param {Array} items - Subscription items to update
   * @returns {Promise<Object>} - Updated subscription
   */
  async updateSubscriptionItems(subscriptionId, items) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Updating subscription items', { 
        subscription_id: subscriptionId,
        items: items
      });
      
      // Get existing subscription
      const subscription = await this.stripeClient.subscriptions.retrieve(subscriptionId);
      
      // Build items array with proper structure
      const formattedItems = items.map(item => {
        if (item.id) {
          // Update existing item
          return {
            id: item.id,
            price: item.price,
            quantity: item.quantity || 1
          };
        } else {
          // Add new item
          return {
            price: item.price,
            quantity: item.quantity || 1
          };
        }
      });
      
      // Update subscription with new items
      const updatedSubscription = await this.stripeClient.subscriptions.update(
        subscriptionId,
        { items: formattedItems }
      );
      
      // Log the event
      await logSubscriptionEvent(updatedSubscription, 'items_updated', { items: formattedItems });
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('update', updatedSubscription, latencyMs);
      
      return updatedSubscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to update subscription items', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscriptionId,
        items: items
      });
      
      throw error;
    }
  }

  /**
   * Lists a customer's subscriptions
   * @param {string} customerId - Customer ID
   * @param {Object} options - List options
   * @returns {Promise<Array>} - List of subscriptions
   */
  async listCustomerSubscriptions(customerId, options = {}) {
    try {
      this.logger.info('Listing customer subscriptions', { 
        customer_id: customerId,
        options: options
      });
      
      const subscriptions = await this.stripeClient.subscriptions.list({
        customer: customerId,
        limit: options.limit || 10,
        status: options.status || 'all'
      });
      
      return subscriptions.data;
    } catch (error) {
      // Log error
      this.logger.error('Failed to list customer subscriptions', { 
        error: error.message, 
        error_code: error.code,
        customer_id: customerId
      });
      
      throw error;
    }
  }

  /**
   * Retrieves an invoice by ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} - Retrieved invoice
   */
  async getInvoice(invoiceId) {
    try {
      this.logger.info('Retrieving invoice', { invoice_id: invoiceId });
      
      const invoice = await this.stripeClient.invoices.retrieve(invoiceId);
      
      return invoice;
    } catch (error) {
      // Log error
      this.logger.error('Failed to retrieve invoice', { 
        error: error.message, 
        error_code: error.code,
        invoice_id: invoiceId
      });
      
      throw error;
    }
  }

  /**
   * Pays an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} payOptions - Payment options
   * @returns {Promise<Object>} - Paid invoice
   */
  async payInvoice(invoiceId, payOptions = {}) {
    try {
      this.logger.info('Paying invoice', { invoice_id: invoiceId });
      
      const invoice = await this.stripeClient.invoices.pay(
        invoiceId,
        payOptions
      );
      
      this.logger.info('Invoice paid successfully', { 
        invoice_id: invoiceId,
        amount_paid: invoice.amount_paid,
        status: invoice.status
      });
      
      return invoice;
    } catch (error) {
      // Log error
      this.logger.error('Failed to pay invoice', { 
        error: error.message, 
        error_code: error.code,
        invoice_id: invoiceId
      });
      
      throw error;
    }
  }

  /**
   * Creates an upcoming invoice preview
   * @param {string} customerId - Customer ID
   * @param {Object} options - Preview options
   * @returns {Promise<Object>} - Upcoming invoice
   */
  async createUpcomingInvoice(customerId, options = {}) {
    try {
      this.logger.info('Creating upcoming invoice preview', { 
        customer_id: customerId,
        options: options
      });
      
      const upcomingInvoice = await this.stripeClient.invoices.retrieveUpcoming({
        customer: customerId,
        ...options
      });
      
      return upcomingInvoice;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create upcoming invoice preview', { 
        error: error.message, 
        error_code: error.code,
        customer_id: customerId
      });
      
      throw error;
    }
  }

  /**
   * Processes a subscription invoice event
   * @param {Object} invoice - Invoice object
   * @param {string} eventType - Event type
   */
  async processInvoiceEvent(invoice, eventType) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Processing invoice event', { 
        invoice_id: invoice.id,
        event_type: eventType,
        subscription_id: invoice.subscription
      });
      
      // Create invoice in Xero if applicable
      if (config.xero && config.xero.enabled && eventType === 'invoice.paid') {
        const xeroInvoiceService = require('../../../xero/services/InvoiceService');
        await xeroInvoiceService.createInvoiceFromStripeInvoice(invoice);
      }
      
      // Get subscription details
      const subscription = await this.stripeClient.subscriptions.retrieve(invoice.subscription);
      
      // Log subscription invoice event
      await logSubscriptionEvent(subscription, `invoice_${eventType.split('.')[1]}`, { 
        invoice_id: invoice.id,
        amount_paid: invoice.amount_paid,
        status: invoice.status
      });
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('invoice', subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to process invoice event', { 
        error: error.message, 
        error_code: error.code,
        invoice_id: invoice.id,
        event_type: eventType
      });
      
      throw error;
    }
  }

  /**
   * Handles subscription status change events
   * @param {Object} subscription - Subscription object
   * @param {string} eventType - Event type
   */
  async handleSubscriptionStatusChange(subscription, eventType) {
    const startTime = Date.now();
    
    try {
      this.logger.info('Handling subscription status change', { 
        subscription_id: subscription.id,
        event_type: eventType,
        status: subscription.status
      });
      
      // Update user entitlements based on subscription status
      const entitlementService = require('../../../utils/entitlement-service');
      
      if (eventType === 'customer.subscription.created' || 
          eventType === 'customer.subscription.updated' && subscription.status === 'active') {
        // Grant entitlements
        await entitlementService.grantSubscriptionEntitlements(
          subscription.metadata.user_id,
          subscription.id,
          subscription.items.data.map(item => item.price.product)
        );
      } else if (eventType === 'customer.subscription.deleted' || 
                (eventType === 'customer.subscription.updated' && subscription.status === 'canceled')) {
        // Revoke entitlements
        await entitlementService.revokeSubscriptionEntitlements(
          subscription.metadata.user_id,
          subscription.id
        );
      }
      
      // Log subscription status change
      await logSubscriptionEvent(subscription, eventType.split('.')[2], { 
        event_type: eventType
      });
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics(eventType.split('.')[2], subscription, latencyMs);
      
      return subscription;
    } catch (error) {
      // Log error
      this.logger.error('Failed to handle subscription status change', { 
        error: error.message, 
        error_code: error.code,
        subscription_id: subscription.id,
        event_type: eventType
      });
      
      throw error;
    }
  }
}

module.exports = SubscriptionService;

