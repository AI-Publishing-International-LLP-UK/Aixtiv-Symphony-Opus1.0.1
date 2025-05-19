/**
 * Professional Connection Controller for Aixtiv Symphony
 * Production implementation for connection API endpoints
 */

const express = require('express');
const router = express.Router();
const logger = require('../services/common/logger');
const connections = require('../services/connections/professional-connections');
const authorization = require('../services/authorization/user-authorization');
const { authenticateRequest } = require('../middleware/authentication');

// Middleware to authenticate all routes in this controller
router.use(authenticateRequest);

/**
 * @api {post} /connections/request Request a professional connection
 * @apiName RequestConnection
 * @apiGroup Connections
 */
router.post('/request', async (req, res) => {
  try {
    const { subscriberUuid, connectionType, connectionValue, metadata } =
      req.body;

    // Validate required fields
    if (!subscriberUuid || !connectionType || !connectionValue) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // The requestor is the authenticated user
    const requestorUuid = req.user.uuid;

    // Process the connection request
    const result = await authorization.processConnectionRequest(
      subscriberUuid,
      {
        type: connectionType,
        value: connectionValue,
        requestorUuid,
        metadata,
      }
    );

    return res.status(201).json(result);
  } catch (error) {
    logger.error(`Connection request error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @api {post} /connections/:connectionId/approve Approve a connection request
 * @apiName ApproveConnection
 * @apiGroup Connections
 */
router.post('/:connectionId/approve', async (req, res) => {
  try {
    const { connectionId } = req.params;

    // The approver is the authenticated user
    const approverUuid = req.user.uuid;

    // Approve the connection
    const result = await connections.approveConnection(
      connectionId,
      approverUuid
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Connection approval error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @api {post} /connections/:connectionId/reject Reject a connection request
 * @apiName RejectConnection
 * @apiGroup Connections
 */
router.post('/:connectionId/reject', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { reason } = req.body;

    // The rejecter is the authenticated user
    const rejecterUuid = req.user.uuid;

    // Reject the connection
    const result = await connections.rejectConnection(
      connectionId,
      rejecterUuid,
      reason
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Connection rejection error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @api {get} /connections/list List connections for a subscriber
 * @apiName ListConnections
 * @apiGroup Connections
 */
router.get('/list', async (req, res) => {
  try {
    const { subscriberUuid, status, type } = req.query;

    // Validate required fields
    if (!subscriberUuid) {
      return res.status(400).json({
        success: false,
        message: 'Missing subscriberUuid parameter',
      });
    }

    // Build options object
    const options = {};
    if (status) options.status = status;
    if (type) options.type = type;

    // List connections
    const connectionsList = await connections.listConnections(
      subscriberUuid,
      options
    );

    return res.status(200).json({
      success: true,
      connections: connectionsList,
    });
  } catch (error) {
    logger.error(`Connection listing error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @api {post} /connections/authorize Authorize API team for connections
 * @apiName AuthorizeApiTeam
 * @apiGroup Connections
 */
router.post('/authorize', async (req, res) => {
  try {
    const { subscriberUuid, apiTeamUuid, connectionTypes } = req.body;

    // Validate required fields
    if (
      !subscriberUuid ||
      !apiTeamUuid ||
      !connectionTypes ||
      !Array.isArray(connectionTypes)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Authorize API team
    const result = await authorization.authorizeApiTeamConnections(
      subscriberUuid,
      apiTeamUuid,
      connectionTypes
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`API team authorization error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @api {get} /connections/authorizations Get subscriber authorizations
 * @apiName GetAuthorizations
 * @apiGroup Connections
 */
router.get('/authorizations', async (req, res) => {
  try {
    const { subscriberUuid } = req.query;

    // Validate required fields
    if (!subscriberUuid) {
      return res.status(400).json({
        success: false,
        message: 'Missing subscriberUuid parameter',
      });
    }

    // Get authorizations
    const authDetails =
      await authorization.getSubscriberAuthorizations(subscriberUuid);

    return res.status(200).json({
      success: true,
      ...authDetails,
    });
  } catch (error) {
    logger.error(`Authorization retrieval error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * @api {post} /connections/invite Invite user to collaborate
 * @apiName InviteUser
 * @apiGroup Connections
 */
router.post('/invite', async (req, res) => {
  try {
    const { subscriberUuid, userEmail, permissions, message } = req.body;

    // Validate required fields
    if (
      !subscriberUuid ||
      !userEmail ||
      !permissions ||
      !Array.isArray(permissions)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // The inviter is the authenticated user
    const inviterUuid = req.user.uuid;

    // Send invitation
    const result = await authorization.inviteUser(
      subscriberUuid,
      inviterUuid,
      userEmail,
      permissions,
      message || 'You have been invited to collaborate'
    );

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`User invitation error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
