/**
 * @fileoverview Stripe payment intent service for ASOOS.
 * Manages payment intent lifecycle, status changes, refunds, and disputes.
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
const logger = createLogger('payment-intent-service', loggingConfig);

// Initialize metrics
const metrics = {
  paymentIntentCount: null,
  paymentIntentSucceeded: null,
  paymentIntentFailed: null,
  refundCount: null,
  disputeCount: null,
  operationLatency: null
};

/**
 * Initializes metrics for monitoring payment intent operations
 */
function initializeMetrics(metricsRegistry) {
  if (!metricsRegistry || !monitoringConfig.enabled) return;

  metrics.paymentIntentCount = metricsRegistry.createCounter(
    monitoringConfig.metrics.stripe.paymentIntentCreated.name,
    { description: monitoringConfig.metrics.stripe.paymentIntentCreated.description }
  );

  metrics.paymentIntentSucceeded = metricsRegistry.createCounter(
    monitoringConfig.metrics.stripe.paymentIntentSucceeded.name,
    { description: monitoringConfig.metrics.stripe.paymentIntentSucceeded.description }
  );

  metrics.paymentIntentFailed = metricsRegistry.createCounter(
    monitoringConfig.metrics.stripe.paymentIntentFailed.name,
    { description: monitoringConfig.metrics.stripe.paymentIntentFailed.description }
  );

  metrics.refundCount = metricsRegistry.createCounter(
    'payment_services.stripe.refund.count',
    { description: 'Count of refunds processed' }
  );

  metrics.disputeCount = metricsRegistry.createCounter(
    'payment_services.stripe.dispute.count',
    { description: 'Count of disputes handled' }
  );

  metrics.operationLatency = metricsRegistry.createHistogram(
    'payment_services.stripe.payment_intent.operation_latency',
    { 
      description: 'Latency of payment intent operations',
      boundaries: [50, 100, 250, 500, 1000, 2500, 5000]
    }
  );
}

/**
 * Logs payment intent event for audit purposes
 * @param {Object} paymentIntent - Payment intent details
 * @param {string} action - Action performed on payment intent
 * @param {Object} metadata - Additional metadata
 */
async function logPaymentIntentEvent(paymentIntent, action, metadata = {}) {
  try {
    // Log to local system
    logger.info('Payment intent event', {
      payment_intent_id: paymentIntent.id,
      timestamp: new Date().toISOString(),
      action: action,
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      payment_method: paymentIntent.payment_method,
      customer: paymentIntent.customer,
      metadata: {
        ...paymentIntent.metadata,
        ...metadata
      }
    });

    // Log to FMS if enabled
    if (loggingConfig.fms && loggingConfig.fms.enabled) {
      const fmsClient = require('../../../utils/fms-client');
      await fmsClient.logPaymentEvent({
        event_type: `payment_intent.${action}`,
        transaction_id: paymentIntent.id,
        timestamp: new Date().toISOString(),
        service: 'stripe',
        payment_method: paymentIntent.payment_method_types?.[0] || 'unknown',
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        customer_id: paymentIntent.customer,
        metadata: {
          ...paymentIntent.metadata,
          ...metadata
        }
      });
    }
  } catch (error) {
    logger.error('Failed to log payment intent event', { 
      error: error.message, 
      payment_intent_id: paymentIntent.id 
    });
  }
}

/**
 * Updates metrics for payment intent operations
 * @param {string} operation - Operation type
 * @param {Object} paymentIntent - Payment intent details
 * @param {boolean} success - Whether operation was successful
 * @param {number} latencyMs - Operation latency in milliseconds
 */
