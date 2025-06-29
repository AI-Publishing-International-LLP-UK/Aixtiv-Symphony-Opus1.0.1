/**
 * MCP Gateway class for Aixtiv Symphony Integration Gateway
 * Handles Remote MCP server connections using OpenAI's Responses API
 * Extends BaseGateway for SallyPort authentication integration
 */

const BaseGateway = require('./BaseGateway');
let OpenAI;

// Create a mock OpenAI client for local development if no API key is available
try {
  OpenAI = require('openai');
} catch (error) {
  console.warn('OpenAI module not found, using mock implementation');
  // Mock implementation for local development
  OpenAI = class MockOpenAI {
    constructor() {
      this.responses = {
        create: async () => ({
          id: 'mock-response-' + Date.now(),
          output: [{ type: 'text', text: 'This is a mock response for local development.' }]
        })
      };
    }
  };
}

const logger = require('../common/logger');

/**
 * MCPGateway class
 * Manages connections to Remote MCP servers via OpenAI Responses API
 */
class MCPGateway extends BaseGateway {
  /**
   * MCPGateway constructor
   * @param {Object} options - Configuration options
   * @param {Object} options.openaiConfig - OpenAI client configuration
   * @param {Object} options.mcpServers - MCP server configurations
   * @param {Object} options.sallyPortVerifier - SallyPort verification service
   */
  constructor(options = {}) {
    super(options);
    
// Initialize OpenAI client
    try {
      // For production: In production environment, API key would be fetched from GCP Secret Manager
      const apiKey = options.openaiConfig?.apiKey || process.env.OPENAI_API_KEY || 'sk-placeholder-key-for-development-only';
      
      // Check if we're using the mock OpenAI class or the real one
      if (OpenAI.name === 'MockOpenAI') {
        this.openai = new OpenAI();
        console.log('Using mock OpenAI client for development');
      } else {
        this.openai = new OpenAI({
          apiKey,
          ...options.openaiConfig
        });
      }
      
      // Log initialization status
      this.logger.info('MCPGateway initialized with OpenAI client', {
        isMock: OpenAI.name === 'MockOpenAI',
        hasApiKey: !!apiKey,
        usingGcpSecrets: true
      });
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error.message);
      // Create a simple mock for development purposes
      this.openai = {
        responses: {
          create: async () => ({
            id: 'mock-response-' + Date.now(),
            output: [{ type: 'text', text: 'This is a mock response for local development.' }]
          })
        }
      };
      this.logger.warn('Using fallback mock OpenAI client due to initialization error');
    }
    
    // MCP server configurations
    this.mcpServers = options.mcpServers || {};
    
