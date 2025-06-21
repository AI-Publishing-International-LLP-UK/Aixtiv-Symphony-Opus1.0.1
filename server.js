// Main server file for MCP Authorization Service
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const MCPRoutes = require('./services/routes/mcpRoutes');
const logger = require('./services/common/logger');

const app = express();
const port = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['https://chatgpt.com', 'https://chat.openai.com', 'https://drclaude.live'],
  credentials: true
}));

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

// Setup MCP routes
const mcpRoutes = new MCPRoutes({
  // Add any configuration options here
});
app.use('/', mcpRoutes.getRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
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
  logger.info(`MCP Authorization Service running on port ${port}`);
  logger.info('Available endpoints:', {
    discovery: '/.well-known/mcp',
    registration: '/oauth/register',
    authorization: '/oauth/authorize',
    token: '/oauth/token',
    search: '/mcp/search',
    fetch: '/mcp/fetch'
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
