/**
 * Professional Connections Service for Aixtiv Symphony
 * Production implementation for managing professional connections
 */

const { Firestore } = require('@google-cloud/firestore');
const { PubSub } = require('@google-cloud/pubsub');
const logger = require('../common/logger');
const sallyport = require('../sallyport/sallyport-client');

// Initialize Firestore and PubSub
const firestore = new Firestore();
const pubsub = new PubSub();

// Connection topic for notifications
const CONNECTIONS_TOPIC = 'professional-connections';

// Connection types
const ConnectionTypes = {
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  GITHUB: 'github',
  EMAIL: 'email',
  PHONE: 'phone',
  SLACK: 'slack',
  TEAMS: 'teams',
  CUSTOM: 'custom',
};

// Connection status values
const ConnectionStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVOKED: 'revoked',
};

/**
 * Request a new professional connection between API team and subscriber
 * @param {string} subscriberUuid - UUID of the subscriber
 * @param {string} connectionType - Type of connection (from ConnectionTypes)
 * @param {string} connectionValue - Value for the connection (URL, ID, etc.)
 * @param {string} requestorUuid - UUID of the API team member making request
 * @param {Object} metadata - Additional metadata about the connection
 * @returns {Promise<Object>} Result of the connection request
 */
async function requestConnection(
  subscriberUuid,
  connectionType,
  connectionValue,
  requestorUuid,
  metadata = {}
) {
  try {
    logger.info(
      `Requesting ${connectionType} connection for subscriber ${subscriberUuid}`
    );

    // Verify requestor has permission to request connections
    const permissionCheck = await sallyport.verifyPermissions(
      requestorUuid,
      'subscriber:' + subscriberUuid,
      ['connections:request']
    );

    if (!permissionCheck.authorized) {
      logger.warn(`Unauthorized connection request from ${requestorUuid}`);
      throw new Error(
        'Not authorized to request connections for this subscriber'
      );
    }

    // Validate connection type
    if (!Object.values(ConnectionTypes).includes(connectionType)) {
      throw new Error(`Invalid connection type: ${connectionType}`);
    }

    // Create connection request
    const connectionId = `conn-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const connectionRef = firestore
      .collection('professional_connections')
      .doc(connectionId);

    const connectionData = {
      id: connectionId,
      subscriberUuid,
      connectionType,
      connectionValue,
      requestorUuid,
      status: ConnectionStatus.PENDING,
      metadata: {
        ...metadata,
        requestedAt: Firestore.FieldValue.serverTimestamp(),
      },
    };

    await connectionRef.set(connectionData);

    // Publish event to connections topic
    await publishConnectionEvent('connection_requested', connectionData);

    return {
      success: true,
      connectionId,
      status: ConnectionStatus.PENDING,
      message: 'Connection request created successfully',
    };
  } catch (error) {
    logger.error(`Connection request failed: ${error.message}`);
    throw new Error(`Failed to request connection: ${error.message}`);
  }
}

/**
 * Approve a pending connection request
 * @param {string} connectionId - ID of the connection to approve
 * @param {string} approverUuid - UUID of the subscriber approving the connection
 * @returns {Promise<Object>} Result of the approval
 */
async function approveConnection(connectionId, approverUuid) {
  try {
    logger.info(`Approving connection ${connectionId} by ${approverUuid}`);

    // Get the connection
    const connectionRef = firestore
      .collection('professional_connections')
      .doc(connectionId);
    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.exists) {
      throw new Error('Connection not found');
    }

    const connectionData = connectionDoc.data();

    // Verify the connection belongs to this subscriber
    if (connectionData.subscriberUuid !== approverUuid) {
      logger.warn(`Unauthorized approval attempt by ${approverUuid}`);
      throw new Error('Not authorized to approve this connection');
    }

    // Verify connection is pending
    if (connectionData.status !== ConnectionStatus.PENDING) {
      throw new Error(
        `Connection cannot be approved (status: ${connectionData.status})`
      );
    }

    // Update connection status
    await connectionRef.update({
      status: ConnectionStatus.APPROVED,
      'metadata.approvedAt': Firestore.FieldValue.serverTimestamp(),
      'metadata.approvedBy': approverUuid,
    });

    // Get updated connection data
    const updatedDoc = await connectionRef.get();
    const updatedData = updatedDoc.data();

    // Publish approval event
    await publishConnectionEvent('connection_approved', updatedData);

    return {
      success: true,
      connectionId,
      status: ConnectionStatus.APPROVED,
      message: 'Connection approved successfully',
    };
  } catch (error) {
    logger.error(`Connection approval failed: ${error.message}`);
    throw new Error(`Failed to approve connection: ${error.message}`);
  }
}

/**
 * Reject a pending connection request
 * @param {string} connectionId - ID of the connection to reject
 * @param {string} rejecterUuid - UUID of the subscriber rejecting the connection
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Result of the rejection
 */
async function rejectConnection(connectionId, rejecterUuid, reason = '') {
  try {
    logger.info(`Rejecting connection ${connectionId} by ${rejecterUuid}`);

    // Get the connection
    const connectionRef = firestore
      .collection('professional_connections')
      .doc(connectionId);
    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.exists) {
      throw new Error('Connection not found');
    }

    const connectionData = connectionDoc.data();

    // Verify the connection belongs to this subscriber
    if (connectionData.subscriberUuid !== rejecterUuid) {
      logger.warn(`Unauthorized rejection attempt by ${rejecterUuid}`);
      throw new Error('Not authorized to reject this connection');
    }

    // Verify connection is pending
    if (connectionData.status !== ConnectionStatus.PENDING) {
      throw new Error(
        `Connection cannot be rejected (status: ${connectionData.status})`
      );
    }

    // Update connection status
    await connectionRef.update({
      status: ConnectionStatus.REJECTED,
      'metadata.rejectedAt': Firestore.FieldValue.serverTimestamp(),
      'metadata.rejectedBy': rejecterUuid,
      'metadata.rejectionReason': reason,
    });

    // Get updated connection data
    const updatedDoc = await connectionRef.get();
    const updatedData = updatedDoc.data();

    // Publish rejection event
    await publishConnectionEvent('connection_rejected', updatedData);

    return {
      success: true,
      connectionId,
      status: ConnectionStatus.REJECTED,
      message: 'Connection rejected successfully',
    };
  } catch (error) {
    logger.error(`Connection rejection failed: ${error.message}`);
    throw new Error(`Failed to reject connection: ${error.message}`);
  }
}

/**
 * List connections for a subscriber
 * @param {string} subscriberUuid - UUID of the subscriber
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} List of connections
 */
async function listConnections(subscriberUuid, options = {}) {
  try {
    logger.info(`Listing connections for subscriber ${subscriberUuid}`);

    let query = firestore
      .collection('professional_connections')
      .where('subscriberUuid', '==', subscriberUuid);

    // Apply status filter if provided
    if (options.status) {
      query = query.where('status', '==', options.status);
    }

    // Apply connection type filter if provided
    if (options.type) {
      query = query.where('connectionType', '==', options.type);
    }

    // Execute query
    const snapshot = await query.get();

    // Process results
    const connections = [];
    snapshot.forEach(doc => {
      connections.push(doc.data());
    });

    return connections;
  } catch (error) {
    logger.error(`Failed to list connections: ${error.message}`);
    throw new Error(`Connection listing failed: ${error.message}`);
  }
}

/**
 * Publish connection event to PubSub
 * @param {string} eventType - Type of connection event
 * @param {Object} connectionData - Connection data
 * @returns {Promise<void>}
 */
async function publishConnectionEvent(eventType, connectionData) {
  try {
    const topic = pubsub.topic(CONNECTIONS_TOPIC);

    const eventData = {
      eventType,
      timestamp: new Date().toISOString(),
      connectionId: connectionData.id,
      subscriberUuid: connectionData.subscriberUuid,
      connectionType: connectionData.connectionType,
      status: connectionData.status,
    };

    const dataBuffer = Buffer.from(JSON.stringify(eventData));
    await topic.publish(dataBuffer);

    logger.info(
      `Published ${eventType} event for connection ${connectionData.id}`
    );
  } catch (error) {
    logger.error(`Failed to publish connection event: ${error.message}`);
    // Don't throw - this is a non-critical operation
  }
}

module.exports = {
  requestConnection,
  approveConnection,
  rejectConnection,
  listConnections,
  ConnectionTypes,
  ConnectionStatus,
};
