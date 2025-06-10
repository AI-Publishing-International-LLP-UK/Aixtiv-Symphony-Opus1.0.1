/**
 * User Authorization Service for Aixtiv Symphony
 * Production implementation for subscriber authorization management
 */

const { Firestore } = require('@google-cloud/firestore');
const logger = require('../common/logger');
const sallyport = require('../sallyport/sallyport-client');
const connections = require('../connections/professional-connections');

// Initialize Firestore
const firestore = new Firestore();

/**
 * Permission types for authorization
 */
const PermissionTypes = {
  ADMIN: 'admin',
  EDIT: 'edit',
  VIEW: 'view',
  PUBLISH: 'publish',
  MANAGE_USERS: 'manage_users',
  MANAGE_INTEGRATIONS: 'manage_integrations',
  ANALYTICS: 'analytics',
  CONNECTION_APPROVAL: 'connection_approval',
};

/**
 * Invite a user to collaborate with subscriber
 * @param {string} subscriberUuid - UUID of the subscriber
 * @param {string} inviterUuid - UUID of the user sending invitation
 * @param {string} userEmail - Email of the user to invite
 * @param {Array<string>} permissions - Permissions to grant
 * @param {string} message - Custom invitation message
 * @returns {Promise<Object>} Result of the invitation
 */
