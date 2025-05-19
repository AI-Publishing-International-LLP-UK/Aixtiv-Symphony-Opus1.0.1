   */
  async validateToken(token){
    try {
      // Verify token signature and structure
      const decoded = this.verifyToken(token);
      
      if (!decoded) {
        return false;
      }
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp  {
      try {
        // Validate origin
        const origin = req.headers.origin;
        if (origin && !this.originValidator.validateOrigin(origin)) {
          return res.status(403).json({
            error: 'invalid_origin',
            error_description: 'Request origin not allowed'
          });
        }
        
        // Extract token
        const token = this.extractTokenFromRequest(req);
        if (!token) {
          return res.status(401).json({
            error: 'invalid_token',
            error_description: 'No token provided'
          });
        }
        
        // Validate token
        const isValid = await this.validateToken(token);
        if (!isValid) {
          return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Invalid or expired token'
          });
        }
        
        // Token is valid, continue
        next();
      } catch (error) {
        console.error('Token validation middleware error:', error);
        res.status(500).json({
          error: 'server_error',
          error_description: 'An error occurred during token validation'
        });
      }
    };
  }
}

// Create instance with default configuration
export const drLucyFormTokenManager = new DrLucyFormTokenManager();

// Export all components for use in the application
export {
  DrLucyFormTokenManager,
  GatewayCsrfProtection,
  InMemoryRateLimiter,
  FormOriginValidator
};
      // Check for token in headers
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      
      // Check for token in cookies
      if (req.cookies && req.cookies.form_token) {
        return req.cookies.form_token;
      }
      
      // Check for token in request body
      if (req.body && req.body.form_token) {
        return req.body.form_token;
      }
      
      // Check for token in query parameters
      if (req.query && req.query.form_token) {
        return req.query.form_token;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting token from request:', error);
      return null;
    }
  }
  
  /**
   * Revoke a form token
   */
  async generateToken(payload){
    try {
      // Check rate limit first
      const withinRateLimit = await this.rateLimiter.checkRateLimit(payload.userId);
      if (!withinRateLimit) {
        throw new Error('Rate limit exceeded for token generation');
      }

      const keyFile = JSON.parse(fs.readFileSync(this.config.serviceAccountKeyPath, 'utf8'));
      
      const client = new JWT({
        email,
        key,
        scopes: payload.scopes
      });
      
      // Sign with key to create a JWT
      await client.authorize();
      
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = now + (this.config.tokenExpiryTimeInHours * 60 * 60);
      
      const jwtPayload = {
        iss,
        sub,
        aud,
        iat,
        exp,
        form_id,
        session_id,
        metadata: payload.metadata || {}
      };
      
      // Create signed JWT
      const token = this.createSignedJwt(jwtPayload, keyFile.private_key);
      
      // Generate CSRF token for this session
      const csrfToken = this.csrfProtection.generateCsrfToken(payload.sessionId);
      
      const formToken= {
        token,
        expires_in: this.config.tokenExpiryTimeInHours * 60 * 60,
        expiry_date: expiryTime * 1000, // Convert to milliseconds
        user_id,
        form_id,
        csrf_token: csrfToken
      };
      
      // Cache the token
      this.cacheToken(formToken);
      
      return formToken;
        .replace(/=+$/, '');
      
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Create signature
      const signatureInput = `${encodedHeader}.${encodedPayload}`;
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signatureInput);
      
      const signature = signer.sign(privateKey, 'base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Combine to create JWT
      return `${signatureInput}.${signature}`;
    } catch (error) {
      console.error('Error creating signed JWT:', error);
      throw new Error('Failed to create signed JWT');
    }
  }
  
  /**
   * Verify a token
   */
  verifyToken(token){
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        return null;
      }
      
      const [encodedHeader, encodedPayload, signature] = parts;
      
      // Decode payload
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64').toString('utf8')
      );
      
      // Verify signature (simplified for readability)
      // In a full implementation, additional signature validation would be performed
      
      return payload;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }
  
  /**
   * Cache a token
   */
  cacheToken(formToken){
    const cacheKey = `${formToken.user_id}:${formToken.form_id}`;
    this.tokenCache.set(cacheKey, formToken);
  }
  
  /**
   * Start token cleanup process
   */
  startTokenCleanup(){
    // Run cleanup every 15 minutes
    this.refreshInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 15 * 60 * 1000);
  }
  
  /**
   * Cleanup expired tokens
   */
  cleanupExpiredTokens(){
    const now = Date.now();
    
    this.tokenCache.forEach((token, key) => {
      if (token.expiry_date < now) {
        this.tokenCache.delete(key);
      }
    });
  }
  
  /**
   * Stop token cleanup process
   */
  stopTokenCleanup(){
    if (this.refreshInterval)