function updateMetrics(operation, paymentIntent, success, latencyMs) {
  if (!monitoringConfig.enabled) return;

  try {
    // Update relevant counter based on operation type
    switch (operation) {
      case 'create':
        metrics.paymentIntentCount.add(1, { 
          status: paymentIntent.status,
          payment_method: paymentIntent.payment_method_types?.[0] || 'unknown'
        });
        break;
      case 'succeed':
        metrics.paymentIntentSucceeded.add(1, { 
          payment_method: paymentIntent.payment_method_types?.[0] || 'unknown',
          currency: paymentIntent.currency
        });
        break;
      case 'fail':
        metrics.paymentIntentFailed.add(1, { 
          payment_method: paymentIntent.payment_method_types?.[0] || 'unknown',
          currency: paymentIntent.currency,
          error_code: paymentIntent.last_payment_error?.code || 'unknown'
        });
        break;
      case 'refund':
        metrics.refundCount.add(1, {
          status: success ? 'succeeded' : 'failed',
          currency: paymentIntent.currency
        });
        break;
      case 'dispute':
        metrics.disputeCount.add(1, {
          status: success ? 'succeeded' : 'failed'
        });
        break;
    }

    // Update operation latency
    metrics.operationLatency.record(latencyMs, {
      operation: operation,
      payment_method: paymentIntent.payment_method_types?.[0] || 'unknown',
      status: success ? 'success' : 'failed'
    });
  } catch (error) {
    logger.error('Failed to update payment intent metrics', { error: error.message });
  }
}

/**
 * Stripe Payment Intent Service
 */
class PaymentIntentService {
  /**
   * Creates a new instance of the PaymentIntentService
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
      
      // Configure payment intent based on capture method
      if (paymentData.capture_method) {
        paymentIntentParams.capture_method = paymentData.capture_method;
      }
      
      // Configure setup future usage if needed
      if (paymentData.setup_future_usage) {
        paymentIntentParams.setup_future_usage = paymentData.setup_future_usage;
      }
      
      // Create the payment intent
      const paymentIntent = await this.stripeClient.paymentIntents.create(paymentIntentParams);
      
      // Log the event
      await logPaymentIntentEvent(paymentIntent, 'created', { 
        order_id: paymentData.order_id,
        user_id: paymentData.user_id
      });
      
      success = true;
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('create', paymentIntent, success, latencyMs);
      
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_data: paymentData
      });
      
      throw error;
    }
  }
  
  /**
   * Retrieves a payment intent by ID
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} - Retrieved payment intent
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      this.logger.info('Retrieving payment intent', { payment_intent_id: paymentIntentId });
      
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(paymentIntentId);
      
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to retrieve payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntentId
      });
      
      throw error;
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
      this.logger.info('Confirming payment intent', { 
        payment_intent_id: paymentIntentId,
        options: confirmOptions
      });
      
      const paymentIntent = await this.stripeClient.paymentIntents.confirm(
        paymentIntentId,
        confirmOptions
      );
      
      // Log the event
      await logPaymentIntentEvent(paymentIntent, 'confirmed', confirmOptions);
      
      success = true;
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics(paymentIntent.status === 'succeeded' ? 'succeed' : 'create', paymentIntent, success, latencyMs);
      
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to confirm payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntentId,
        confirm_options: confirmOptions
      });
      
      throw error;
    }
  }
  
  /**
   * Captures a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} captureOptions - Capture options
   * @returns {Promise<Object>} - Captured payment intent
   */
  async capturePaymentIntent(paymentIntentId, captureOptions = {}) {
    const startTime = Date.now();
    let success = false;
    
    try {
      this.logger.info('Capturing payment intent', { 
        payment_intent_id: paymentIntentId,
        options: captureOptions
      });
      
      const paymentIntent = await this.stripeClient.paymentIntents.capture(
        paymentIntentId,
        captureOptions
      );
      
      // Log the event
      await logPaymentIntentEvent(paymentIntent, 'captured', captureOptions);
      
      success = true;
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('succeed', paymentIntent, success, latencyMs);
      
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to capture payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntentId,
        capture_options: captureOptions
      });
      
      throw error;
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
      this.logger.info('Cancelling payment intent', { 
        payment_intent_id: paymentIntentId,
        options: cancelOptions
      });
      