async function inviteUser(
  subscriberUuid,
  inviterUuid,
  userEmail,
  permissions,
  message
) {
  try {
    logger.info(
      `Inviting user ${userEmail} to collaborate with subscriber ${subscriberUuid}`
    );

    // Check if inviter has permission to invite users
    const permissionCheck = await sallyport.verifyPermissions(
      inviterUuid,
      'subscriber:' + subscriberUuid,
      ['users:invite']
    );

    if (!permissionCheck.authorized) {
      logger.warn(`Unauthorized invitation attempt by ${inviterUuid}`);
      throw new Error('Not authorized to invite users for this subscriber');
    }

    // Create invitation through SallyPort
    const invitation = await sallyport.sendInvitation(
      inviterUuid,
      userEmail,
      'subscriber:' + subscriberUuid,
      permissions,
      message
    );

    // Record invitation in Firestore
    const invitationRef = firestore
      .collection('subscriber_invitations')
      .doc(invitation.id);
    await invitationRef.set({
      id: invitation.id,
      subscriberUuid,
      inviterUuid,
      userEmail,
      permissions,
      message,
      status: 'pending',
      createdAt: Firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      invitationId: invitation.id,
      message: 'Invitation sent successfully',
    };
  } catch (error) {
    logger.error(`Failed to invite user: ${error.message}`);
    throw new Error(`Invitation failed: ${error.message}`);
  }
}

/**
 * Authorize API team to link professional connections
 * @param {string} subscriberUuid - UUID of the subscriber
 * @param {string} apiTeamUuid - UUID of the API team or member
 * @param {Array<string>} connectionTypes - Types of connections to authorize
 * @returns {Promise<Object>} Result of the authorization
 */
async function authorizeApiTeamConnections(
  subscriberUuid,
  apiTeamUuid,
  connectionTypes
) {
  try {
    logger.info(
      `Authorizing API team ${apiTeamUuid} for connections to subscriber ${subscriberUuid}`
    );

    // Check if API team UUID exists
    const apiTeamRef = firestore.collection('api_teams').doc(apiTeamUuid);
    const apiTeamDoc = await apiTeamRef.get();

    if (!apiTeamDoc.exists) {
      throw new Error('API team not found');
    }

    // Create authorization record
    const authorizationId = `auth-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const authorizationRef = firestore
      .collection('connection_authorizations')
      .doc(authorizationId);

    await authorizationRef.set({
      id: authorizationId,
      subscriberUuid,
      apiTeamUuid,
      connectionTypes,
      status: 'active',
      createdAt: Firestore.FieldValue.serverTimestamp(),
    });

    // Grant permissions via SallyPort
    await sallyport.authorizeUser(
      apiTeamUuid,
      'subscriber:' + subscriberUuid,
      ['connections:request'].concat(
        connectionTypes.map(type => `connections:${type}:request`)
      )
    );

    return {
      success: true,
      authorizationId,
      message: 'API team authorized for connection requests',
    };
  } catch (error) {
    logger.error(`Failed to authorize API team: ${error.message}`);
    throw new Error(`API team authorization failed: ${error.message}`);
  }
}

/**
 * Process connection request from API team
 * @param {string} subscriberUuid - UUID of the subscriber
 * @param {Object} connectionRequest - Connection request details
 * @returns {Promise<Object>} Result of the connection request processing
 */
async function processConnectionRequest(subscriberUuid, connectionRequest) {
  try {
    logger.info(
      `Processing connection request for subscriber ${subscriberUuid}`
    );

    // Validate connection request
    if (
      !connectionRequest.type ||
      !connectionRequest.value ||
      !connectionRequest.requestorUuid
    ) {
      throw new Error('Invalid connection request: missing required fields');
    }

    // Check if requestor is authorized
    const authQuery = await firestore
      .collection('connection_authorizations')
      .where('subscriberUuid', '==', subscriberUuid)
      .where('apiTeamUuid', '==', connectionRequest.requestorUuid)
      .where('status', '==', 'active')
      .get();

    if (authQuery.empty) {
      logger.warn(
        `Unauthorized connection request from ${connectionRequest.requestorUuid}`
      );
      throw new Error('Requestor not authorized for this subscriber');
    }

    // Check if connection type is authorized
    const authorization = authQuery.docs[0].data();
    if (!authorization.connectionTypes.includes(connectionRequest.type)) {
      logger.warn(`Connection type ${connectionRequest.type} not authorized`);
      throw new Error(
        `Connection type ${connectionRequest.type} not authorized`
      );
    }

    // Create connection request
    const result = await connections.requestConnection(
      subscriberUuid,
      connectionRequest.type,
      connectionRequest.value,
      connectionRequest.requestorUuid,
      connectionRequest.metadata || {}
    );

    return {
      success: true,
      connectionId: result.connectionId,
      status: result.status,
      message: 'Connection request created successfully',
    };
  } catch (error) {
    logger.error(`Failed to process connection request: ${error.message}`);
    throw new Error(`Connection request processing failed: ${error.message}`);
  }
}

/**
 * Get authorization details for a subscriber
 * @param {string} subscriberUuid - UUID of the subscriber
 * @returns {Promise<Object>} Authorization details
 */
async function getSubscriberAuthorizations(subscriberUuid) {
  try {
    logger.info(`Getting authorizations for subscriber ${subscriberUuid}`);

    // Get connection authorizations
    const authQuery = await firestore
      .collection('connection_authorizations')
      .where('subscriberUuid', '==', subscriberUuid)
      .where('status', '==', 'active')
      .get();

    const authorizations = [];
    authQuery.forEach(doc => {
      authorizations.push(doc.data());
    });

    // Get pending connection requests
    const connectionQuery = await firestore
      .collection('professional_connections')
      .where('subscriberUuid', '==', subscriberUuid)
      .where('status', '==', connections.ConnectionStatus.PENDING)
      .get();

    const pendingConnections = [];
    connectionQuery.forEach(doc => {
      pendingConnections.push(doc.data());
    });

    // Get active connections
    const activeConnectionQuery = await firestore
      .collection('professional_connections')
      .where('subscriberUuid', '==', subscriberUuid)
      .where('status', '==', connections.ConnectionStatus.APPROVED)
      .get();

    const activeConnections = [];
    activeConnectionQuery.forEach(doc => {
      activeConnections.push(doc.data());
    });

    return {
      authorizations,
      pendingConnections,
      activeConnections,
    };
  } catch (error) {
    logger.error(`Failed to get subscriber authorizations: ${error.message}`);
    throw new Error(`Authorization retrieval failed: ${error.message}`);
  }
}

module.exports = {
  inviteUser,
  authorizeApiTeamConnections,
  processConnectionRequest,
  getSubscriberAuthorizations,
  PermissionTypes,
};
