const { expect } = require('chai');
const sinon = require('sinon');
const BaseGateway = require('../../../services/gateway/BaseGateway');

describe('BaseGateway', () => {
  let baseGateway;
  let loggerMock;

  beforeEach(() => {
    // Create a derived class since BaseGateway is abstract
    class TestGateway extends BaseGateway {
      async _performAuthentication() {
        return { success: true, status: 200 };
      }
    }

    loggerMock = {
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy()
    };

    baseGateway = new TestGateway({ logger: loggerMock });
  });

  it('should not allow direct instantiation', () => {
    expect(() => new BaseGateway()).to.throw('BaseGateway is an abstract class and cannot be instantiated directly');
  });

  it('should call the _performAuthentication method during authenticate', async () => {
    const spy = sinon.spy(baseGateway, '_performAuthentication');
    const context = { requestId: 'test-req-id', userId: 'test-user' };
    
    await baseGateway.authenticate(context);
    
    expect(spy.calledOnce).to.be.true;
    expect(spy.calledWith(context)).to.be.true;
    spy.restore();
  });

  it('should log successful authentication', async () => {
    const context = { requestId: 'test-req-id', userId: 'test-user' };
    
    await baseGateway.authenticate(context);
    
    expect(loggerMock.info.calledWith('Authentication successful', { 
      requestId: context.requestId,
      userId: context.userId 
    })).to.be.true;
  });

  it('should handle errors during authentication', async () => {
    // Create a test gateway that throws an error
    class ErrorGateway extends BaseGateway {
      async _performAuthentication() {
        throw new Error('Test error');
      }
    }
    
    const errorGateway = new ErrorGateway({ logger: loggerMock });
    const context = { requestId: 'test-req-id', userId: 'test-user' };
    
    const result = await errorGateway.authenticate(context);
    
    expect(result.success).to.be.false;
    expect(result.status).to.equal(500);
    expect(result.error.code).to.equal('INTERNAL_ERROR');
    expect(loggerMock.error.called).to.be.true;
  });
});