      const paymentIntent = await this.stripeClient.paymentIntents.cancel(
        paymentIntentId,
        cancelOptions
      );
      
      // Log the event
      await logPaymentIntentEvent(paymentIntent, 'cancelled', cancelOptions);
      
      success = true;
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('fail', paymentIntent, success, latencyMs);
      
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to cancel payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntentId,
        cancel_options: cancelOptions
      });
      
      throw error;
    }
  }
  
  /**
   * Updates a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} - Updated payment intent
   */
  async updatePaymentIntent(paymentIntentId, updateData) {
    const startTime = Date.now();
    let success = false;
    
    try {
      this.logger.info('Updating payment intent', { 
        payment_intent_id: paymentIntentId,
        update_data: updateData
      });
      
      const paymentIntent = await this.stripeClient.paymentIntents.update(
        paymentIntentId,
        updateData
      );
      
      // Log the event
      await logPaymentIntentEvent(paymentIntent, 'updated', updateData);
      
      success = true;
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('create', paymentIntent, success, latencyMs);
      
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to update payment intent', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntentId,
        update_data: updateData
      });
      
      throw error;
    }
  }
  
  /**
   * Creates a refund
   * @param {Object} refundData - Refund data
   * @returns {Promise<Object>} - Created refund
   */
  async createRefund(refundData) {
    const startTime = Date.now();
    let success = false;
    let paymentIntent = null;
    
    try {
      this.logger.info('Creating refund', { 
        payment_intent_id: refundData.payment_intent,
        amount: refundData.amount,
        reason: refundData.reason
      });
      
      // Create the refund
      const refund = await this.stripeClient.refunds.create({
        payment_intent: refundData.payment_intent,
        amount: refundData.amount,
        reason: refundData.reason || 'requested_by_customer',
        metadata: {
          order_id: refundData.order_id,
          user_id: refundData.user_id,
          ...refundData.metadata
        },
        refund_application_fee: refundData.refund_application_fee || false,
        reverse_transfer: refundData.reverse_transfer || false
      });
      
      // Get payment intent details for logging and metrics
      paymentIntent = await this.stripeClient.paymentIntents.retrieve(refundData.payment_intent);
      
      // Log the event
      await logPaymentIntentEvent(paymentIntent, 'refunded', { 
        refund_id: refund.id,
        amount: refund.amount / 100,
        reason: refund.reason
      });
      
      // Update order status if applicable
      if (refundData.order_id) {
        const orderService = require('../../../utils/order-service');
        await orderService.updateOrderStatus(
          refundData.order_id,
          'refunded',
          {
            refund_id: refund.id,
            payment_intent_id: refundData.payment_intent,
            amount: refund.amount,
            reason: refund.reason
          }
        );
      }
      
      // Create credit note in Xero if applicable
      if (config.xero && config.xero.enabled) {
        try {
          const xeroInvoiceService = require('../../../xero/services/InvoiceService');
          await xeroInvoiceService.createCreditNoteFromRefund(refund, paymentIntent);
        } catch (xeroError) {
          this.logger.error('Failed to create Xero credit note for refund', {
            error: xeroError.message,
            refund_id: refund.id
          });
          // Don't throw, allow refund to succeed even if Xero integration fails
        }
      }
      
      success = true;
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      updateMetrics('refund', paymentIntent, success, latencyMs);
      
      return refund;
    } catch (error) {
      // Log error
      this.logger.error('Failed to create refund', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: refundData.payment_intent,
        refund_data: refundData
      });
      
      if (paymentIntent) {
        // Update metrics for failed refund
        const latencyMs = Date.now() - startTime;
        updateMetrics('refund', paymentIntent, false, latencyMs);
      }
      
      throw error;
    }
  }
  
  /**
   * Retrieves a refund by ID
   * @param {string} refundId - Refund ID
   * @returns {Promise<Object>} - Retrieved refund
   */
  async getRefund(refundId) {
    try {
      this.logger.info('Retrieving refund', { refund_id: refundId });
      
      const refund = await this.stripeClient.refunds.retrieve(refundId);
      
      return refund;
    } catch (error) {
      // Log error
      this.logger.error('Failed to retrieve refund', { 
        error: error.message, 
        error_code: error.code,
        refund_id: refundId
      });
      
      throw error;
    }
  }
  
  /**
   * Processes a dispute
   * @param {Object} dispute - Dispute object
   * @returns {Promise<Object>} - Processed dispute
   */
  async processDispute(dispute) {
    const startTime = Date.now();
    let success = false;
    let paymentIntent = null;
    
    try {
      this.logger.info('Processing dispute', { 
        dispute_id: dispute.id,
        payment_intent_id: dispute.payment_intent,
        status: dispute.status,
        amount: dispute.amount
      });
      
      // Get payment intent details for the dispute
      if (dispute.payment_intent) {
        paymentIntent = await this.stripeClient.paymentIntents.retrieve(dispute.payment_intent);
      }
      
      // Update order status if applicable
      if (paymentIntent && paymentIntent.metadata && paymentIntent.metadata.order_id) {
        const orderService = require('../../../utils/order-service');
        await orderService.updateOrderStatus(
          paymentIntent.metadata.order_id,
          'disputed',
          {
            dispute_id: dispute.id,
            payment_intent_id: dispute.payment_intent,
            amount: dispute.amount,
            reason: dispute.reason
          }
        );
      }
      
      // Log the dispute event
      if (paymentIntent) {
        await logPaymentIntentEvent(paymentIntent, 'disputed', { 
          dispute_id: dispute.id,
          status: dispute.status,
          reason: dispute.reason
        });
      }
      
      // Create notification for the dispute
      const notificationService = require('../../../utils/notification-service');
      await notificationService.createNotification({
        type: 'dispute',
        severity: 'high',
        title: `New payment dispute: ${dispute.id}`,
        message: `A payment dispute has been created for payment ${dispute.payment_intent}. Amount: ${dispute.amount / 100} ${dispute.currency}`,
        metadata: {
          dispute_id: dispute.id,
          payment_intent_id: dispute.payment_intent,
          amount: dispute.amount,
          reason: dispute.reason,
          status: dispute.status,
          evidence_due_by: dispute.evidence_details?.due_by
        }
      });
      
      success = true;
      
      // Update metrics
      if (paymentIntent) {
        const latencyMs = Date.now() - startTime;
        updateMetrics('dispute', paymentIntent, success, latencyMs);
      }
      
      return dispute;
    } catch (error) {
      // Log error
      this.logger.error('Failed to process dispute', { 
        error: error.message, 
        error_code: error.code,
        dispute_id: dispute.id,
        payment_intent_id: dispute.payment_intent
      });
      
      if (paymentIntent) {
        // Update metrics for failed dispute handling
        const latencyMs = Date.now() - startTime;
        updateMetrics('dispute', paymentIntent, false, latencyMs);
      }
      
      throw error;
    }
  }
  
  /**
   * Updates dispute evidence
   * @param {string} disputeId - Dispute ID
   * @param {Object} evidenceData - Evidence data
   * @returns {Promise<Object>} - Updated dispute
   */
  async updateDisputeEvidence(disputeId, evidenceData) {
    try {
      this.logger.info('Updating dispute evidence', { 
        dispute_id: disputeId,
        evidence_fields: Object.keys(evidenceData)
      });
      
      const dispute = await this.stripeClient.disputes.update(
        disputeId,
        { evidence: evidenceData }
      );
      
      this.logger.info('Dispute evidence updated successfully', { 
        dispute_id: disputeId,
        status: dispute.status
      });
      
      return dispute;
    } catch (error) {
      // Log error
      this.logger.error('Failed to update dispute evidence', { 
        error: error.message, 
        error_code: error.code,
        dispute_id: disputeId,
        evidence_data: evidenceData
      });
      
      throw error;
    }
  }
  
  /**
   * Submits a dispute
   * @param {string} disputeId - Dispute ID
   * @returns {Promise<Object>} - Submitted dispute
   */
  async submitDispute(disputeId) {
    try {
      this.logger.info('Submitting dispute', { dispute_id: disputeId });
      
      const dispute = await this.stripeClient.disputes.submit(disputeId);
      
      this.logger.info('Dispute submitted successfully', { 
        dispute_id: disputeId,
        status: dispute.status
      });
      
      return dispute;
    } catch (error) {
      // Log error
      this.logger.error('Failed to submit dispute', { 
        error: error.message, 
        error_code: error.code,
        dispute_id: disputeId
      });
      
      throw error;
    }
  }
  
  /**
   * Handles a payment intent status change event
   * @param {Object} paymentIntent - Payment intent object
   * @param {string} status - New status
   * @returns {Promise<Object>} - Processed payment intent
   */
  async handlePaymentIntentStatusChange(paymentIntent, status) {
    const startTime = Date.now();
    let success = false;
    
    try {
      this.logger.info('Handling payment intent status change', { 
        payment_intent_id: paymentIntent.id,
        status: status,
        previous_status: paymentIntent.status
      });
      
      // Update order status if applicable
      if (paymentIntent.metadata && paymentIntent.metadata.order_id) {
        const orderService = require('../../../utils/order-service');
        
        let orderStatus;
        switch (status) {
          case 'succeeded':
            orderStatus = 'paid';
            break;
          case 'canceled':
            orderStatus = 'payment_canceled';
            break;
          case 'requires_payment_method':
            orderStatus = 'payment_failed';
            break;
          default:
            orderStatus = 'processing';
        }
        
        await orderService.updateOrderStatus(
          paymentIntent.metadata.order_id,
          orderStatus,
          {
            payment_intent_id: paymentIntent.id,
            payment_method: paymentIntent.payment_method_types?.[0] || 'unknown',
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          }
        );
      }
      
      // Grant product entitlements if payment succeeded and there's a product ID
      if (status === 'succeeded' && paymentIntent.metadata && paymentIntent.metadata.product_id) {
        const entitlementService = require('../../../utils/entitlement-service');
        await entitlementService.grantEntitlement(
          paymentIntent.metadata.user_id,
          paymentIntent.metadata.product_id,
          {
            payment_id: paymentIntent.id,
            order_id: paymentIntent.metadata.order_id
          }
        );
      }
      
      // Log the status change event
      await logPaymentIntentEvent(paymentIntent, status, { 
        previous_status: paymentIntent.status
      });
      
      // Update appropriate metrics based on status
      success = true;
      const latencyMs = Date.now() - startTime;
      
      if (status === 'succeeded') {
        updateMetrics('succeed', paymentIntent, success, latencyMs);
      } else if (status === 'requires_payment_method') {
        updateMetrics('fail', paymentIntent, success, latencyMs);
      } else {
        updateMetrics('create', paymentIntent, success, latencyMs);
      }
      
      return paymentIntent;
    } catch (error) {
      // Log error
      this.logger.error('Failed to handle payment intent status change', { 
        error: error.message, 
        error_code: error.code,
        payment_intent_id: paymentIntent.id,
        status: status
      });
      
      throw error;
    }
  }
  
  /**
   * Gets a health check for the payment intent service
   * @returns {Promise<Object>} - Health status
   */
  async healthCheck() {
    try {
      // Simple health check - try to list recent payment intents
      const paymentIntents = await this.stripeClient.paymentIntents.list({
        limit: 1
      });
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          has_payment_intents: paymentIntents.data.length > 0,
          stripe_api_version: this.stripeClient._api.version
        }
      };
    } catch (error) {
      this.logger.error('Payment intent service health check failed', { 
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

module.exports = PaymentIntentService;

