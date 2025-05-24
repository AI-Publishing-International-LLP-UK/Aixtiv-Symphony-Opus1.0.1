/**
 * @fileoverview Core Stripe payment processing service for ASOOS.
 * Provides centralized functionality for payment operations, validation, and lifecycle management.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const stripe = require('stripe');
const config = require('../../config');
const stripeConfig = require('../config/stripe.config');
const loggingConfig = require('../../monitoring/logging.config');
const monitoringConfig = require('../../monitoring/monitoring.config');
const { createLogger } = require('../../utils/logger');

// Initialize the Stripe client
const stripeClient = stripe(stripeConfig.apiKey, {
  apiVersion: stripeConfig.apiVersion,
  maxNetworkRetries: stripeConfig.errorHandling.maxRetries,
  timeout: 30000, // 30 second timeout
});

// Initialize logger
const logger = createLogger('payment-service', loggingConfig);

// Initialize metrics
const metrics = {
  transactionCount: null,
  transactionValue: null,
  transactionLatency: null,
  errorRate: null,
  successRate: null,
};

/**
 * Initializes metrics for monitoring payment processing
 */
function initializeMetrics(metricsRegistry) {
  if (!metricsRegistry || !monitoringConfig.enabled) return;

  metrics.transactionCount = metricsRegistry.createCounter(
    monitoringConfig.metrics.payments.transactionCount.name,
    { description: monitoringConfig.metrics.payments.transactionCount.description }
  );

  metrics.transactionValue = metricsRegistry.createCounter(
    monitoringConfig.metrics.payments.transactionValue.name,
    { description: monitoringConfig.metrics.payments.transactionValue.description }
  );

  metrics.transactionLatency = metricsRegistry.createHistogram(
    monitoringConfig.metrics.payments.transactionLatency.name,
    { 
      description: monitoringConfig.metrics.payments.transactionLatency.description,
      boundaries: monitoringConfig.metrics.payments.transactionLatency.buckets
    }
  );

  metrics.errorRate = metricsRegistry.createGauge(
    monitoringConfig.metrics.payments.errorRate.name,
    { description: monitoringConfig.metrics.payments.errorRate.description }
  );

  metrics.successRate = metricsRegistry.createGauge(
    monitoringConfig.metrics.payments.successRate.name,
    { description: monitoringConfig.metrics.payments.successRate.description }
  );
}

/**
 * Logs payment transaction for audit purposes
 * @param {Object} transaction - Transaction details
 * @param {string} status - Transaction status
 * @param {Object} metadata - Additional metadata
 */
async function logTransaction(transaction, status, metadata = {}) {
  try {
    // Log to local system
    logger.info('Payment transaction', {
      transaction_id: transaction.id,
      timestamp: new Date().toISOString(),
      service: 'stripe',
      payment_method: transaction.payment_method_types?.[0] || 'unknown',
      amount: transaction.amount / 100, // Convert from cents to dollars
      currency: transaction.currency,
      status: status,
      customer_id: transaction.customer,
      metadata: metadata
    });

    // Log to FMS if enabled
    if (loggingConfig.fms && loggingConfig.fms.enabled) {
      const fmsClient = require('../../utils/fms-client');
      await fmsClient.logPaymentEvent({
        event_type: `payment.${status}`,
        transaction_id: transaction.id,
        timestamp: new Date().toISOString(),
        service: 'stripe',
        payment_method: transaction.payment_method_types?.[0] || 'unknown',
        amount: transaction.amount / 100,
        currency: transaction.currency,
        status: status,
        customer_id: transaction.customer,
        metadata: metadata
      });
    }
  } catch (error) {
    logger.error('Failed to log payment transaction', { error: error.message, transaction_id: transaction.id });
  }
}

/**
 * Updates metrics based on transaction outcome
 * @param {Object} transaction - Transaction details
 * @param {boolean} success - Whether the transaction was successful
 * @param {number} latencyMs - Transaction processing latency in milliseconds
 */
