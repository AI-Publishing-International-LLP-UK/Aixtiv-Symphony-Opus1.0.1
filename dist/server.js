/**
 * Aixtiv Symphony Integration Gateway
 * The Integration Gateway middleware for auth, routing, and role validation.
 * 
 * Part of the ASOOS (Aixtiv Symphony Orchestrating Operating System)
 */

const express = require('express');
const app = express();
const winston = require('winston');
const path = require('path');
require('dotenv').config();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Import middleware
let authMiddleware;
try {
  authMiddleware = require('./middleware/authentication');
  logger.info('Authentication middleware loaded successfully');
} catch (error) {
  logger.warn('Authentication middleware not found or failed to load:', error.message);
  // Fallback minimal auth middleware
  authMiddleware = (req, res, next) => {
    logger.warn('Using fallback authentication middleware');
    // Simple token validation - replace with actual implementation when available
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    // For development: accept all tokens
    req.user = { id: 'dev-user', role: 'admin' };
    next();
  };
}

// Import gateway services
let gatewayServices = {};
try {
  gatewayServices = require('./services/gateway');
  logger.info('Gateway services loaded successfully');
} catch (error) {
  logger.warn('Gateway services not found or failed to load:', error.message);
}

// Setup middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Setup CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'integration-gateway',
    timestamp: new Date().toISOString() 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Aixtiv Symphony Integration Gateway',
    version: '1.0.0',
    status: 'operational',
    region: process.env.GCP_REGION || 'us-west1'
  });
});

// Version endpoint
app.get('/version', (req, res) => {
  res.status(200).json({
    version: '1.0.0',
    buildDate: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Define routes for authenticated endpoints
// Using path prefixes instead of a separate router for simplicity
const authPrefix = '/api';

// Middleware to protect routes with authentication
app.use(authPrefix, authMiddleware);

// Gateway endpoints
app.get(`${authPrefix}/routes`, (req, res) => {
  // Return available routes based on user role
  const routes = [
    { path: '/health', method: 'GET', description: 'Health check endpoint' },
    { path: '/', method: 'GET', description: 'Root endpoint' },
    { path: '/version', method: 'GET', description: 'Version information' },
    { path: `${authPrefix}/routes`, method: 'GET', description: 'Available routes' },
    { path: `${authPrefix}/token/validate`, method: 'POST', description: 'Validate token' }
  ];
  
  res.status(200).json({ routes });
});

// Token validation
app.post(`${authPrefix}/token/validate`, (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  // Simple validation for development
  res.status(200).json({ 
    valid: true,
    user: req.user,
    expires: new Date(Date.now() + 3600000).toISOString()
  });
});

// Gateway endpoints from services
if (gatewayServices.BaseGateway) {
  logger.info('Setting up gateway endpoints from services');
  
  // Owner Subscriber Gateway
  if (gatewayServices.OwnerSubscriberGateway) {
    let ownerSubscriberGateway;
    try {
      ownerSubscriberGateway = new gatewayServices.OwnerSubscriberGateway();
      app.post(`${authPrefix}/gateway/owner-subscriber/authenticate`, 
        async (req, res) => {
          try {
            const result = await ownerSubscriberGateway.authenticate(req.body);
            res.status(200).json(result);
          } catch (error) {
            logger.error('Owner Subscriber authentication error:', error);
            res.status(401).json({ error: error.message || 'Authentication failed' });
          }
        }
      );
    } catch (error) {
      logger.error('Failed to initialize OwnerSubscriberGateway:', error);
    }
  }
  
  // Team Gateway
  if (gatewayServices.TeamGateway) {
    let teamGateway;
    try {
      teamGateway = new gatewayServices.TeamGateway();
      app.post(`${authPrefix}/gateway/team/authenticate`, 
        async (req, res) => {
          try {
            const result = await teamGateway.authenticate(req.body);
            res.status(200).json(result);
          } catch (error) {
            logger.error('Team authentication error:', error);
            res.status(401).json({ error: error.message || 'Authentication failed' });
          }
        }
      );
    } catch (error) {
      logger.error('Failed to initialize TeamGateway:', error);
    }
  }
  
  // Group Gateway
  if (gatewayServices.GroupGateway) {
    let groupGateway;
    try {
      groupGateway = new gatewayServices.GroupGateway();
      app.post(`${authPrefix}/gateway/group/authenticate`, 
        async (req, res) => {
          try {
            const result = await groupGateway.authenticate(req.body);
            res.status(200).json(result);
          } catch (error) {
            logger.error('Group authentication error:', error);
            res.status(401).json({ error: error.message || 'Authentication failed' });
          }
        }
      );
    } catch (error) {
      logger.error('Failed to initialize GroupGateway:', error);
    }
  }
  
  // Practitioner Gateway
  if (gatewayServices.PractitionerGateway) {
    let practitionerGateway;
    try {
      practitionerGateway = new gatewayServices.PractitionerGateway();
      app.post(`${authPrefix}/gateway/practitioner/authenticate`, 
        async (req, res) => {
          try {
            const result = await practitionerGateway.authenticate(req.body);
            res.status(200).json(result);
          } catch (error) {
            logger.error('Practitioner authentication error:', error);
            res.status(401).json({ error: error.message || 'Authentication failed' });
          }
        }
      );
    } catch (error) {
      logger.error('Failed to initialize PractitionerGateway:', error);
    }
  }
  
  // Enterprise Gateway
  if (gatewayServices.EnterpriseGateway) {
    let enterpriseGateway;
    try {
      enterpriseGateway = new gatewayServices.EnterpriseGateway();
      app.post(`${authPrefix}/gateway/enterprise/authenticate`, 
        async (req, res) => {
          try {
            const result = await enterpriseGateway.authenticate(req.body);
            res.status(200).json(result);
          } catch (error) {
            logger.error('Enterprise authentication error:', error);
            res.status(401).json({ error: error.message || 'Authentication failed' });
          }
        }
      );
    } catch (error) {
      logger.error('Failed to initialize EnterpriseGateway:', error);
    }
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error processing request: ${err.message}`, { error: err, path: req.path });
  
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// Not found middleware
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.path}`,
      status: 404
    }
  });
});

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  logger.info(`Integration Gateway started on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`GCP Region: ${process.env.GCP_REGION || 'us-west1'}`);
});

// Export the app for testing
module.exports = app;

