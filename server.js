// Main server file for MCP Authorization Service
const express = require('express');
const path = require('path');

// Initialize basic logger first
let logger;
try {
  logger = require('./services/common/logger');
} catch (error) {
  // Fallback logger if winston is not available
  logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
  };
}

// Try to load optional dependencies
let cors, helmet;
try {
  cors = require('cors');
  helmet = require('helmet');
} catch (error) {
  logger.warn('Optional security middleware not available', { error: error.message });
}

// Check if we have the MCP routes available
let MCPRoutes;
try {
  MCPRoutes = require('./services/routes/mcpRoutes');
  logger.info('MCP routes module loaded successfully');
} catch (error) {
  logger.warn('MCP routes not available, running basic server', { error: error.message });
}

const app = express();
const port = process.env.PORT || 8080;

// Security middleware (if available)
if (helmet) {
  app.use(helmet());
}

if (cors) {
  app.use(cors({
    origin: ['https://chatgpt.com', 'https://chat.openai.com', 'https://drclaude.live'],
    credentials: true
  }));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

<<<<<<< HEAD
// Setup MCP routes if available
if (MCPRoutes) {
  try {
    const mcpRoutes = new MCPRoutes({
      // Add any configuration options here
    });
    app.use('/', mcpRoutes.getRouter());
    logger.info('MCP routes loaded successfully');
  } catch (error) {
    logger.error('Failed to initialize MCP routes', { error: error.message });
    // Continue with basic routes
    MCPRoutes = null;
  }
}

// Basic routes for when MCP is not available or failed to load
if (!MCPRoutes) {
  // OAuth 2.0 Discovery endpoint - Required by ChatGPT
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const baseUrl = `https://${req.get('host')}`;
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      revocation_endpoint: `${baseUrl}/oauth/revoke`,
      scopes_supported: ['mcp:read', 'mcp:write', 'mcp:search', 'mcp:fetch'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256']
    });
  });
  
  // MCP Discovery endpoint
  app.get('/.well-known/mcp', (req, res) => {
    const baseUrl = `https://${req.get('host')}`;
    res.json({
      server_info: {
        name: 'Aixtiv Symphony MCP Server',
        version: '1.0.0',
        description: 'MCP server for Aixtiv Symphony integration gateway'
      },
      authorization: {
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        registration_endpoint: `${baseUrl}/oauth/register`,
        scopes_supported: ['mcp:read', 'mcp:write', 'mcp:search', 'mcp:fetch'],
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
                description: 'Search query for Aixtiv Symphony resources.'
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
    });
  });
  
  // OAuth Dynamic Client Registration
  app.post('/oauth/register', (req, res) => {
    const { client_name, redirect_uris, scope = 'mcp:read' } = req.body;
    
    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris)) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_name and redirect_uris are required'
      });
    }
    
    // Generate mock client ID for basic functionality
    const clientId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.status(201).json({
      client_id: clientId,
      client_name,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope,
      token_endpoint_auth_method: 'client_secret_post'
    });
  });
  
  // OAuth Authorization endpoint
  app.get('/oauth/authorize', (req, res) => {
    const { client_id, redirect_uri, scope, state, code_challenge } = req.query;
    
    if (!client_id || !redirect_uri) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_id and redirect_uri are required'
      });
    }
    
    // For basic mode, auto-approve and generate a mock auth code
    const authCode = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) redirectUrl.searchParams.set('state', state);
    
    res.redirect(302, redirectUrl.toString());
  });
  
  // OAuth Token endpoint
  app.post('/oauth/token', (req, res) => {
    const { grant_type, code, client_id, redirect_uri } = req.body;
    
    if (grant_type !== 'authorization_code') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      });
    }
    
    if (!code || !client_id) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'code and client_id are required'
      });
    }
    
    // Generate mock tokens for basic functionality
    const accessToken = `mcp_access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const refreshToken = `mcp_refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: 'mcp:read mcp:search mcp:fetch'
    });
  });
  
  // MCP Search tool
  app.post('/mcp/search', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Valid access token required'
      });
    }
    
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'query parameter is required'
      });
    }
    
    // Mock search results
    const results = [
      {
        id: `result_${Date.now()}_1`,
        title: `Search result for: ${query}`,
        text: `This is a sample search result for the query "${query}" from Aixtiv Symphony integration gateway.`,
        url: `https://${req.get('host')}/resources/sample-1`
      },
      {
        id: `result_${Date.now()}_2`,
        title: `Integration Guide: ${query}`,
        text: `Comprehensive guide about ${query} integration patterns and best practices.`,
        url: `https://${req.get('host')}/resources/sample-2`
      }
    ];
    
    res.json({
      content: [{
        type: 'text',
        text: JSON.stringify({ results })
      }]
    });
  });
  
  // MCP Fetch tool
  app.post('/mcp/fetch', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Valid access token required'
      });
    }
    
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'id parameter is required'
      });
    }
    
    // Mock fetch result
    const document = {
      id,
      title: `Document ${id}`,
      text: `This is the detailed content for document ${id}. It contains comprehensive information about Aixtiv Symphony integration capabilities, including OAuth 2.0 authentication, MCP protocol implementation, and various service integrations.`,
      url: `https://${req.get('host')}/resources/${id}`,
      metadata: {
        type: 'integration_guide',
        created_at: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    res.json({
      content: [{
        type: 'text',
        text: JSON.stringify(document)
      }]
    });
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.3',
    timestamp: new Date().toISOString(),
    mcp_available: !!MCPRoutes,
    dependencies: {
      cors: !!cors,
      helmet: !!helmet,
      mcp_routes: !!MCPRoutes
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const baseUrl = `https://${req.get('host')}`;
  res.json({
    name: 'Aixtiv Symphony Integration Gateway',
    version: process.env.npm_package_version || '1.0.3',
    status: 'running',
    mode: MCPRoutes ? 'full' : 'basic',
    endpoints: {
      health: '/health',
      mcp_discovery: '/.well-known/mcp',
      oauth_discovery: '/.well-known/oauth-authorization-server',
      oauth_register: '/oauth/register',
      oauth_authorize: '/oauth/authorize',
      oauth_token: '/oauth/token',
      mcp_search: '/mcp/search',
      mcp_fetch: '/mcp/fetch'
    },
    message: MCPRoutes ? 'All services available' : 'Running in basic mode with mock OAuth and MCP tools',
    documentation: {
      mcp_spec: 'https://modelcontextprotocol.io/introduction',
      oauth_discovery: `${baseUrl}/.well-known/oauth-authorization-server`,
      mcp_discovery: `${baseUrl}/.well-known/mcp`
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'internal_server_error',
    error_description: 'An internal server error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    error_description: 'The requested resource was not found'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  logger.info(`Integration Gateway server running on port ${port}`);
  logger.info('Server mode:', MCPRoutes ? 'Full MCP functionality' : 'Basic mode');
  logger.info('Available endpoints:', {
    root: '/',
    health: '/health',
    discovery: '/.well-known/mcp',
    registration: '/oauth/register'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

=======
// Root path
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AIXTIV Symphony API running',
    endpoints: ['/claude-code-generate'],
  });
});

// Mock endpoint for Claude code generation
app.post('/claude-code-generate', (req, res) => {
  const { task, language } = req.body;

  console.log(`Received code generation request for task: "${task}" in ${language}`);

  // Simple mock response
  const mockResponse = {
    status: 'completed',
    code: `// Generated ${language} code for: ${task}\n\nfunction helloWorld() {\n  console.log("Hello, world!");\n  return "Hello, world!";\n}\n\n// Call the function\nhelloWorld();`,
    explanation: `This is a simple ${language} function that logs and returns "Hello, world!".`,
  };

  res.json(mockResponse);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Claude Code Generate API available at http://localhost:${PORT}/claude-code-generate`
  );
});
>>>>>>> 89e66f3 (Comprehensive update for aixtiv-cli infrastructure and dependencies)