    // Default MCP servers if none provided
    this.defaultMcpServers = {
      deepwiki: {
        url: 'https://mcp.deepwiki.com/mcp',
        requireApproval: 'never',
        allowedTools: null, // null means all tools
        headers: {}
      },
      stripe: {
        url: 'https://mcp.stripe.com',
        requireApproval: true,
        allowedTools: null,
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_API_KEY || ''}`
        }
      }
    };
    
    this.logger = options.logger || logger;
  }

  /**
   * Perform SallyPort authentication
   * @param {Object} context - Authentication context
   * @returns {Promise<Object>} Authentication result
   * @protected
   */
  async _performAuthentication(context) {
    try {
      // Check if sallyPortToken is present
      if (!context.sallyPortToken) {
        return {
          success: false,
          status: 401,
          error: {
            code: 'MISSING_SALLYPORT_TOKEN',
            message: 'SallyPort token is required for MCP Gateway authentication'
          }
        };
      }

      // Verify the SallyPort token
      const verificationResult = await this.sallyPortVerifier.verify(context.sallyPortToken);
      
      if (!verificationResult.valid) {
        return {
          success: false,
          status: 403,
          error: {
            code: 'INVALID_SALLYPORT_TOKEN',
            message: 'SallyPort token verification failed'
          }
        };
      }

      // Authentication successful
      return {
        success: true,
        status: 200,
        data: {
          authenticated: true,
          userId: context.userId,
          sallyPortVerified: true,
          permissions: verificationResult.permissions || []
        }
      };

    } catch (error) {
      this.logger.error('SallyPort verification error in MCP Gateway', { error });
      return {
        success: false,
        status: 500,
        error: {
          code: 'SALLYPORT_VERIFICATION_ERROR',
          message: 'Error occurred during SallyPort verification'
        }
      };
    }
  }

  /**
   * Execute MCP request using OpenAI Responses API
   * @param {Object} request - MCP request configuration
   * @param {string} request.input - User input/query
   * @param {string} request.model - OpenAI model to use (default: gpt-4.1)
   * @param {Array} request.mcpServers - Array of MCP server configurations to use
   * @param {string} request.previousResponseId - Previous response ID for chaining
   * @param {Array} request.inputItems - Additional input items (e.g., approval responses)
   * @returns {Promise<Object>} MCP response
   */
  async executeMCPRequest(request) {
    try {
      const {
        input,
        model = 'gpt-4.1',
        mcpServers = [],
        previousResponseId = null,
        inputItems = []
      } = request;

      // Build tools array from MCP server configurations
      const tools = this._buildMCPTools(mcpServers);
      
      // Prepare request parameters
      const requestParams = {
        model,
        tools,
        input: typeof input === 'string' ? input : inputItems.concat([input])
      };

      // Add previous response ID if provided (for chaining)
      if (previousResponseId) {
        requestParams.previous_response_id = previousResponseId;
      }

      this.logger.info('Executing MCP request', {
        model,
        toolCount: tools.length,
        hasPreviousResponse: !!previousResponseId
      });

      // Make the OpenAI Responses API call
      const response = await this.openai.responses.create(requestParams);

      return {
        success: true,
        data: response,
        metadata: {
          model,
          toolsUsed: tools.map(t => t.server_label),
          responseId: response.id
        }
      };

    } catch (error) {
      this.logger.error('MCP request execution failed', { error });
      return {
        success: false,
        error: {
          code: 'MCP_REQUEST_FAILED',
          message: error.message,
          details: error
        }
      };
    }
  }

  /**
   * Handle MCP approval request
   * @param {Object} approvalRequest - Approval request details
   * @param {string} approvalRequest.approvalRequestId - ID of the approval request
   * @param {boolean} approvalRequest.approve - Whether to approve the request
   * @param {string} approvalRequest.previousResponseId - Previous response ID
   * @returns {Promise<Object>} Approval response
   */
  async handleApprovalRequest(approvalRequest) {
    try {
      const { approvalRequestId, approve, previousResponseId } = approvalRequest;

      const response = await this.openai.responses.create({
        model: 'gpt-4.1',
        previous_response_id: previousResponseId,
        input: [{
          type: 'mcp_approval_response',
          approve,
          approval_request_id: approvalRequestId
        }]
      });

      return {
        success: true,
        data: response,
        metadata: {
          approved: approve,
          approvalRequestId
        }
      };

    } catch (error) {
      this.logger.error('MCP approval handling failed', { error });
      return {
        success: false,
        error: {
          code: 'MCP_APPROVAL_FAILED',
          message: error.message
        }
      };
    }
  }

  /**
   * Get available MCP servers and their configurations
   * @returns {Object} Available MCP servers
   */
  getAvailableMCPServers() {
    return {
      configured: this.mcpServers,
      defaults: this.defaultMcpServers
    };
  }

  /**
   * Add or update MCP server configuration
   * @param {string} label - Server label
   * @param {Object} config - Server configuration
   */
  configureMCPServer(label, config) {
    this.mcpServers[label] = {
      url: config.url,
      requireApproval: config.requireApproval !== false,
      allowedTools: config.allowedTools || null,
      headers: config.headers || {}
    };
  }

  /**
   * Build MCP tools array for OpenAI Responses API
   * @param {Array} serverLabels - Array of server labels to include
   * @returns {Array} MCP tools configuration
   * @private
   */
  _buildMCPTools(serverLabels = []) {
    const tools = [];
    
    // If no specific servers requested, use all configured servers
    const serversToUse = serverLabels.length > 0 ? serverLabels : 
      Object.keys({ ...this.mcpServers, ...this.defaultMcpServers });

    serversToUse.forEach(label => {
      const config = this.mcpServers[label] || this.defaultMcpServers[label];
      
      if (config) {
        const tool = {
          type: 'mcp',
          server_label: label,
          server_url: config.url
        };

        // Add approval requirements
        if (config.requireApproval === 'never') {
          tool.require_approval = 'never';
        } else if (config.requireApproval === false) {
          tool.require_approval = 'never';
        } else if (typeof config.requireApproval === 'object') {
          tool.require_approval = config.requireApproval;
        }
        // Default is to require approval

        // Add allowed tools filter
        if (config.allowedTools && Array.isArray(config.allowedTools)) {
          tool.allowed_tools = config.allowedTools;
        }

        // Add headers for authentication
        if (config.headers && Object.keys(config.headers).length > 0) {
          tool.headers = config.headers;
        }

        tools.push(tool);
      }
    });

    return tools;
  }

  /**
   * Extract approval requests from response
   * @param {Object} response - OpenAI response object
   * @returns {Array} Array of approval requests
   */
  extractApprovalRequests(response) {
    if (!response.data || !response.data.output) return [];
    
    return response.data.output.filter(item => item.type === 'mcp_approval_request');
  }

  /**
   * Extract MCP tool calls from response
   * @param {Object} response - OpenAI response object
   * @returns {Array} Array of MCP tool calls
   */
  extractMCPCalls(response) {
    if (!response.data || !response.data.output) return [];
    
    return response.data.output.filter(item => item.type === 'mcp_call');
  }

  /**
   * Extract tool lists from response
   * @param {Object} response - OpenAI response object
   * @returns {Array} Array of MCP tool lists
   */
  extractToolLists(response) {
    if (!response.data || !response.data.output) return [];
    
    return response.data.output.filter(item => item.type === 'mcp_list_tools');
  }
}

module.exports = MCPGateway;

