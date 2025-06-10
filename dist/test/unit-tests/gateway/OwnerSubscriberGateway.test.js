const { expect } = require('chai');
const sinon = require('sinon');
const OwnerSubscriberGateway = require('../../../services/gateway/OwnerSubscriberGateway');
const BaseGateway = require('../../../services/gateway/BaseGateway');
const MockSallyPortVerifier = require('./MockSallyPortVerifier');

describe('OwnerSubscriberGateway', () => {
  let gateway;
  let mockSallyPortVerifier;
  let loggerMock;
  let ownerSubscriberServiceMock;

  beforeEach(() => {
    mockSallyPortVerifier = new MockSallyPortVerifier();
    
    loggerMock = {
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy()
    };
    
    ownerSubscriberServiceMock = {
      getOwnerSubscriber: sinon.stub().resolves({ id: 'test-owner-id', status: 'active' })
    };
    
    gateway = new OwnerSubscriberGateway({
      logger: loggerMock,
      sallyPortVerifier: mockSallyPortVerifier,
      ownerSubscriberService: ownerSubscriberServiceMock
    });
  });

  it('should extend BaseGateway', () => {
    expect(gateway).to.be.instanceOf(BaseGateway);
  });

  it('should require ownerSubscriberService dependency', () => {
    expect(() => new OwnerSubscriberGateway({
      logger: loggerMock,
      sallyPortVerifier: mockSallyPortVerifier
    })).to.throw('ownerSubscriberService is required for OwnerSubscriberGateway');
  });

  describe('_performAuthentication', () => {
    it('should verify the sallyPortToken', async () => {
      const context = {
        requestId: 'test-req-id',
        userId: 'test-user',
        sallyPortToken: 'valid-token'
      };
      
      const spy = sinon.spy(mockSallyPortVerifier, 'verify');
      
      await gateway._performAuthentication(context);
      
      expect(spy.calledOnce).to.be.true;
      expect(spy.calledWith('valid-token')).to.be.true;
      spy.restore();
    });

    it('should return success for valid token with sufficient auth level', async () => {
      const context = {
        requestId: 'test-req-id',
        userId: 'test-user',
        sallyPortToken: 'valid-token'
      };
      
      const result = await gateway._performAuthentication(context);
      
      expect(result.success).to.be.true;
      expect(result.status).to.equal(200);
      expect(context.sallyPortVerification).to.exist;
    });

    it('should return error for invalid token', async () => {
      const context = {
        requestId: 'test-req-id',
        userId: 'test-user',
        sallyPortToken: 'invalid-token'
      };
      
      const result = await gateway._performAuthentication(context);
      
      expect(result.success).to.be.false;
      expect(result.status).to.equal(401);
      expect(result.error.code).to.equal('UNAUTHORIZED');
    });

    it('should return error for low auth level token', async () => {
      const context = {
        requestId: 'test-req-id',
        userId: 'test-user',
        sallyPortToken: 'low-auth-token'
      };
      
      // Set up the low auth level token response
      mockSallyPortVerifier.setResponseForToken('low-auth-token', {
        isValid: true,
        authLevel: 2.5,  // Below the required 3.5
        identity: { userId: 'low-auth-user' },
        metadata: {}
      });
      
      // Verify authentication fails due to low auth level
      const result = await gateway.authenticate(context);
      
      expect(result.success).to.be.false;
    });

    it('should handle errors during SallyPort verification', async () => {
      const context = {
        requestId: 'test-req-id',
        userId: 'test-user',
        sallyPortToken: 'error-token'
      };
      
      // Make the verify method throw an error
      sinon.stub(mockSallyPortVerifier, 'verify').rejects(new Error('Verification error'));
      
      const result = await gateway._performAuthentication(context);
      
      expect(result.success).to.be.false;
      expect(result.status).to.equal(500);
      expect(result.error.code).to.equal('SALLYPORT_ERROR');
      
      mockSallyPortVerifier.verify.restore();
    });
  });
});

