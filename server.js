const fastify = require('fastify')({ logger: true });
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define port
const PORT = process.env.PORT || 8080;

// Register content type parsers
fastify.register(require('@fastify/cors'));
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/'
});

// Register swagger for API documentation
fastify.register(require('@fastify/swagger'), {
  routePrefix: '/docs',
  swagger: {
    info: {
      title: 'ASOOS API',
      description: 'ASOOS Secret Management System API',
      version: '1.0.0'
    },
    externalDocs: {
      url: 'https://github.com/aixtiv-symphony/asoos-secret-management',
      description: 'Find more info here'
    },
    host: 'localhost:' + PORT,
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json']
  },
  exposeRoute: true
});

// Health check route
fastify.get('/api/health', async (request, reply) => {
  return { 
    status: 'ok', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };
});

// Example API route
fastify.get('/api/status', async (request, reply) => {
  return {
    message: 'Secret Management System is operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
});

// Protected route example (would require actual auth implementation)
fastify.get('/api/secrets/list', {
  schema: {
    description: 'Get a list of available secrets (names only)',
    tags: ['secrets'],
    response: {
      200: {
        type: 'object',
        properties: {
          secrets: { type: 'array', items: { type: 'string' } },
          count: { type: 'integer' }
        }
      }
    }
  },
  handler: async (request, reply) => {
    // This would be replaced with actual implementation
    return {
      secrets: ['api-key-1', 'database-credentials', 'encryption-keys'],
      count: 3
    };
  }
});

// Error handling
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  // Send appropriate error response
  reply.status(error.statusCode || 500).send({
    error: error.name || 'InternalServerError',
    message: error.message || 'An unknown error occurred',
    statusCode: error.statusCode || 500
  });
});

// Catch-all route for SPA if needed
fastify.setNotFoundHandler((request, reply) => {
  if (request.raw.url.startsWith('/api')) {
    reply.status(404).send({ 
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`, 
      statusCode: 404 
    });
  } else {
    reply.sendFile('index.html');
  }
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Server listening on ${fastify.server.address().port}`);
    fastify.log.info(`API documentation available at http://localhost:${PORT}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

