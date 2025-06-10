/**
 * Google OAuth2 Implementation with Auto Token Renewal
 * For Integration Gateway Authentication
 */

import axios from 'axios';
import crypto from 'crypto';

/**
 * OAuth2 Configuration Interface
 */
export 

/**
 * Google-specific User Information Interface
 */
export 

/**
 * Token Management Interface
 */
export 

/**
 * Token Renewal Strategy Interface
 */
export 

/**
 * Google OAuth2 Service with Auto Renewal
 */
export class GoogleOAuth2Service {
  config;
  tokenCache= new Map();
  renewalStrategy;
  renewalIntervalMs= 60000; // Check tokens every minute
  renewalInterval= null;

  constructor(config, renewalStrategy?) {
    this.config = config;

    // Default renewal strategy checks if token expires in less than 5 minutes
    this.renewalStrategy = renewalStrategy || {
      shouldRenew: (tokenSet)=> {
        if (!tokenSet.expiry_date || !tokenSet.refresh_token) return false;
        const fiveMinutesInMs = 5 * 60 * 1000;
        return tokenSet.expiry_date - Date.now()  {
        if (!tokenSet.refresh_token) {
          throw new Error('No refresh token available');
        }
        return this.refreshAccessToken(tokenSet.refresh_token);
      },
    };

    // Start the auto-renewal process
    this.startAutoRenewal();
  }

  /**
   * Generate Authorization URL for OAuth2
   */
  generateAuthorizationUrl(
    state?,
    nonce?,
    promptType: 'none' | 'consent' | 'select_account' = 'consent'
  ){
    // Generate state and nonce if not provided
    const authState = state || this.generateSecureToken();
    const authNonce = nonce || this.generateSecureToken();

    // Construct authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id,
      redirect_uri,
      scope: this.config.scopes.join(' '),
      state,
      nonce,
      prompt,
      access_type: 'offline', // Request a refresh token
    });

