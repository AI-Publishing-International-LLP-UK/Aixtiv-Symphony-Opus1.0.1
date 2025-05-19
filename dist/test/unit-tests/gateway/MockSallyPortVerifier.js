/**
 * Mock SallyPort Verifier for testing
 * Provides a test implementation that simulates SallyPort token verification
 */
class MockSallyPortVerifier {
  /**
   * Creates a new mock verifier
   * @param {Object} options - Configuration for the mock
   */
  constructor(options = {}) {
    this.defaultResponse = options.defaultResponse || {
      isValid: true,
      authLevel: 4.0,
      identity: {
        userId: 'test-user-id',
        email: 'test@example.com',
        roles: ['user']
      },
      metadata: {
        issuer: 'test-issuer',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      },
      reason: null
    };
    
    this.responses = new Map();
    this.callHistory = [];
  }
  
  /**
   * Configure a specific response for a token
   * @param {string} token - The token that will trigger this response
   * @param {Object} response - The response to return
   */
  setResponseForToken(token, response) {
    this.responses.set(token, response);
  }
  
  /**
   * Verify a SallyPort token
   * @param {string} token - The token to verify
   * @returns {Promise<Object>} Verification result
   */
  async verify(token) {
    this.callHistory.push({
      token,
      timestamp: new Date()
    });
    
    // Return configured response for this token if it exists
    if (this.responses.has(token)) {
      return this.responses.get(token);
    }
    
    // Special case for handling invalid token pattern
    if (token === 'invalid-token') {
      return {
        isValid: false,
        authLevel: 0,
        identity: null,
        metadata: null,
        reason: 'Invalid token format'
      };
    }
    
    // Special case for handling expired token pattern
    if (token === 'expired-token') {
      return {
        isValid: false,
        authLevel: 0,
        identity: null,
        metadata: null,
        reason: 'Token expired'
      };
    }
    
    // Special case for handling insufficient auth level
    if (token === 'low-auth-token') {
      return {
        isValid: true,
        authLevel: 2.5,
        identity: {
          userId: 'low-auth-user',
          email: 'lowauth@example.com',
          roles: ['limited-user']
        },
        metadata: {
          issuer: 'test-issuer',
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        },
        reason: null
      };
    }
    
    // Default response for all other tokens
    return this.defaultResponse;
  }
  
  /**
   * Resets the call history
   */
  resetCallHistory() {
    this.callHistory = [];
  }
  
  /**
   * Get the call history
   * @returns {Array} Call history
   */
  getCallHistory() {
    return this.callHistory;
  }
}

module.exports = MockSallyPortVerifier;

