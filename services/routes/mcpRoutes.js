/**
 * MCP Server Routes
 * Handles OAuth flow and MCP tool execution for remote MCP server access
 */

const express = require('express');
const MCPAuthorizationService = require('../auth/MCPAuthorizationService');
const MCPService = require('../mcpService');
const logger = require('../common/logger');

class MCPRoutes {
  constructor(options = {}) {
    this.router = express.Router();
    this.authService = new MCPAuthorizationService(options);
    this.mcpService = new MCPService({
      sallyPortVerifier: options.sallyPortVerifier,
      logger
    });
    
    this.setupRoutes();
  }

  setupRoutes() {
    // MCP Server Discovery
    this.router.get('/.well-known/mcp', this.getServerMetadata.bind(this));
    
    // OAuth 2.0 Dynamic Client Registration
    this.router.post('/oauth/register', this.registerClient.bind(this));
    
    // OAuth 2.0 Authorization Endpoint
    this.router.get('/oauth/authorize', this.handleAuthorization.bind(this));
    this.router.post('/oauth/authorize', this.handleAuthorizationConsent.bind(this));
    
    // OAuth 2.0 Token Endpoint
    this.router.post('/oauth/token', this.handleTokenRequest.bind(this));
    
    // OAuth 2.0 Token Revocation
    this.router.post('/oauth/revoke', this.revokeToken.bind(this));
    
    // MCP Tools - Protected endpoints
    this.router.post('/mcp/search', 
      this.authService.createAuthMiddleware('mcp:search'),
      this.handleSearch.bind(this)
    );
    
    this.router.post('/mcp/fetch',
      this.authService.createAuthMiddleware('mcp:fetch'),
      this.handleFetch.bind(this)
    );
    
    // Admin endpoints
    this.router.get('/admin/apps',
      this.authService.createAuthMiddleware('mcp:admin'),
      this.getRegisteredApps.bind(this)
    );
  }

