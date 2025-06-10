/**
 * Fastify Authentication Plugin
 * Integrates SallyPort verification with Fastify routes
 */

const fp = require('fastify-plugin');
const { createFastifyAuthHook } = require('../middleware/authentication');

function authPlugin(fastify, options, done) {
  // Register the auth hook as a decorator
  fastify.decorate('sallyPortAuth', createFastifyAuthHook());
  
  // Add a utility decorator for protected routes
  fastify.decorate('protectRoute', function(routeOptions) {
    const preHandler = routeOptions.preHandler || [];
    routeOptions.preHandler = Array.isArray(preHandler) 
      ? [...preHandler, fastify.sallyPortAuth]
      : [preHandler, fastify.sallyPortAuth];
    return routeOptions;
  });
  
  // Add onRoute hook to automatically protect routes with auth option
  fastify.addHook('onRoute', (routeOptions) => {
    if (routeOptions.config && routeOptions.config.auth === true) {
      const preHandler = routeOptions.preHandler || [];
      routeOptions.preHandler = Array.isArray(preHandler) 
        ? [...preHandler, fastify.sallyPortAuth]
        : [preHandler, fastify.sallyPortAuth];
    }
  });
  
  done();
}

module.exports = fp(authPlugin, {
  name: 'authentication',
  fastify: '4.x'
});
