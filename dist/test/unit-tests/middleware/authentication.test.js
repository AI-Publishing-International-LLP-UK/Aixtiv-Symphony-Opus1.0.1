const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('Authentication Middleware', () => {
  let sandbox;
  let authMiddleware;
  let loggerMock;
  let sallyportMock;
  let sallyPortVerifierMock;
  let req;
  let res;
  let next;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Setup mocks
    loggerMock = {
      info: sandbox.spy(),
      warn: sandbox.spy(),
      error: sandbox.spy()
    };

    sallyportMock = {
      getUserSession: sandbox.stub()
    };

    sallyPortVerifierMock = {
      verifyToken: sandbox.stub()
    };

    // Load the middleware with mocked dependencies
    authMiddleware = proxyquire('../../../middleware/authentication', {
      '../services/common/logger': loggerMock,
      '../services/sallyport/sallyport-client': sallyportMock,
      '../auth/security/sallyport-verifier': sallyPortVerifierMock
    });

    // Setup request and response mocks
    req = {
      headers: {},
      user: null
    };

    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
      send: sinon.stub().returnsThis(),
      code: sinon.stub().returnsThis()
    };

    next = sinon.spy();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('authenticateRequest', () => {
    it('should authenticate a request with a valid token', async () => {
      // Setup
      const token = 'valid-token';
      req.headers.authorization = `Bearer ${token}`;
      
      const verificationResult = {
        valid: true,
        userId: 'test-user-id',
        email: 'test@example.com',
        roles: ['admin'],
        permissions: ['read', 'write']
      };
      
      sallyPortVerifierMock.verifyToken.resolves(verificationResult);
      
      // Execute
      await authMiddleware.authenticateRequest(req, res, next);
      
      // Assert
      expect(sallyPortVerifierMock.verifyToken.calledOnceWith(token)).to.be.true;
      expect(req.user).to.deep.equal({
        uuid: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      });
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should reject requests with missing authorization header', async () => {
      // Execute
      await authMiddleware.authenticateRequest(req, res, next);
      
      // Assert
      expect(res.status.calledOnceWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Authorization header missing'
      });
      expect(next.called).to.be.false;
    });

    it('should reject requests with invalid authorization format', async () => {
      // Setup
      req.headers.authorization = 'InvalidFormat';
      
      // Execute
      await authMiddleware.authenticateRequest(req, res, next);
      
      // Assert
      expect(res.status.calledOnceWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Invalid authorization format'
      });
      expect(next.called).to.be.false;
    });

    it('should reject requests with an invalid token', async () => {
      // Setup
      const token = 'invalid-token';
      req.headers.authorization = `Bearer ${token}`;
      
      const verificationResult = {
        valid: false,
        error: 'Token has expired'
      };
      
      sallyPortVerifierMock.verifyToken.resolves(verificationResult);
      
      // Execute
      await authMiddleware.authenticateRequest(req, res, next);
      
      // Assert
      expect(sallyPortVerifierMock.verifyToken.calledOnceWith(token)).to.be.true;
      expect(res.status.calledOnceWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Token has expired'
      });
      expect(next.called).to.be.false;
    });

    it('should handle errors during token verification', async () => {
      // Setup
      const token = 'error-token';
      req.headers.authorization = `Bearer ${token}`;
      
      const error = new Error('Verification service unavailable');
      sallyPortVerifierMock.verifyToken.rejects(error);
      
      // Execute
      await authMiddleware.authenticateRequest(req, res, next);
      
      // Assert
      expect(sallyPortVerifierMock.verifyToken.calledOnceWith(token)).to.be.true;
      expect(loggerMock.error.calledOnce).to.be.true;
      expect(res.status.calledOnceWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Authentication failed'
      });
      expect(next.called).to.be.false;
    });

    it('should handle missing user properties', async () => {
      // Setup
      const token = 'minimal-token';
      req.headers.authorization = `Bearer ${token}`;
      
      const verificationResult = {
        valid: true,
        userId: 'test-user-id'
        // No email, roles, or permissions
      };
      
      sallyPortVerifierMock.verifyToken.resolves(verificationResult);
      
      // Execute
      await authMiddleware.authenticateRequest(req, res, next);
      
      // Assert
      expect(req.user).to.deep.equal({
        uuid: 'test-user-id',
        email: 'unknown',
        role: 'user',
        permissions: []
      });
      expect(next.calledOnce).to.be.true;
    });
  });

  describe('authorizePermissions', () => {
    beforeEach(() => {
      // Setup a user with permissions
      req.user = {
        uuid: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write', 'delete']
      };
    });

    it('should authorize when user has all required permissions', async () => {
      // Setup
      const requiredPermissions = ['read', 'write'];
      const middleware = authMiddleware.authorizePermissions(requiredPermissions);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should reject when user lacks required permissions', async () => {
      // Setup
      const requiredPermissions = ['read', 'admin'];
      const middleware = authMiddleware.authorizePermissions(requiredPermissions);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(loggerMock.warn.calledOnce).to.be.true;
      expect(res.status.calledOnceWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(next.called).to.be.false;
    });

    it('should proceed when no permissions are required', async () => {
      // Setup - empty array of permissions
      const middleware = authMiddleware.authorizePermissions([]);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should proceed when permissions argument is null/undefined', async () => {
      // Setup - null permissions
      const middleware = authMiddleware.authorizePermissions(null);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should reject when request is not authenticated', async () => {
      // Setup
      req.user = null;
      const requiredPermissions = ['read'];
      const middleware = authMiddleware.authorizePermissions(requiredPermissions);
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(res.status.calledOnceWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Authentication required'
      });
      expect(next.called).to.be.false;
    });

    it('should handle errors during authorization', async () => {
      // Setup
      const requiredPermissions = ['read'];
      const middleware = authMiddleware.authorizePermissions(requiredPermissions);
      
      // Cause an error by making user.permissions not iterable
      req.user.permissions = null;
      
      // Execute
      await middleware(req, res, next);
      
      // Assert
      expect(loggerMock.error.calledOnce).to.be.true;
      expect(res.status.calledOnceWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Authorization failed'
      });
      expect(next.called).to.be.false;
    });
  });

  describe('createFastifyAuthHook', () => {
    let fastifyHook;
    let fastifyRequest;
    let fastifyReply;

    beforeEach(() => {
      fastifyHook = authMiddleware.createFastifyAuthHook();
      
      fastifyRequest = {
        headers: {},
        user: null
      };
      
      fastifyReply = {
        code: sinon.stub().returnsThis(),
        send: sinon.stub().returnsThis()
      };

      // Modify our authenticateRequest stub
      authMiddleware.authenticateRequest = sinon.stub();
    });

    it('should authenticate and attach user to Fastify request', async () => {
      // Setup
      fastifyRequest.headers.authorization = 'Bearer valid-token';
      
      // Simulate successful authentication that sets user on the req object
      authMiddleware.authenticateRequest.callsFake((req, res, next) => {
        req.user = {
          uuid: 'fastify-user',
          email: 'fastify@example.com',
          role: 'admin',
          permissions: ['read', 'write']
        };
        next();
      });
      
      // Execute
      await fastifyHook(fastifyRequest, fastifyReply);
      
      // Assert
      expect(authMiddleware.authenticateRequest.calledOnce).to.be.true;
      expect(fastifyRequest.user).to.deep.equal({
        uuid: 'fastify-user',
        email: 'fastify@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      });
      expect(fastifyReply.code.called).to.be.false;
      expect(fastifyReply.send.called).to.be.false;
    });

    it('should handle authentication failure in Fastify hook', async () => {
      // Setup
      fastifyRequest.headers.authorization = 'Bearer invalid-token';
      
      // Simulate authentication failure
      authMiddleware.authenticateRequest.callsFake((req, res, next) => {
        res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      });
      
      // Execute
      await fastifyHook(fastifyRequest, fastifyReply);
      
      // Assert
      expect(authMiddleware.authenticateRequest.calledOnce).to.be.true;
      expect(fastifyReply.code.calledOnceWith(401)).to.be.true;
      expect(fastifyReply.send.calledOnce).to.be.true;
      expect(fastifyReply.send.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should handle unexpected errors during Fastify authentication', async () => {
      // Setup
      fastifyRequest.headers.authorization = 'Bearer error-token';
      
      // Simulate authenticateRequest throwing an unexpected error
      authMiddleware.authenticateRequest.callsFake(() => {
        throw new Error('Unexpected error');
      });
      
      // Execute
      await fastifyHook(fastifyRequest, fastifyReply);
      
      // Assert
      expect(authMiddleware.authenticateRequest.calledOnce).to.be.true;
      expect(loggerMock.error.calledOnce).to.be.true;
      expect(fastifyReply.code.calledOnceWith(401)).to.be.true;
      expect(fastifyReply.send.calledOnce).to.be.true;
      expect(fastifyReply.send.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Authentication failed'
      });
    });

    it('should handle authentication rejection', async () => {
      // Setup - Simulate the Promise.reject in the authenticateRequest
      authMiddleware.authenticateRequest.callsFake((req, res, next) => {
        next(new Error('Authentication rejected'));
      });
      
      // Execute
      await fastifyHook(fastifyRequest, fastifyReply);
      
      // Assert
      expect(authMiddleware.authenticateRequest.calledOnce).to.be.true;
      expect(loggerMock.error.calledOnce).to.be.true;
      expect(fastifyReply.code.calledOnceWith(401)).to.be.true;
      expect(fastifyReply.send.calledOnce).to.be.true;
      expect(fastifyReply.send.firstCall.args[0]).to.deep.equal({
        success: false,
        message: 'Authentication failed'
      });
    });
  });
});