  /**
   * MCP Server Discovery Endpoint
   * Returns server metadata for MCP clients
   */
  async getServerMetadata(req, res) {
    try {
      const metadata = this.authService.getServerMetadata();
      res.json(metadata);
    } catch (error) {
      logger.error('Failed to get server metadata', { error });
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to retrieve server metadata'
      });
    }
  }

  /**
   * OAuth 2.0 Dynamic Client Registration
   * Allows applications to register themselves
   */
  async registerClient(req, res) {
    try {
      const {
        client_name,
        client_type = 'confidential',
        redirect_uris = [],
        scope = 'mcp:read',
        client_uri,
        logo_uri,
        tos_uri,
        policy_uri
      } = req.body;

      if (!client_name || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'client_name and redirect_uris are required'
        });
      }

      const registrationResult = await this.authService.registerApp({
        clientName: client_name,
        clientType: client_type,
        redirectUris: redirect_uris,
        allowedScopes: scope.split(' '),
        requiresApproval: client_type !== 'confidential', // Public clients need approval
        metadata: {
          client_uri,
          logo_uri,
          tos_uri,
          policy_uri
        }
      });

      res.status(201).json(registrationResult);
      
    } catch (error) {
      logger.error('Client registration failed', { error });
      res.status(400).json({
        error: 'invalid_request',
        error_description: error.message
      });
    }
  }

  /**
   * OAuth 2.0 Authorization Endpoint
   * Handles authorization requests from MCP clients
   */
  async handleAuthorization(req, res) {
    try {
      const {
        client_id,
        redirect_uri,
        scope,
        state,
        response_type,
        code_challenge,
        code_challenge_method
      } = req.query;

      if (!client_id || !redirect_uri || response_type !== 'code') {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'Missing required parameters or invalid response_type'
        });
      }

      const authResult = await this.authService.handleAuthorizationRequest({
        client_id,
        redirect_uri,
        scope,
        state,
        response_type,
        code_challenge,
        code_challenge_method
      });

      if (authResult.requiresConsent) {
        // Render consent screen
        return res.render('consent', {
          clientName: authResult.consentData.clientName,
          requestedScopes: authResult.consentData.requestedScopes,
          developer: authResult.consentData.developer,
          homepageUrl: authResult.consentData.homepageUrl,
          client_id,
          redirect_uri,
          scope,
          state,
          code_challenge,
          code_challenge_method
        });
      }

      // Auto-approved, redirect with authorization code
      res.redirect(authResult.redirectUrl);
      
    } catch (error) {
      logger.error('Authorization request failed', { error });
      
      const errorUrl = new URL(req.query.redirect_uri || 'about:blank');
      errorUrl.searchParams.set('error', 'server_error');
      errorUrl.searchParams.set('error_description', error.message);
      if (req.query.state) {
        errorUrl.searchParams.set('state', req.query.state);
      }
      
      res.redirect(errorUrl.toString());
    }
  }

  /**
   * Handle user consent for authorization
   */
  async handleAuthorizationConsent(req, res) {
    try {
      const {
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method,
        consent
      } = req.body;

      if (consent !== 'allow') {
        const errorUrl = new URL(redirect_uri);
        errorUrl.searchParams.set('error', 'access_denied');
        errorUrl.searchParams.set('error_description', 'User denied access');
        if (state) errorUrl.searchParams.set('state', state);
        
        return res.redirect(errorUrl.toString());
      }

      // User approved, generate authorization code
      const authResult = await this.authService.handleAuthorizationRequest({
        client_id,
        redirect_uri,
        scope,
        state,
        response_type: 'code',
        code_challenge,
        code_challenge_method
      });

      res.redirect(authResult.redirectUrl);
      
    } catch (error) {
      logger.error('Authorization consent failed', { error });
      
      const errorUrl = new URL(req.body.redirect_uri || 'about:blank');
      errorUrl.searchParams.set('error', 'server_error');
      errorUrl.searchParams.set('error_description', error.message);
      
      res.redirect(errorUrl.toString());
    }
  }

  /**
   * OAuth 2.0 Token Endpoint
   * Exchanges authorization codes for access tokens
   */
  async handleTokenRequest(req, res) {
    try {
      const {
        grant_type,
        code,
        redirect_uri,
        client_id,
        client_secret,
        code_verifier,
        refresh_token
      } = req.body;

      if (!grant_type || !client_id) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'grant_type and client_id are required'
        });
      }

      const tokenResult = await this.authService.handleTokenRequest({
        grant_type,
        code,
        redirect_uri,
        client_id,
        client_secret,
        code_verifier,
        refresh_token
      });

      res.json(tokenResult);
      
    } catch (error) {
      logger.error('Token request failed', { error });
      
      let errorCode = 'server_error';
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        errorCode = 'invalid_grant';
      }
      
      res.status(400).json({
        error: errorCode,
        error_description: error.message
      });
    }
  }

  /**
   * Token Revocation Endpoint
   */
  async revokeToken(req, res) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'token parameter is required'
        });
      }

      await this.authService.revokeToken(token);
      
      res.status(200).json({
        success: true
      });
      
    } catch (error) {
      logger.error('Token revocation failed', { error });
      res.status(400).json({
        error: 'invalid_request',
        error_description: error.message
      });
    }
  }

  /**
   * MCP Search Tool
   * Implements the search functionality for deep research
   */
  async handleSearch(req, res) {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'query parameter is required and must be a string'
        });
      }

      // Execute search using your existing integration gateway
      const searchResult = await this.performSearch(query, req.mcp.clientId);
      
      // Return MCP-compliant search response
      res.json({
        content: [{
          type: 'text',
          text: JSON.stringify({
            results: searchResult.results
          })
        }]
      });
      
    } catch (error) {
      logger.error('MCP search failed', { error, clientId: req.mcp.clientId });
      res.status(500).json({
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Search operation failed',
            message: error.message
          })
        }],
        isError: true
      });
    }
  }

  /**
   * MCP Fetch Tool
   * Retrieves detailed content for a specific resource
   */
  async handleFetch(req, res) {
    try {
      const { id } = req.body;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'id parameter is required and must be a string'
        });
      }

      // Fetch document using your existing integration gateway
      const document = await this.fetchDocument(id, req.mcp.clientId);
      
      // Return MCP-compliant fetch response
      res.json({
        content: [{
          type: 'text',
          text: JSON.stringify(document)
        }]
      });
      
    } catch (error) {
      logger.error('MCP fetch failed', { error, clientId: req.mcp.clientId });
      res.status(500).json({
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Fetch operation failed',
            message: error.message
          })
        }],
        isError: true
      });
    }
  }

  /**
   * Get registered applications (admin endpoint)
   */
  async getRegisteredApps(req, res) {
    try {
      const apps = this.authService.getRegisteredApps();
      res.json({ apps });
    } catch (error) {
      logger.error('Failed to get registered apps', { error });
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to retrieve registered applications'
      });
    }
  }

  /**
   * Perform search across your integration gateway resources
   */
  async performSearch(query, clientId) {
    // This is where you integrate with your existing search capabilities
    // Example implementation:
    
    const results = [];
    
    try {
      // Search in different data sources based on query
      if (query.toLowerCase().includes('agent')) {
        // Search agents
        const agentResults = await this.searchAgents(query);
        results.push(...agentResults);
      }
      
      if (query.toLowerCase().includes('integration')) {
        // Search integrations
        const integrationResults = await this.searchIntegrations(query);
        results.push(...integrationResults);
      }
      
      if (query.toLowerCase().includes('service')) {
        // Search services
        const serviceResults = await this.searchServices(query);
        results.push(...serviceResults);
      }
      
      // Default: search all resources
      if (results.length === 0) {
        const generalResults = await this.searchAllResources(query);
        results.push(...generalResults);
      }
      
      return { results };
      
    } catch (error) {
      logger.error('Search execution failed', { error, query, clientId });
      throw error;
    }
  }

  /**
   * Fetch a specific document by ID
   */
  async fetchDocument(id, clientId) {
    try {
      // This is where you fetch from your data sources
      // Example implementation:
      
      if (id.startsWith('agent_')) {
        return await this.fetchAgent(id);
      } else if (id.startsWith('integration_')) {
        return await this.fetchIntegration(id);
      } else if (id.startsWith('service_')) {
        return await this.fetchService(id);
      }
      
      throw new Error(`Unknown resource ID: ${id}`);
      
    } catch (error) {
      logger.error('Document fetch failed', { error, id, clientId });
      throw error;
    }
  }

  // Example search implementations (customize based on your data sources)
  async searchAgents(query) {
    // Search your agent configurations
    return [
      {
        id: 'agent_claude',
        title: 'Claude AI Agent',
        text: 'Advanced AI agent for code generation and analysis',
        url: 'https://drclaude.live/agents/claude'
      }
    ];
  }

  async searchIntegrations(query) {
    // Search your integrations
    return [
      {
        id: 'integration_github',
        title: 'GitHub Integration',
        text: 'Integration with GitHub for repository management',
        url: 'https://drclaude.live/integrations/github'
      }
    ];
  }

  async searchServices(query) {
    // Search your services
    return [
      {
        id: 'service_mcp',
        title: 'MCP Service',
        text: 'Model Context Protocol service for AI integrations',
        url: 'https://drclaude.live/services/mcp'
      }
    ];
  }

  async searchAllResources(query) {
    // General search across all resources
    const allResults = [];
    const agents = await this.searchAgents(query);
    const integrations = await this.searchIntegrations(query);
    const services = await this.searchServices(query);
    
    return [...agents, ...integrations, ...services];
  }

  async fetchAgent(id) {
    // Fetch agent details
    return {
      id,
      title: 'Claude AI Agent',
      text: 'Detailed information about the Claude AI agent including capabilities, configuration, and usage instructions.',
      url: 'https://drclaude.live/agents/claude',
      metadata: {
        type: 'agent',
        version: '1.0.0',
        status: 'active'
      }
    };
  }

  async fetchIntegration(id) {
    // Fetch integration details
    return {
      id,
      title: 'GitHub Integration',
      text: 'Complete documentation and configuration for the GitHub integration.',
      url: 'https://drclaude.live/integrations/github',
      metadata: {
        type: 'integration',
        provider: 'github',
        status: 'configured'
      }
    };
  }

  async fetchService(id) {
    // Fetch service details
    return {
      id,
      title: 'MCP Service',
      text: 'Comprehensive guide to the Model Context Protocol service implementation.',
      url: 'https://drclaude.live/services/mcp',
      metadata: {
        type: 'service',
        protocol: 'MCP',
        status: 'running'
      }
    };
  }

  getRouter() {
    return this.router;
  }
}

module.exports = MCPRoutes;

