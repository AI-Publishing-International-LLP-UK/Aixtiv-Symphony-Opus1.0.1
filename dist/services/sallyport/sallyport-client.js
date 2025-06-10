/**
 * SallyPort Security Client for Aixtiv Symphony
 * Production implementation for authentication and authorization
 */

const axios = require('axios');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const logger = require('../common/logger');

// Initialize Secret Manager
const secretManager = new SecretManagerServiceClient();
const PROJECT_ID = process.env.GCP_PROJECT || '859242575175';

// SallyPort service configuration
const SALLYPORT_CONFIG = {
  baseUrl:
    process.env.SALLYPORT_BASE_URL || 'https://sallyport.aixtiv.dev/api/v1',
  timeout: 10000,
};

/**
 * Create an authenticated SallyPort API client
 * @returns {Promise<Object>} Authenticated axios instance
 */
async function createAuthorizedClient() {
  try {
    // Get API key from Secret Manager
    const [secretVersion] = await secretManager.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/sallyport-api-key/versions/latest`,
    });

    const apiKey = secretVersion.payload.data.toString();

    // Create axios instance with authentication
    const client = axios.create({
      baseURL: SALLYPORT_CONFIG.baseUrl,
      timeout: SALLYPORT_CONFIG.timeout,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Aixtiv-Integration-Gateway/1.0',
      },
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      response => response,
      error => {
        logger.error(`SallyPort API error: ${error.message}`);
        if (error.response) {
          logger.error(
            `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
          );
        }
        return Promise.reject(error);
      }
    );

    return client;
  } catch (error) {
    logger.error(`Failed to create SallyPort client: ${error.message}`);
    throw new Error(`SallyPort client initialization failed: ${error.message}`);
  }
}

/**
 * Authorize a user for specific resource access
 * @param {string} userUuid - UUID of the user to authorize
 * @param {string} resourceId - ID of the resource to authorize access for
 * @param {Array<string>} permissions - Permissions to grant
 * @returns {Promise<Object>} Authorization result
 */
async function authorizeUser(userUuid, resourceId, permissions) {
  try {
    const client = await createAuthorizedClient();

    const response = await client.post('/authorize', {
      userUuid,
      resourceId,
      permissions,
    });

    logger.info(`User ${userUuid} authorized for ${resourceId}`);
    return response.data;
  } catch (error) {
    logger.error(`Authorization failed for user ${userUuid}: ${error.message}`);
    throw new Error(`Failed to authorize user: ${error.message}`);
  }
}

/**
 * Verify if a user has specific permissions
 * @param {string} userUuid - UUID of the user to check
 * @param {string} resourceId - ID of the resource to check access for
 * @param {Array<string>} permissions - Permissions to verify
 * @returns {Promise<Object>} Verification result
 */
async function verifyPermissions(userUuid, resourceId, permissions) {
  try {
    const client = await createAuthorizedClient();

    const response = await client.post('/verify', {
      userUuid,
      resourceId,
      permissions,
    });

    return response.data;
  } catch (error) {
    logger.error(
      `Permission verification failed for user ${userUuid}: ${error.message}`
    );
    throw new Error(`Failed to verify permissions: ${error.message}`);
  }
}

/**
 * Send an invitation to collaborate on a resource
 * @param {string} inviterUuid - UUID of the user sending invitation
 * @param {string} inviteeEmail - Email of the user to invite
 * @param {string} resourceId - ID of the resource to invite to
 * @param {Array<string>} permissions - Permissions to grant
 * @param {string} message - Custom invitation message
 * @returns {Promise<Object>} Invitation result
 */
async function sendInvitation(
  inviterUuid,
  inviteeEmail,
  resourceId,
  permissions,
  message
) {
  try {
    const client = await createAuthorizedClient();

    const response = await client.post('/invitations', {
      inviterUuid,
      inviteeEmail,
      resourceId,
      permissions,
      message,
    });

    logger.info(`Invitation sent to ${inviteeEmail} for ${resourceId}`);
    return response.data;
  } catch (error) {
    logger.error(
      `Failed to send invitation to ${inviteeEmail}: ${error.message}`
    );
    throw new Error(`Invitation failed: ${error.message}`);
  }
}

/**
 * Get active user session data
 * @param {string} sessionToken - User session token
 * @returns {Promise<Object>} Session data
 */
async function getUserSession(sessionToken) {
  try {
    const client = await createAuthorizedClient();

    const response = await client.get('/session', {
      headers: {
        'X-Session-Token': sessionToken,
      },
    });

    return response.data;
  } catch (error) {
    logger.error(`Failed to get user session: ${error.message}`);
    throw new Error(`Session verification failed: ${error.message}`);
  }
}

module.exports = {
  authorizeUser,
  verifyPermissions,
  sendInvitation,
  getUserSession,
};
