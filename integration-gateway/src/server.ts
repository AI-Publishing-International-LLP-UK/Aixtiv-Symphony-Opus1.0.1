/**
 * Main server file for Aixtiv Symphony Integration Gateway
 * 
 * This module exports the createServer function that sets up the Express application
 * with middleware, routes, and error handling for the integration gateway.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { URL } from 'url';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'integration-gateway' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Interface for MCP routes class
interface MCPRoutesClass {
  getRouter: () => express.Router;
}

/**
 * Creates and configures an Express application for the Integration Gateway
 * @returns Configured Express application
 */
export function createServer(): Express {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false // Allow embedding
  }));

  // CORS middleware
  app.use(cors({
    origin: [
      'https://chatgpt.com', 
      'https://chat.openai.com', 
      'https://drclaude.live', 
      'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Cookie parser middleware
  app.use(cookieParser());

  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'claude-oauth2-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    next();
  });

  // Check if we have the MCP routes available
  let MCPRoutes: any;
  try {
    // Using dynamic import for optional dependencies
    MCPRoutes = require('../services/routes/mcpRoutes');
    logger.info('MCP routes module loaded successfully');
  } catch (error) {
    const err = error as Error;
    logger.warn('MCP routes not available, running basic server', { error: err.message });
  }

  // Load Claude OAuth2 routes
  let claudeAuthRoutes: express.Router | null = null;
  try {
    // Import the Claude auth routes
    claudeAuthRoutes = require('./routes/claude-auth').default;
    logger.info('Claude OAuth2 routes loaded successfully');
  } catch (error) {
    const err = error as Error;
    logger.warn('Claude OAuth2 routes not available', { error: err.message });
  }

  // Setup MCP routes if available
  if (MCPRoutes) {
    try {
      const mcpRoutes = new MCPRoutes({
        // Add any configuration options here
      }) as MCPRoutesClass;
      app.use('/', mcpRoutes.getRouter());
      logger.info('MCP routes loaded successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to initialize MCP routes', { error: err.message });
      // Continue with basic routes
      MCPRoutes = null;
    }
  }

  // Setup Claude OAuth2 routes if available
  if (claudeAuthRoutes) {
    try {
      app.use('/auth/claude', claudeAuthRoutes);
      
      // Set up callback handlers
      app.use('/oauth/callback', (req: Request, res: Response) => {
        // Redirect to Claude callback handler
        res.redirect(`/auth/claude/callback${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
      });
      
      app.use('/mcp/auth/callback', (req: Request, res: Response) => {
        // Redirect to Claude MCP callback handler
        res.redirect(`/auth/claude/mcp/auth/callback${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
      });
      
      logger.info('Claude OAuth2 routes loaded successfully');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to initialize Claude OAuth2 routes', { error: err.message });
      claudeAuthRoutes = null;
    }
  }

  // Basic routes for when MCP is not available or failed to load
  if (!MCPRoutes) {
    // OAuth 2.0 Discovery endpoint - Required by ChatGPT
    app.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseUrl = `${protocol}://${req.get('host')}`;
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
    app.get('/.well-known/mcp', (req: Request, res: Response) => {
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseUrl = `${protocol}://${req.get('host')}`;
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
    app.post('/oauth/register', (req: Request, res: Response) => {
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
    app.get('/oauth/authorize', (req: Request, res: Response) => {
      const { client_id, redirect_uri, scope, state, code_challenge } = req.query;
      
      if (!client_id || !redirect_uri) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'client_id and redirect_uri are required'
        });
      }
      
      // For basic mode, auto-approve and generate a mock auth code
      const authCode = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const redirectUrl = new URL(redirect_uri as string);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state as string);
      
      res.redirect(302, redirectUrl.toString());
    });
    
    // OAuth Token endpoint
    app.post('/oauth/token', (req: Request, res: Response) => {
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
    app.post('/mcp/search', (req: Request, res: Response) => {
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
    app.post('/mcp/fetch', (req: Request, res: Response) => {
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
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: process.env.npm_package_version || '1.0.3',
      timestamp: new Date().toISOString(),
      mcp_available: !!MCPRoutes,
      claude_oauth2_available: !!claudeAuthRoutes,
      dependencies: {
        cors: true,
        helmet: true,
        mcp_routes: !!MCPRoutes,
        claude_auth: !!claudeAuthRoutes
      }
    });
  });

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${req.get('host')}`;
    
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
        mcp_fetch: '/mcp/fetch',
        claude_auth: '/auth/claude/login',
        claude_callback: '/oauth/callback',
        claude_status: '/auth/claude/status'
      },
      message: MCPRoutes && claudeAuthRoutes ? 'All services available' : 
               (MCPRoutes ? 'MCP services available' : 
               (claudeAuthRoutes ? 'Claude OAuth2 services available' : 'Running in basic mode')),
      documentation: {
        mcp_spec: 'https://modelcontextprotocol.io/introduction',
        oauth_discovery: `${baseUrl}/.well-known/oauth-authorization-server`,
        mcp_discovery: `${baseUrl}/.well-known/mcp`,
        claude_auth: `${baseUrl}/auth/claude/status`
      }
    });
  });

  // Mock endpoint for Claude code generation
  app.post('/claude-code-generate', (req: Request, res: Response) => {
    const { task, language } = req.body;

    logger.info(`Received code generation request for task: "${task}" in ${language}`);

    // Simple mock response
    const mockResponse = {
      status: 'completed',
      code: `// Generated ${language} code for: ${task}\n\nfunction helloWorld() {\n  console.log("Hello, world!");\n  return "Hello, world!";\n}\n\n// Call the function\nhelloWorld();`,
      explanation: `This is a simple ${language} function that logs and returns "Hello, world!".`,
    };

    res.json(mockResponse);
  });

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({
      error: 'internal_server_error',
      error_description: 'An internal server error occurred'
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'not_found',
      error_description: 'The requested resource was not found'
    });
  });

  return app;
}

// Export the createServer function
export default createServer;