function updateMetrics(transaction, success, latencyMs) {
  if (!monitoringConfig.enabled) return;

  try {
    // Update transaction count
    metrics.transactionCount.add(1, { 
      status: success ? 'success' : 'failed',
      payment_method: transaction.payment_method_types?.[0] || 'unknown',
      currency: transaction.currency
    });

    // Update transaction value (only for successful transactions)
    if (success) {
      metrics.transactionValue.add(transaction.amount / 100, { 
        payment_method: transaction.payment_method_types?.[0] || 'unknown',
        currency: transaction.currency
      });
    }

    // Update transaction latency
    metrics.transactionLatency.record(latencyMs, {
      payment_method: transaction.payment_method_types?.[0] || 'unknown',
      status: success ? 'success' : 'failed'
    });

    // Update success/error rates (these would typically be calculated from the counter metrics)
    // but we're setting them directly for simplicity
    const successRate = 0.95; // This would be dynamically calculated in production
    const errorRate = 0.05; // This would be dynamically calculated in production
    
    metrics.successRate.set(successRate);
    metrics.errorRate.set(errorRate);
  } catch (error) {
    logger.error('Failed to update payment metrics', { error: error.message });
  }
}

/**
 * Core Payment Service
 */
class PaymentService {
  /**
   * Creates a new instance of the PaymentService
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
   * Creates a payment intent
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Created payment intent
   */
  async createPaymentIntent(paymentData) {
    const startTime = Date.now();
    let success = false;
    
    try {
      this.logger.info('Creating payment intent', { 
        amount: paymentData.amount,
        currency: paymentData.currency,
        customer_id: paymentData.customer_id
      });
      
      const paymentIntentParams = {
        amount: paymentData.amount * 100, // Convert to cents
        currency: paymentData.currency || stripeConfig.products.defaultCurrency,
        payment_method_types: paymentData.payment_methods || stripeConfig.payments.supportedPaymentMethods,
        customer: paymentData.customer_id,
        description: paymentData.description || 'ASOOS Symphony Payment',
        metadata: {
          order_id: paymentData.order_id,
          product_id: paymentData.product_id,
          user_id: paymentData.user_id,
          ...paymentData.metadata
        },
        receipt_email: paymentData.receipt_email,
        statement_descriptor: stripeConfig.payments.statementDescriptor,
        statement_descriptor_suffix: stripeConfig.payments.statementDescriptorSuffix,
      };
      
      // Add application fee if using Stripe Connect
      if (stripeConfig.integration.connect.enabled && paymentData.connected_account) {
        paymentIntentParams.application_fee_amount = Math.round(paymentData.amount * 0.1 * 100); // 10% fee
        paymentIntentParams.transfer_data = {
          destination: paymentData.connected_account,
        };
      }
      
      const paymentIntent = await this.stripeClient.paymentIntents.create(paymentIntentParams);
      
      // Log successful transaction
      await logTransaction(paymentIntent, 'created', { order_id: paymentData.order_id });
      
      success = true;
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_data: paymentData
      });
      
      // Log failed transaction
      if (error.raw && error.raw.payment_intent) {
        await logTransaction(error.raw.payment_intent, 'failed', { 
          error: error.message,
          error_code: error.code
        });
      }
      
