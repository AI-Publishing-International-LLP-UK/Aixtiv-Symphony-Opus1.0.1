/**
 * @fileoverview Payment API routes for the ASOOS payment services integration.
 * Exposes RESTful endpoints for payment processing operations.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { rateLimit } = require('express-rate-limit');

// Import services
const PaymentService = require('../stripe/services/PaymentIntentService');
const paymentService = new PaymentService();

// Import middleware
const { authenticateSallyPort } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { setSecurityHeaders } = require('../../middleware/security');
const { errorHandler } = require('../../middleware/error');
const { logRequest } = require('../../middleware/logging');

// Create router
const router = express.Router();

// Apply middleware to all routes
router.use(setSecurityHeaders);
router.use(logRequest);
router.use(authenticateSallyPort);

// Apply rate limiting to payment routes
const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many payment requests from this IP, please try again after 15 minutes',
  keyGenerator: (req) => {
    // Use user ID if available, otherwise use IP
    return req.user?.id || req.ip;
  }
});

router.use(paymentRateLimiter);

/**
 * @route POST /api/payments
 * @desc Create a payment intent
 * @access Private
 */
router.post(
  '/',
  [
    // Validate request body
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    body('customer_id').isString().optional().withMessage('Customer ID must be a string'),
    body('payment_methods').isArray().optional().withMessage('Payment methods must be an array'),
    body('description').isString().optional().withMessage('Description must be a string'),
    body('metadata').isObject().optional().withMessage('Metadata must be an object'),
    body('receipt_email').isEmail().optional().withMessage('Receipt email must be a valid email'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('payment_processor')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to create payment intent' 
        });
      }

      const paymentData = {
        amount: req.body.amount,
        currency: req.body.currency,
        customer_id: req.body.customer_id,
        payment_methods: req.body.payment_methods,
        description: req.body.description,
        metadata: {
          ...req.body.metadata,
          created_by: req.user.id,
          created_at: new Date().toISOString()
        },
        receipt_email: req.body.receipt_email,
        order_id: req.body.order_id,
        product_id: req.body.product_id,
        user_id: req.body.user_id,
        capture_method: req.body.capture_method,
        setup_future_usage: req.body.setup_future_usage,
        connected_account: req.body.connected_account
      };

      const paymentIntent = await paymentService.createPaymentIntent(paymentData);

      res.status(201).json({
        success: true,
        data: {
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/payments/:id
 * @desc Get a payment intent by ID
 * @access Private
 */
router.get(
  '/:id',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Payment intent ID must be a string'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && 
          !req.user.roles.includes('payment_processor') && 
          !req.user.roles.includes('payment_viewer')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to view payment intent' 
        });
      }

      const paymentIntent = await paymentService.getPaymentIntent(req.params.id);

      // Additional access control - only allow users to view their own payments unless admin
      if (!req.user.roles.includes('payment_admin') && 
          paymentIntent.metadata && 
          paymentIntent.metadata.user_id && 
          paymentIntent.metadata.user_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to view this payment intent' 
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          payment_method: paymentIntent.payment_method,
          created: paymentIntent.created,
          customer: paymentIntent.customer,
          metadata: paymentIntent.metadata
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/payments/:id/confirm
 * @desc Confirm a payment intent
 * @access Private
 */
router.post(
  '/:id/confirm',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Payment intent ID must be a string'),
    // Validate request body
    body('payment_method').isString().optional().withMessage('Payment method must be a string'),
    body('return_url').isURL().optional().withMessage('Return URL must be a valid URL'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('payment_processor')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to confirm payment intent' 
        });
      }

      const confirmOptions = {
        payment_method: req.body.payment_method,
        return_url: req.body.return_url
      };

      const paymentIntent = await paymentService.confirmPaymentIntent(req.params.id, confirmOptions);

      res.status(200).json({
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          next_action: paymentIntent.next_action
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/payments/:id/capture
 * @desc Capture a payment intent
 * @access Private
 */
router.post(
  '/:id/capture',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Payment intent ID must be a string'),
    // Validate request body
    body('amount_to_capture').isInt({ min: 1 }).optional().withMessage('Amount to capture must be a positive integer'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('payment_processor')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to capture payment intent' 
        });
      }

      const captureOptions = {};
      if (req.body.amount_to_capture) {
        captureOptions.amount_to_capture = req.body.amount_to_capture;
      }

      const paymentIntent = await paymentService.capturePaymentIntent(req.params.id, captureOptions);

      res.status(200).json({
        success: true,
        data: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
          amount_capturable: paymentIntent.amount_capturable / 100,
          amount_received: paymentIntent.amount_received / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/payments/:id/cancel
 * @desc Cancel a payment intent
 * @access Private
 */
router.post(
  '/:id/cancel',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Payment intent ID must be a string'),
    // Validate request body
    body('cancellation_reason').isString().optional().withMessage('Cancellation reason must be a string'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('payment_processor')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to cancel payment intent' 
        });
      }

      const cancelOptions = {};
      if (req.body.cancellation_reason) {
        cancelOptions.cancellation_reason = req.body.cancellation_reason;
      }

      const paymentIntent = await paymentService.cancelPaymentIntent(req.params.id, cancelOptions);

      res.status(200).json({
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          cancellation_reason: paymentIntent.cancellation_reason
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/payments/:id/update
 * @desc Update a payment intent
 * @access Private
 */
router.post(
  '/:id/update',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Payment intent ID must be a string'),
    // Validate request body
    body('amount').isFloat({ min: 0.01 }).optional().withMessage('Amount must be a positive number'),
    body('currency').isString().isLength({ min: 3, max: 3 }).optional().withMessage('Currency must be a 3-letter code'),
    body('payment_method').isString().optional().withMessage('Payment method must be a string'),
    body('receipt_email').isEmail().optional().withMessage('Receipt email must be a valid email'),
    body('metadata').isObject().optional().withMessage('Metadata must be an object'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('payment_processor')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to update payment intent' 
        });
      }

      const updateData = {};
      
      if (req.body.amount) {
        updateData.amount = req.body.amount * 100; // Convert to cents
      }
      
      if (req.body.currency) {
        updateData.currency = req.body.currency;
      }
      
      if (req.body.payment_method) {
        updateData.payment_method = req.body.payment_method;
      }
      
      if (req.body.receipt_email) {
        updateData.receipt_email = req.body.receipt_email;
      }
      
      if (req.body.metadata) {
        updateData.metadata = {
          ...req.body.metadata,
          updated_by: req.user.id,
          updated_at: new Date().toISOString()
        };
      }

      const paymentIntent = await paymentService.updatePaymentIntent(req.params.id, updateData);

      res.status(200).json({
        success: true,
        data: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          payment_method: paymentIntent.payment_method,
          receipt_email: paymentIntent.receipt_email,
          metadata: paymentIntent.metadata
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/payments/refund
 * @desc Create a refund
 * @access Private
 */
router.post(
  '/refund',
  [
    // Validate request body
    body('payment_intent').isString().withMessage('Payment intent ID must be a string'),
    body('amount').isFloat({ min: 0.01 }).optional().withMessage('Amount must be a positive number'),
    body('reason').isIn(['duplicate', 'fraudulent', 'requested_by_customer']).optional()
      .withMessage('Reason must be one of: duplicate, fraudulent, requested_by_customer'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('refund_processor')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to create refund' 
        });
      }

      const refundData = {
        payment_intent: req.body.payment_intent,
        amount: req.body.amount ? req.body.amount * 100 : undefined, // Convert to cents if provided
        reason: req.body.reason,
        metadata: {
          ...req.body.metadata,
          refunded_by: req.user.id,
          refunded_at: new Date().toISOString()
        },
        order_id: req.body.order_id,
        user_id: req.body.user_id
      };

      const refund = await paymentService.createRefund(refundData);

      res.status(201).json({
        success: true,
        data: {
          id: refund.id,
          payment_intent: refund.payment_intent,
          amount: refund.amount / 100, // Convert from cents to dollars
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/payments/refund/:id
 * @desc Get a refund by ID
 * @access Private
 */
router.get(
  '/refund/:id',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Refund ID must be a string'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && 
          !req.user.roles.includes('refund_processor') && 
          !req.user.roles.includes('payment_viewer')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to view refund' 
        });
      }

      const refund = await paymentService.getRefund(req.params.id);

      res.status(200).json({
        success: true,
        data: {
          id: refund.id,
          payment_intent: refund.payment_intent,
          amount: refund.amount / 100, // Convert from cents to dollars
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
          created: refund.created,
          metadata: refund.metadata
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/payments/dispute/:id/evidence
 * @desc Update dispute evidence
 * @access Private
 */
router.post(
  '/dispute/:id/evidence',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Dispute ID must be a string'),
    // Validate request body
    body('evidence').isObject().withMessage('Evidence must be an object'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('dispute_handler')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to update dispute evidence' 
        });
      }

      const dispute = await paymentService.updateDisputeEvidence(req.params.id, req.body.evidence);

      res.status(200).json({
        success: true,
        data: {
          id: dispute.id,
          payment_intent: dispute.payment_intent,
          amount: dispute.amount / 100, // Convert from cents to dollars
          currency: dispute.currency,
          status: dispute.status,
          evidence: dispute.evidence
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/payments/dispute/:id/submit
 * @desc Submit a dispute
 * @access Private
 */
router.post(
  '/dispute/:id/submit',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Dispute ID must be a string'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('dispute_handler')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to submit dispute' 
        });
      }

      const dispute = await paymentService.submitDispute(req.params.id);

      res.status(200).json({
        success: true,
        data: {
          id: dispute.id,
          payment_intent: dispute.payment_intent,
          status: dispute.status
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/payments/health
 * @desc Health check endpoint
 * @access Private
 */
router.get(
  '/health',
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('payment_admin') && !req.user.roles.includes('system_monitor')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to check payment system health' 
        });
      }

      const healthStatus = await paymentService.healthCheck();

      if (healthStatus.status === 'healthy') {
        res.status(200).json({
          success: true,
          data: healthStatus
        });
      } else {
        res.status(503).json({
          success: false,
          data: healthStatus
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Apply error handling middleware
router.use(errorHandler);

module.exports = router;

