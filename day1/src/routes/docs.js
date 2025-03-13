const express = require('express');
const router = express.Router();
const swaggerUI = require('swagger-ui-express');

// OpenAPI specification
const apiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Integration Gateway API',
    version: '1.0.0',
    description: 'API documentation for Day1 Integration Gateway'
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:8080',
      description: 'Local development server'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Monitoring'],
        summary: 'Health check endpoint',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/metrics': {
      get: {
        tags: ['Monitoring'],
        summary: 'Get system metrics',
        responses: {
          '200': {
            description: 'System metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    requests: { type: 'object' },
                    system: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/validate': {
      post: {
        tags: ['Integration'],
        summary: 'Validate request payload',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object' }
                },
                required: ['data']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Validation successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

router.use('/docs', swaggerUI.serve, swaggerUI.setup(apiSpec));
router.get('/api-spec', (req, res) => res.json(apiSpec));

module.exports = router;