      throw error;
    } finally {
      // Update metrics
      const latencyMs = Date.now() - startTime;
      
      // Only update metrics if we have a payment intent (from success or error)
      if (success) {
        updateMetrics({ 
          amount: paymentData.amount * 100,
          currency: paymentData.currency || stripeConfig.products.defaultCurrency,
          payment_method_types: paymentData.payment_methods || stripeConfig.payments.supportedPaymentMethods
        }, success, latencyMs);
      }
    }
  }

  /**
   * Confirms a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} confirmOptions - Confirmation options
   * @returns {Promise<Object>} - Confirmed payment intent
   */
  async confirmPaymentIntent(paymentIntentId, confirmOptions = {}) {
    const startTime = Date.now();
    let success = false;
    
    try {
      this.logger.info('Confirming payment intent', { payment_intent_id: paymentIntentId });
      
      const paymentIntent = await this.stripeClient.paymentIntents.confirm(
        paymentIntentId,
        confirmOptions
      );
      
      // Log successful transaction
      await logTransaction(paymentIntent, 'confirmed');
      
      success = true;
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to confirm payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntentId
      });
      
      // Log failed transaction
      if (error.raw && error.raw.payment_intent) {
        await logTransaction(error.raw.payment_intent, 'confirmation_failed', { 
          error: error.message,
          error_code: error.code
        });
      }
      
      throw error;
    } finally {
      // Update metrics
      const latencyMs = Date.now() - startTime;
      
      try {
        // Get payment intent details for metrics
        const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentIntentId);
        updateMetrics(paymentIntent, success, latencyMs);
      } catch (error) {
        this.logger.error('Failed to update metrics for payment intent confirmation', { 
          error: error.message,
          payment_intent_id: paymentIntentId
        });
      }
    }
  }

  /**
   * Captures funds for an authorized payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} captureOptions - Capture options
   * @returns {Promise<Object>} - Captured payment intent
   */
  async capturePaymentIntent(paymentIntentId, captureOptions = {}) {
    const startTime = Date.now();
    let success = false;
    
    try {
      this.logger.info('Capturing payment intent', { payment_intent_id: paymentIntentId });
      
      const paymentIntent = await this.stripeClient.paymentIntents.capture(
        paymentIntentId,
        captureOptions
      );
      
      // Log successful transaction
      await logTransaction(paymentIntent, 'captured');
      
      success = true;
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to capture payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntentId
      });
      
      // Log failed transaction
      if (error.raw && error.raw.payment_intent) {
        await logTransaction(error.raw.payment_intent, 'capture_failed', { 
          error: error.message,
          error_code: error.code
        });
      }
      
      throw error;
    } finally {
      // Update metrics
      const latencyMs = Date.now() - startTime;
      
      try {
        // Get payment intent details for metrics
        const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentIntentId);
        updateMetrics(paymentIntent, success, latencyMs);
      } catch (error) {
        this.logger.error('Failed to update metrics for payment intent capture', { 
          error: error.message,
          payment_intent_id: paymentIntentId
        });
      }
    }
  }

  /**
   * Cancels a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} cancelOptions - Cancellation options
   * @returns {Promise<Object>} - Cancelled payment intent
   */
  async cancelPaymentIntent(paymentIntentId, cancelOptions = {}) {
    const startTime = Date.now();
    let success = false;
    
    try {
      this.logger.info('Cancelling payment intent', { payment_intent_id: paymentIntentId });
      
      const paymentIntent = await this.stripeClient.paymentIntents.cancel(
        paymentIntentId,
        cancelOptions
      );
      
      // Log successful transaction
      await logTransaction(paymentIntent, 'cancelled', cancelOptions);
      
      success = true;
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to cancel payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntentId
      });
      
      throw error;
    } finally {
      // Update metrics
      const latencyMs = Date.now() - startTime;
      
      try {
        // Get payment intent details for metrics
        const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentIntentId);
        updateMetrics(paymentIntent, success, latencyMs);
      } catch (error) {
        this.logger.error('Failed to update metrics for payment intent cancellation', { 
          error: error.message,
          payment_intent_id: paymentIntentId
        });
      }
    }
  }

  /**
   * Creates a customer in Stripe
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} - Created customer
   */
  async createCustomer(customerData) {
    try {
      this.logger.info('Creating Stripe customer', { 
        email: customerData.email,
        name: customerData.name
      });
      
      const customer = await this.stripeClient.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        address: customerData.address,
        description: customerData.description || 'ASOOS Symphony Customer',
        metadata: {
          user_id: customerData.user_id,
          ...customerData.metadata
        }
      });
      
      this.logger.info('Stripe customer created successfully', { customer_id: customer.id });
      
      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer', { 
        error: error.message, 
        error_code: error.code,
        customer_data: customerData
      });
      
      throw error;
    }
  }

  /**
   * Attaches a payment method to a customer
   * @param {string} paymentMethodId - Payment method ID
   * @param {string} customerId - Customer ID
   * @returns {Promise<Object>} - Attached payment method
   */
  async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      this.logger.info('Attaching payment method to customer', { 
        payment_method_id: paymentMethodId,
        customer_id: customerId
      });
      
      const paymentMethod = await this.stripeClient.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId }
      );
      
      this.logger.info('Payment method attached successfully', { 
        payment_method_id: paymentMethodId,
        customer_id: customerId
      });
      
      return paymentMethod;
    } catch (error) {
      this.logger.error('Failed to attach payment method to customer', { 
        error: error.message, 
        error_code: error.code,
        payment_method_id: paymentMethodId,
        customer_id: customerId
      });
      
      throw error;
    }
  }

  /**
   * Gets a health check for the Stripe service
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      // Simple health check - try to retrieve account info
      const account = await this.stripeClient.account.retrieve();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          account_id: account.id,
          business_profile: account.business_profile ? account.business_profile.name : null,
          capabilities: account.capabilities
        }
      };
    } catch (error) {
      this.logger.error('Stripe health check failed', { 
        error: error.message, 
        error_code: error.code
      });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        error_code: error.code
      };
    }
  }
}

module.exports = PaymentService;