    return `${this.config.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange Authorization Code for Tokens
   */
  async exchangeAuthorizationCode(
    authorizationCode){
    try {
      const response = await axios.post(
        this.config.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
          client_id,
          client_secret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenSet= {
        access_token,
        id_token,
        token_type,
        expires_in,
        refresh_token,
        scope,
        // Calculate expiry date
        expiry_date) + response.data.expires_in * 1000,
      };

      // Cache the token set
      this.cacheTokenSet(tokenSet);

      return tokenSet;
    } catch (error) {
      console.error('Token exchange failed', error);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Refresh Access Token
   */
  async refreshAccessToken(refreshToken){
    try {
      const response = await axios.post(
        this.config.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token,
          client_id,
          client_secret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Create a new token set with the refreshed token
      // Note: Google typically doesn't return a new refresh token
      const tokenSet= {
        access_token,
        token_type,
        expires_in,
        // Keep the original refresh token if not provided in response
        refresh_token,
        scope,
        id_token,
        // Calculate expiry date
        expiry_date) + response.data.expires_in * 1000,
      };

      // Update cache with new token set
      this.cacheTokenSet(tokenSet);

      return tokenSet;
    } catch (error) {
      console.error('Token refresh failed', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get User Information
   */
  async getUserInfo(accessToken?){
    // Use provided token or retrieve from cache
    const token = accessToken || this.getAccessTokenFromCache();

    try {
      const response = await axios.get(this.config.userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      return {
        sub,
        name,
        given_name,
        family_name,
        picture,
        email,
        email_verified,
        locale,
        hd, // Hosted domain for Google Workspace accounts
      };
    } catch (error) {
      console.error('User info retrieval failed', error);
      throw new Error('Failed to retrieve user information');
    }
  }

  /**
   * Revoke Token
   */
  async revokeToken(token){
    try {
      await axios.post(
        this.config.revokeEndpoint,
        new URLSearchParams({
          token,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Remove from cache if present
      this.tokenCache.forEach((tokenSet, key) => {
        if (
          tokenSet.access_token === token ||
          tokenSet.refresh_token === token
        ) {
          this.tokenCache.delete(key);
        }
      });

      return true;
    } catch (error) {
      console.error('Token revocation failed', error);
      return false;
    }
  }

  /**
   * Validate ID Token
   * This is a simplified version - in production, you should use a proper
   * JWT validation library and check the signature and claims properly
   */
  validateIdToken(idToken){ valid; payload?: any } {
    try {
      const [header, payload, signature] = idToken.split('.');

      // Decode the payload
      const decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64').toString('utf-8')
      );

      // Check expiration time
      const now = Math.floor(Date.now() / 1000);
      if (decodedPayload.exp && decodedPayload.exp  console.error('Auto-renewal failed:', error));

              // Return the current token anyway, renewal is async
              return tokenSet.access_token;
            } catch (error) {
              console.error('Failed to refresh token:', error);
              // Continue to the next token if refresh fails
              continue;
            }
          }
        } else {
          // Token is still valid
          return tokenSet.access_token;
        }
      }
    }

    throw new Error('No valid access tokens available');
  }

  /**
   * Start auto-renewal process
   */
  startAutoRenewal(){
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
    }

    this.renewalInterval = setInterval(() => {
      this.checkAndRenewTokens().catch(error =>
        console.error('Auto-renewal check failed:', error)
      );
    }, this.renewalIntervalMs);
  }

  /**
   * Stop auto-renewal process
   */
  stopAutoRenewal(){
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
      this.renewalInterval = null;
    }
  }

  /**
   * Check and renew tokens if needed
   */
  async checkAndRenewTokens(){
    for (const [key, tokenSet] of this.tokenCache.entries()) {
      try {
        if (this.renewalStrategy.shouldRenew(tokenSet)) {
          console.log(`Renewing token for key: ${key}`);
          const newTokenSet = await this.renewalStrategy.renewToken(tokenSet);
          this.tokenCache.set(key, newTokenSet);
        }
      } catch (error) {
        console.error(`Failed to renew token for key ${key}:`, error);
      }
    }
  }
}

/**
 * Google OAuth2 Configuration for Integration Gateway
 */
export const IntegrationGatewayOAuth2Config= {
  clientId:
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    '859242575175-65n67dkc0omsbjj7ghgv9i3vpjd92vnl.apps.googleusercontent.com',
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  redirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    'https://integration-gateway-859242575175.us-west1.run.app/auth/callback',
  scopes: [
    'openid',
    'profile',
    'email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
  revokeEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/**
 * Create a singleton instance of the Google OAuth2 service
 */
export const googleOAuth2Service = new GoogleOAuth2Service(
  IntegrationGatewayOAuth2Config
);

/**
 * OAuth2 Authentication Result Interface
 */
export 

/**
 * Integration functions to connect Google OAuth2 with the existing auth system
 */
export class OAuth2Integration {
  service;

  constructor(service= googleOAuth2Service) {
    this.service = service;
  }

  /**
   * Get login URL for OAuth2 authorization
   */
  getLoginUrl(state?){
    return this.service.generateAuthorizationUrl(state);
  }

  /**
   * Handle the OAuth2 callback after user authorization
   */
  async handleCallback(code){
    try {
      // Exchange authorization code for tokens
      const tokenSet = await this.service.exchangeAuthorizationCode(code);

      // Get user information
      const userInfo = await this.service.getUserInfo(tokenSet.access_token);

      return {
        success,
        user,
      };
    } catch (error) {
      console.error('OAuth2 callback handling failed:', error);
      return {
        success,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during OAuth2 callback',
      };
    }
  }

  /**
   * Check if ID token is valid
   */
  isIdTokenValid(idToken){
    const validation = this.service.validateIdToken(idToken);
    return validation.valid;
  }

  /**
   * Add authorization header to outgoing requests
   */
  addAuthToRequest(config, accessToken?){
    const token = accessToken || this.getAccessToken();

    if (!token) {
      console.warn('No access token available for request');
      return config;
    }

    if (!config.headers) {
      config.headers = {};
    }

    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  }

  /**
   * Get access token (attempts to get from cache)
   */
  getAccessToken(){
    try {
      // This will trigger auto-refresh if token is expired
      return this.service
        .getUserInfo()
        .then(() => null) // This should never happen will return user info
        .catch(() => null);
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout user by revoking tokens
   */
  async logout(tokenSet){
    try {
      let success = true;

      // Revoke access token if available
      if (tokenSet.access_token) {
        const accessTokenRevoked = await this.service.revokeToken(
          tokenSet.access_token
        );
        if (!accessTokenRevoked) {
          console.warn('Failed to revoke access token');
          success = false;
        }
      }

      // Revoke refresh token if available
      if (tokenSet.refresh_token) {
        const refreshTokenRevoked = await this.service.revokeToken(
          tokenSet.refresh_token
        );
        if (!refreshTokenRevoked) {
          console.warn('Failed to revoke refresh token');
          success = false;
        }
      }

      return success;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Get user information from token
   */
  async getUserInfo(accessToken?){
    try {
      return await this.service.getUserInfo(accessToken);
    } catch (error) {
      console.error('Getting user info failed:', error);
      return null;
    }
  }

  /**
   * Map Google user info to system user type
   * This can be customized based on your application's user model
   */
  mapToSystemUser(googleUser){
    // This is a placeholder that should be customized for your specific user model
    return {
      id,
      email,
      name,
      firstName,
      lastName,
      profilePicture,
      authProvider: 'google',
      emailVerified,
      // Add any additional fields needed by your system
    };
  }
}

// Export a singleton instance of the integration helper
export const oauth2Integration = new OAuth2Integration(googleOAuth2Service);

// Export a function to initialize middleware for Express
export function initOAuth2Middleware(app) {
  // Handle OAuth login initiation
  app.get('/auth/google', (req, res=> {
    const state = crypto.randomBytes(16).toString('hex');
    // Store state in session for CSRF protection (assuming express-session is used)
    req.session.oauthState = state;

    const loginUrl = oauth2Integration.getLoginUrl(state);
    res.redirect(loginUrl);
  });

  // Handle OAuth callback
  app.get('/auth/callback', async (req, res=> {
    const { code, state } = req.query;

    // Verify state for CSRF protection
    if (req.session.oauthState !== state) {
      return res.status(403).send('Invalid state parameter');
    }

    // Clear oauth state from session
    delete req.session.oauthState;

    try {
      const authResult = await oauth2Integration.handleCallback(code);

      if (!authResult.success) {
        return res.redirect('/login?error=auth_failed');
      }

      // Map Google user to system user
      const systemUser = oauth2Integration.mapToSystemUser(authResult.user!);

      // Store user in session
      req.session.user = systemUser;
      req.session.tokenSet = authResult.tokenSet;

      // Redirect to success page or dashboard
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      res.redirect('/login?error=auth_error');
    }
  });

  // Logout endpoint
  app.get('/auth/logout', async (req, res=> {
    const tokenSet = req.session.tokenSet;

    if (tokenSet) {
      await oauth2Integration.logout(tokenSet);
    }

    // Clear session
    req.session.destroy((err=> {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/login');
    });
  });

  return app;
}
