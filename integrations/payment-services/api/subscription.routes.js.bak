/**
 * @fileoverview Subscription API routes for the ASOOS payment services integration.
 * Exposes RESTful endpoints for subscription management operations.
 * 
 * @copyright Aixtiv Symphony Orchestrating Operating System
 * @version 1.0.1
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { rateLimit } = require('express-rate-limit');

// Import services
const SubscriptionService = require('../stripe/services/SubscriptionService');
const subscriptionService = new SubscriptionService();

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

// Apply rate limiting to subscription routes
const subscriptionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many subscription requests from this IP, please try again after 15 minutes',
  keyGenerator: (req) => {
    // Use user ID if available, otherwise use IP
    return req.user?.id || req.ip;
  }
});

router.use(subscriptionRateLimiter);

/**
 * @route POST /api/subscriptions
 * @desc Create a subscription
 * @access Private
 */
router.post(
  '/',
  [
    // Validate request body
    body('customer').isString().withMessage('Customer ID is required'),
    body('items').isArray().withMessage('Subscription items are required'),
    body('items.*.price').isString().withMessage('Price ID is required for each item'),
    body('items.*.quantity').isInt({ min: 1 }).optional().withMessage('Quantity must be a positive integer'),
    body('trial_period_days').isInt({ min: 0 }).optional().withMessage('Trial period days must be a non-negative integer'),
    body('trial_end').isInt().optional().withMessage('Trial end timestamp must be a Unix timestamp'),
    body('metadata').isObject().optional().withMessage('Metadata must be an object'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('subscription_admin') && !req.user.roles.includes('subscription_manager')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to create subscription' 
        });
      }

      const subscriptionData = {
        customer: req.body.customer,
        items: req.body.items,
        trial_period_days: req.body.trial_period_days,
        trial_end: req.body.trial_end,
        coupon: req.body.coupon,
        promotion_code: req.body.promotion_code,
        payment_behavior: req.body.payment_behavior,
        proration_behavior: req.body.proration_behavior,
        payment_method: req.body.payment_method,
        collection_method: req.body.collection_method,
        days_until_due: req.body.days_until_due,
        metadata: {
          ...req.body.metadata,
          created_by: req.user.id,
          created_at: new Date().toISOString()
        },
        user_id: req.body.user_id,
        order_id: req.body.order_id
      };

      const subscription = await subscriptionService.createSubscription(subscriptionData);

      res.status(201).json({
        success: true,
        data: {
          subscription_id: subscription.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          customer: subscription.customer,
          items: subscription.items.data.map(item => ({
            id: item.id,
            price: item.price.id,
            product: item.price.product,
            quantity: item.quantity
          })),
          latest_invoice: subscription.latest_invoice ? {
            id: subscription.latest_invoice.id,
            status: subscription.latest_invoice.status,
            payment_intent: subscription.latest_invoice.payment_intent ? {
              id: subscription.latest_invoice.payment_intent.id,
              status: subscription.latest_invoice.payment_intent.status,
              client_secret: subscription.latest_invoice.payment_intent.client_secret
            } : null
          } : null
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/subscriptions/:id
 * @desc Get a subscription by ID
 * @access Private
 */
router.get(
  '/:id',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Subscription ID must be a string'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('subscription_admin') && 
          !req.user.roles.includes('subscription_manager') && 
          !req.user.roles.includes('subscription_viewer')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to view subscription' 
        });
      }

      const subscription = await subscriptionService.getSubscription(req.params.id);

      // Additional access control - only allow users to view their own subscriptions unless admin
      if (!req.user.roles.includes('subscription_admin') && 
          subscription.metadata && 
          subscription.metadata.user_id && 
          subscription.metadata.user_id !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to view this subscription' 
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: subscription.id,
          status: subscription.status,
          customer: subscription.customer,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at,
          items: subscription.items.data.map(item => ({
            id: item.id,
            price: item.price.id,
            product: item.price.product,
            quantity: item.quantity
          })),
          default_payment_method: subscription.default_payment_method,
          latest_invoice: subscription.latest_invoice,
          metadata: subscription.metadata
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/subscriptions/customer/:customerId
 * @desc List subscriptions for a customer
 * @access Private
 */
router.get(
  '/customer/:customerId',
  [
    // Validate URL parameters
    param('customerId').isString().withMessage('Customer ID must be a string'),
    // Validate query parameters
    query('limit').isInt({ min: 1, max: 100 }).optional().withMessage('Limit must be between 1 and 100'),
    query('status').isString().optional().withMessage('Status must be a string'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('subscription_admin') && 
          !req.user.roles.includes('subscription_manager') && 
          !req.user.roles.includes('subscription_viewer')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to list customer subscriptions' 
        });
      }

      const options = {
        limit: req.query.limit ? parseInt(req.query.limit) : 10,
        status: req.query.status
      };

      const subscriptions = await subscriptionService.listCustomerSubscriptions(req.params.customerId, options);

      res.status(200).json({
        success: true,
        data: subscriptions.map(subscription => ({
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          items: subscription.items.data.map(item => ({
            id: item.id,
            price: item.price.id,
            product: item.price.product,
            quantity: item.quantity
          }))
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/subscriptions/:id/update
 * @desc Update a subscription
 * @access Private
 */
router.post(
  '/:id/update',
  [
    // Validate URL parameters
    param('id').isString().withMessage('Subscription ID must be a string'),
    // Validate request body
    body('trial_end').isInt().optional().withMessage('Trial end timestamp must be a Unix timestamp'),
    body('cancel_at_period_end').isBoolean().optional().withMessage('Cancel at period end must be a boolean'),
    body('proration_behavior').isString().optional().withMessage('Proration behavior must be a string'),
    body('payment_method').isString().optional().withMessage('Payment method must be a string'),
    body('metadata').isObject().optional().withMessage('Metadata must be an object'),
    validateRequest
  ],
  async (req, res, next) => {
    try {
      // Check required roles/permissions
      if (!req.user.roles.includes('subscription_admin') && !req.user.roles.includes('subscription_manager')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions to update subscription' 
        });
      }

      // Get current subscription to check permissions
      const currentSubscription = await subscriptionService.getSubscription(req.params.id);
      
      // Additional access control - only allow users to update their own subscriptions unless admin
      if (!req.user.roles.includes('subscription_admin') && 
          currentSubscription.metadata && 
          currentSubscription.metadata.user_id && 
          currentSubscription.metadata.user_i

