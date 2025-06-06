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
  app.get('/.well-known/mcp', (req, res) => {
    res.json({
      server_info: {
        name: 'Aixtiv Symphony MCP Server',
        version: '1.0.0',
        description: 'MCP server for Aixtiv Symphony integration gateway (basic mode)'
      },
      message: 'MCP routes not fully loaded - some dependencies missing',
      status: 'partial_functionality'
    });
  });
  
  app.post('/oauth/register', (req, res) => {
    res.status(503).json({
      error: 'service_unavailable',
      error_description: 'OAuth registration temporarily unavailable - dependencies loading'
    });
  });
  
  app.post('/oauth/authorize', (req, res) => {
    res.status(503).json({
      error: 'service_unavailable',
      error_description: 'OAuth authorization temporarily unavailable - dependencies loading'
    });
  });
  
  app.post('/oauth/token', (req, res) => {
    res.status(503).json({
      error: 'service_unavailable',
      error_description: 'OAuth token endpoint temporarily unavailable - dependencies loading'
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
  res.json({
    name: 'Aixtiv Symphony Integration Gateway',
    version: process.env.npm_package_version || '1.0.3',
    status: 'running',
    mode: MCPRoutes ? 'full' : 'basic',
    endpoints: {
      health: '/health',
      mcp_discovery: '/.well-known/mcp',
      oauth_register: '/oauth/register',
      oauth_authorize: '/oauth/authorize',
      oauth_token: '/oauth/token'
    },
    message: MCPRoutes ? 'All services available' : 'Running in basic mode - some features may be limited'
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

