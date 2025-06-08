/**
 * MCP Service
 * Demonstrates how to use the MCPGateway for Remote MCP server interactions
 */

const MCPGateway = require('./gateway/MCPGateway');
const logger = require('./common/logger');

class MCPService {
  constructor(options = {}) {
    // Initialize MCP Gateway with configuration
    this.mcpGateway = new MCPGateway({
      openaiConfig: {
        apiKey: process.env.OPENAI_API_KEY
      },
      sallyPortVerifier: options.sallyPortVerifier,
      mcpServers: {
        // Add custom MCP servers here
        paypal: {
          url: 'https://mcp.paypal.com',
          requireApproval: true,
          allowedTools: ['create_payment', 'get_payment_status'],
          headers: {
            'Authorization': `Bearer ${process.env.PAYPAL_API_KEY || ''}`
          }
        },
        shopify: {
          url: 'https://mcp.shopify.com',
          requireApproval: {
            never: {
              tool_names: ['get_products', 'get_orders']
            }
          },
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || ''
          }
        }
      },
      logger
    });
  }

  /**
   * Execute an authenticated MCP request
   * @param {Object} params - Request parameters
   * @param {Object} params.authContext - Authentication context with SallyPort token
   * @param {string} params.query - User query/input
   * @param {Array} params.mcpServers - MCP servers to use
   * @param {string} params.model - OpenAI model to use
   * @returns {Promise<Object>} MCP response
   */
  async executeRequest(params) {
    const { authContext, query, mcpServers = ['deepwiki'], model = 'gpt-4.1' } = params;

    try {
      // First authenticate the request
      const authResult = await this.mcpGateway.authenticate(authContext);
      
      if (!authResult.success) {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed before MCP request',
            details: authResult.error
          }
        };
      }

      // Execute the MCP request
      const mcpResult = await this.mcpGateway.executeMCPRequest({
        input: query,
        model,
        mcpServers
      });

      if (!mcpResult.success) {
        return mcpResult;
      }

      // Check for approval requests
      const approvalRequests = this.mcpGateway.extractApprovalRequests(mcpResult);
      const mcpCalls = this.mcpGateway.extractMCPCalls(mcpResult);
      const toolLists = this.mcpGateway.extractToolLists(mcpResult);

      return {
        success: true,
        data: {
          response: mcpResult.data,
          output_text: mcpResult.data.output_text,
          approvalRequests,
          mcpCalls,
          toolLists,
          metadata: mcpResult.metadata
        }
      };

    } catch (error) {
      logger.error('MCP Service request failed', { error });
      return {
        success: false,
        error: {
          code: 'MCP_SERVICE_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Handle approval for MCP tool calls
   * @param {Object} params - Approval parameters
   * @param {Object} params.authContext - Authentication context
   * @param {string} params.approvalRequestId - Approval request ID
   * @param {boolean} params.approve - Whether to approve
   * @param {string} params.previousResponseId - Previous response ID
   * @returns {Promise<Object>} Approval response
   */
  async handleApproval(params) {
    const { authContext, approvalRequestId, approve, previousResponseId } = params;

    try {
      // Authenticate the approval request
      const authResult = await this.mcpGateway.authenticate(authContext);
      
      if (!authResult.success) {
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed for approval request'
          }
        };
      }

      // Handle the approval
      const approvalResult = await this.mcpGateway.handleApprovalRequest({
        approvalRequestId,
        approve,
        previousResponseId
      });

      return approvalResult;

    } catch (error) {
      logger.error('MCP approval handling failed', { error });
      return {
        success: false,
        error: {
          code: 'APPROVAL_HANDLING_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * Get available MCP servers
   * @returns {Object} Available MCP servers
   */
  getAvailableServers() {
    return this.mcpGateway.getAvailableMCPServers();
  }

  /**
   * Configure a new MCP server
   * @param {string} label - Server label
   * @param {Object} config - Server configuration
   */
  configureMCPServer(label, config) {
    this.mcpGateway.configureMCPServer(label, config);
  }
}

module.exports = MCPService;

