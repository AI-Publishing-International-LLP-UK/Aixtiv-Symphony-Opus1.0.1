/**
 * MCP Authorization Service
 * Handles OAuth, dynamic client registration, and app authorization for MCP servers
 * Implements the MCP authorization specification for secure app access
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('../common/logger');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

class MCPAuthorizationService {
  constructor(options = {}) {
    this.sallyPortVerifier = options.sallyPortVerifier;
    this.secretClient = new SecretManagerServiceClient();
    this.logger = options.logger || logger;
    
    // Configuration
    this.config = {
      issuer: process.env.MCP_ISSUER || 'https://drclaude.live',
      tokenExpiry: process.env.MCP_TOKEN_EXPIRY || '1h',
      refreshTokenExpiry: process.env.MCP_REFRESH_TOKEN_EXPIRY || '30d',
      jwtSecret: process.env.MCP_JWT_SECRET || crypto.randomBytes(32).toString('hex'),
      allowedScopes: [
        'mcp:read',
        'mcp:write', 
        'mcp:search',
        'mcp:fetch',
        'mcp:tools',
        'mcp:resources'
      ]
    };
    
    // Registered applications store
    this.registeredApps = new Map();
    this.authorizationCodes = new Map();
    this.accessTokens = new Map();
    this.refreshTokens = new Map();
    
    this.initializeDefaultApps();
  }

  /**
   * Initialize default MCP applications
   */
  initializeDefaultApps() {
    // Register ChatGPT as a default application
    this.registerApp({
      clientId: 'chatgpt-openai',
      clientName: 'ChatGPT by OpenAI',
      clientType: 'public', // ChatGPT uses public client type
      redirectUris: [
        'https://chatgpt.com/api/mcp/oauth/callback',
        'https://chat.openai.com/api/mcp/oauth/callback'
      ],
      allowedScopes: ['mcp:read', 'mcp:search', 'mcp:fetch'],
      requiresApproval: false,
      metadata: {
        description: 'Official ChatGPT client for MCP deep research',
        developer: 'OpenAI',
        homepageUrl: 'https://openai.com'
      }
    });

    // Register your internal apps
    this.registerApp({
      clientId: 'aixtiv-symphony',
      clientName: 'Aixtiv Symphony Integration Gateway',
      clientType: 'confidential',
      redirectUris: [
        'https://drclaude.live/oauth/callback',
        'http://localhost:3000/oauth/callback'
      ],
      allowedScopes: ['mcp:read', 'mcp:write', 'mcp:search', 'mcp:fetch', 'mcp:tools'],
      requiresApproval: false,
      metadata: {
        description: 'Internal Aixtiv Symphony MCP client',
        developer: 'ASOOS',
        internal: true
      }
    });
  }

  /**
   * Dynamic Client Registration
   * Implements RFC 7591 for OAuth 2.0 Dynamic Client Registration
   */
  async registerApp(appConfig) {
    const {
      clientId = this.generateClientId(),
      clientName,
      clientType = 'confidential',
      redirectUris = [],
      allowedScopes = ['mcp:read'],
      requiresApproval = true,
      metadata = {}
    } = appConfig;

    // Generate client secret for confidential clients
    const clientSecret = clientType === 'confidential' ? 
      crypto.randomBytes(32).toString('base64') : null;

    const registeredApp = {
      clientId,
      clientName,
      clientType,
      clientSecret,
      redirectUris,
      allowedScopes: this.validateScopes(allowedScopes),
      requiresApproval,
      metadata,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    this.registeredApps.set(clientId, registeredApp);
    
    this.logger.info('MCP app registered', {
      clientId,
      clientName,
      clientType,
      allowedScopes: registeredApp.allowedScopes
    });

    // Return registration response (without secret for public clients)
    const response = {
      client_id: clientId,
      client_name: clientName,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: registeredApp.allowedScopes.join(' ')
    };

    if (clientType === 'confidential') {
      response.client_secret = clientSecret;
      response.client_secret_expires_at = 0; // Never expires
    }

    return response;
  }

  /**
   * OAuth 2.0 Authorization Code Flow - Step 1: Authorization Request
   */
  async handleAuthorizationRequest(params) {
    const {
      client_id,
      redirect_uri,
      scope = 'mcp:read',
      state,
      response_type = 'code',
      code_challenge,
      code_challenge_method
    } = params;

    try {
      // Validate client
      const app = this.registeredApps.get(client_id);
      if (!app || !app.isActive) {
        throw new Error('Invalid client_id');
      }

      // Validate redirect URI
      if (!app.redirectUris.includes(redirect_uri)) {
        throw new Error('Invalid redirect_uri');
      }

      // Validate scopes
      const requestedScopes = scope.split(' ');
      const validScopes = this.validateRequestedScopes(requestedScopes, app.allowedScopes);
      
      if (validScopes.length === 0) {
        throw new Error('No valid scopes requested');
      }

      // For ChatGPT and internal apps, auto-approve
      const requiresUserConsent = app.requiresApproval && 
        !['chatgpt-openai', 'aixtiv-symphony'].includes(client_id);

      if (requiresUserConsent) {
        // Return consent screen data
        return {
          requiresConsent: true,
          consentData: {
            clientName: app.clientName,
            requestedScopes: validScopes,
            developer: app.metadata.developer,
            homepageUrl: app.metadata.homepageUrl
          }
        };
      }

      // Generate authorization code
      const authCode = this.generateAuthorizationCode();
      const codeData = {
        client_id,
        redirect_uri,
        scope: validScopes.join(' '),
        code_challenge,
        code_challenge_method,
        expires_at: Date.now() + (10 * 60 * 1000), // 10 minutes
        used: false
      };

      this.authorizationCodes.set(authCode, codeData);

      // Build redirect URL with authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state);

      return {
        requiresConsent: false,
        redirectUrl: redirectUrl.toString()
      };

    } catch (error) {
      this.logger.error('Authorization request failed', { error, client_id });
      throw error;
    }
  }

  /**
   * OAuth 2.0 Authorization Code Flow - Step 2: Token Exchange
   */
  async handleTokenRequest(params) {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier,
      refresh_token
    } = params;

    try {
      if (grant_type === 'authorization_code') {
        return await this.exchangeCodeForTokens({
          code,
          redirect_uri,
          client_id,
          client_secret,
          code_verifier
        });
      } else if (grant_type === 'refresh_token') {
        return await this.refreshAccessToken({
          refresh_token,
          client_id,
          client_secret
        });
      } else {
        throw new Error('Unsupported grant_type');
      }
    } catch (error) {
      this.logger.error('Token request failed', { error, grant_type, client_id });
      throw error;
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(params) {
    const { code, redirect_uri, client_id, client_secret, code_verifier } = params;

    // Validate authorization code
    const codeData = this.authorizationCodes.get(code);
    if (!codeData || codeData.used || codeData.expires_at < Date.now()) {
      throw new Error('Invalid or expired authorization code');
    }

    // Validate client
    const app = this.registeredApps.get(client_id);
    if (!app) {
      throw new Error('Invalid client_id');
    }

    // Validate client secret for confidential clients
    if (app.clientType === 'confidential' && app.clientSecret !== client_secret) {
      throw new Error('Invalid client_secret');
    }

    // Validate PKCE if used
    if (codeData.code_challenge && !this.validatePKCE(code_verifier, codeData)) {
      throw new Error('Invalid code_verifier');
    }

    // Mark code as used
    codeData.used = true;

    // Generate tokens
    const accessToken = this.generateAccessToken({
      client_id,
      scope: codeData.scope,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    });

    const refreshToken = crypto.randomBytes(32).toString('base64');

    // Store tokens
    this.accessTokens.set(accessToken, {
      client_id,
      scope: codeData.scope,
      expires_at: Date.now() + (60 * 60 * 1000)
    });

    this.refreshTokens.set(refreshToken, {
      client_id,
      scope: codeData.scope,
      expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: codeData.scope
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(params) {
    const { refresh_token, client_id, client_secret } = params;

    // Validate refresh token
    const tokenData = this.refreshTokens.get(refresh_token);
    if (!tokenData || tokenData.expires_at < Date.now()) {
      throw new Error('Invalid or expired refresh token');
    }

    // Validate client
    const app = this.registeredApps.get(client_id);
    if (!app || tokenData.client_id !== client_id) {
      throw new Error('Invalid client');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken({
      client_id,
      scope: tokenData.scope,
      exp: Math.floor(Date.now() / 1000) + (60 * 60)
    });

    this.accessTokens.set(accessToken, {
      client_id,
      scope: tokenData.scope,
      expires_at: Date.now() + (60 * 60 * 1000)
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: tokenData.scope
    };
  }

  /**
   * Validate access token and authorize MCP operation
   */
  async authorizeRequest(authHeader, requiredScope = 'mcp:read') {
    try {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: 'Missing or invalid Authorization header'
        };
      }

      const accessToken = authHeader.replace('Bearer ', '');
      
      // Verify JWT token
      const decoded = jwt.verify(accessToken, this.config.jwtSecret);
      
      // Check token in storage
      const tokenData = this.accessTokens.get(accessToken);
      if (!tokenData || tokenData.expires_at < Date.now()) {
        return {
          success: false,
          error: 'Token expired or invalid'
        };
      }

      // Check scope authorization
      const tokenScopes = tokenData.scope.split(' ');
      if (!tokenScopes.includes(requiredScope) && !tokenScopes.includes('mcp:*')) {
        return {
          success: false,
          error: `Insufficient scope. Required: ${requiredScope}`
        };
      }

      // Get client info
      const app = this.registeredApps.get(tokenData.client_id);
      
      return {
        success: true,
        clientId: tokenData.client_id,
        clientName: app?.clientName,
        scopes: tokenScopes,
        tokenData: decoded
      };

    } catch (error) {
      this.logger.error('Token validation failed', { error });
      return {
        success: false,
        error: 'Token validation failed'
      };
    }
  }

  /**
   * Create MCP server authorization middleware
   */
  createAuthMiddleware(requiredScope = 'mcp:read') {
    return async (req, res, next) => {
      const authResult = await this.authorizeRequest(
        req.headers.authorization,
        requiredScope
      );

      if (!authResult.success) {
        return res.status(401).json({
          error: 'unauthorized',
          error_description: authResult.error
        });
      }

      // Add auth info to request
      req.mcp = {
        clientId: authResult.clientId,
        clientName: authResult.clientName,
        scopes: authResult.scopes
      };

      next();
    };
  }

  /**
   * Get MCP server discovery metadata
   */
  getServerMetadata() {
    return {
      server_info: {
        name: 'Aixtiv Symphony MCP Server',
        version: '1.0.0',
        description: 'MCP server for Aixtiv Symphony integration gateway'
      },
      authorization: {
        authorization_endpoint: `${this.config.issuer}/oauth/authorize`,
        token_endpoint: `${this.config.issuer}/oauth/token`,
        registration_endpoint: `${this.config.issuer}/oauth/register`,
        scopes_supported: this.config.allowedScopes,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256']
      },
      tools: [
        {
          name: 'search',
          description: 'Search for resources using the provided query string and returns matching results.',
          input_schema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for Aixtiv Symphony resources. Supports keywords, filters, and semantic search.'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'fetch',
          description: 'Retrieves detailed content for a specific resource identified by the given ID.',
          input_schema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the resource to fetch.'
              }
            },
            required: ['id']
          }
        }
      ]
    };
  }

  // Helper methods
  generateClientId() {
    return 'mcp_' + crypto.randomBytes(16).toString('hex');
  }

  generateAuthorizationCode() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateAccessToken(payload) {
    return jwt.sign(payload, this.config.jwtSecret, {
      issuer: this.config.issuer,
      expiresIn: this.config.tokenExpiry
    });
  }

  validateScopes(scopes) {
    return scopes.filter(scope => this.config.allowedScopes.includes(scope));
  }

  validateRequestedScopes(requested, allowed) {
    return requested.filter(scope => allowed.includes(scope) || allowed.includes('mcp:*'));
  }

  validatePKCE(verifier, codeData) {
    if (codeData.code_challenge_method === 'S256') {
      const hash = crypto.createHash('sha256').update(verifier).digest('base64url');
      return hash === codeData.code_challenge;
    }
    return verifier === codeData.code_challenge;
  }

  /**
   * Revoke access token
   */
  async revokeToken(token) {
    this.accessTokens.delete(token);
    this.refreshTokens.delete(token);
    return { success: true };
  }

  /**
   * Get registered applications
   */
  getRegisteredApps() {
    return Array.from(this.registeredApps.values()).map(app => ({
      clientId: app.clientId,
      clientName: app.clientName,
      clientType: app.clientType,
      allowedScopes: app.allowedScopes,
      createdAt: app.createdAt,
      isActive: app.isActive
    }));
  }
}

module.exports = MCPAuthorizationService;

