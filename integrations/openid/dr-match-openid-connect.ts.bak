/**
 * OpenID Connect Implementation for LinkedIn Authentication
 * Comprehensive user information retrieval and management
 */

import axios from 'axios';
import crypto from 'crypto';

/**
 * OpenID Connect Configuration Interface
 */
export interface OpenIDConnectConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * User Information Interface
 */
export interface LinkedInUserInfo {
  // Standard OpenID Connect claims
  sub: string;          // Unique identifier for the user
  name?: string;        // Full name
  given_name?: string;  // First name
  family_name?: string; // Last name
  picture?: string;     // Profile picture URL
  email?: string;       // Primary email address
  email_verified?: boolean;
  
  // Additional LinkedIn-specific profile information
  headline?: string;
  publicProfileUrl?: string;
  profilePictureUrls?: {
    normal?: string;
    large?: string;
  };
}

/**
 * Token Management Interface
 */
export interface TokenSet {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

/**
 * LinkedIn OpenID Connect Service
 */
export class LinkedInOpenIDConnectService {
  private config: OpenIDConnectConfig;
  private tokenCache: Map<string, TokenSet> = new Map();

  constructor(config: OpenIDConnectConfig) {
    this.config = config;
  }

  /**
   * Generate Authorization URL for OpenID Connect
   */
  generateAuthorizationUrl(
    state?: string,
    nonce?: string
  ): string {
    // Generate state and nonce if not provided
    const authState = state || this.generateSecureToken();
    const authNonce = nonce || this.generateSecureToken();

    // Construct authorization URL
    const baseUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: authState,
      nonce: authNonce
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange Authorization Code for Tokens
   */
  async exchangeAuthorizationCode(
    authorizationCode: string
  ): Promise<TokenSet> {
    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: authorizationCode,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokenSet: TokenSet = {
        access_token: response.data.access_token,
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
        id_token: response.data.id_token,
        refresh_token: response.data.refresh_token
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
   * Retrieve User Information
   */
  async getUserInfo(
    accessToken?: string
  ): Promise<LinkedInUserInfo> {
    // Use provided token or retrieve from cache
    const token = accessToken || this.getAccessTokenFromCache();

    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      // Transform response to LinkedInUserInfo
      return this.transformUserInfo(response.data);
    } catch (error) {
      console.error('User info retrieval failed', error);
      throw new Error('Failed to retrieve user information');
    }
  }

  /**
   * Refresh Access Token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<TokenSet> {
    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokenSet: TokenSet = {
        access_token: response.data.access_token,
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
        refresh_token: response.data.refresh_token
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
   * Validate Access Token
   */
  async validateAccessToken(
    accessToken: string
  ): Promise<{
    valid: boolean;
    claims?: any;
  }> {
    try {
      // Introspection endpoint
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/introspect',
        new URLSearchParams({
          token: accessToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        valid: response.data.active,
        claims: response.data
      };
    } catch (error) {
      console.error('Token validation failed', error);
      return { valid: false };
    }
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Cache token set
   */
  private cacheTokenSet(tokenSet: TokenSet): void {
    // Use access token as the cache key
    this.tokenCache.set(tokenSet.access_token, tokenSet);
  }

  /**
   * Retrieve access token from cache
   */
  private getAccessTokenFromCache(): string {
    // In a real-world scenario, you'd implement more sophisticated caching
    if (this.tokenCache.size === 0) {
      throw new Error('No cached tokens available');
    }

    // Return the first cached token
    return this.tokenCache.keys().next().value;
  }

  /**
   * Transform raw user info to standardized interface
   */
  private transformUserInfo(rawUserInfo: any): LinkedInUserInfo {
    return {
      sub: rawUserInfo.sub,
      name: rawUserInfo.name,
      given_name: rawUserInfo.given_name,
      family_name: rawUserInfo.family_name,
      picture: rawUserInfo.picture,
      email: rawUserInfo.email,
      email_verified: rawUserInfo.email_verified,
      
      // LinkedIn-specific extensions
      headline: rawUserInfo.headline,
      publicProfileUrl: rawUserInfo.publicProfileUrl,
      profilePictureUrls: {
        normal: rawUserInfo.pictureUrls?.normal,
        large: rawUserInfo.pictureUrls?.large
      }
    };
  }
}

/**
 * LinkedIn OpenID Connect Configuration for Dr. Match
 */
export const DrMatchOpenIDConfig: OpenIDConnectConfig = {
  clientId: '7874fjg5h9t5la',
  clientSecret: process.env.LINKEDIN_DR_MATCH_CLIENT_SECRET || '',
  redirectUri: 'https://coaching2100.com',
  scopes: [
    'openid',     // Basic OpenID Connect scope
    'profile',    // Access to profile information
    'email'       // Access to email address
  ]
};

/**
 * Demonstration of OpenID Connect Flow
 */
async function demonstrateLinkedInOpenIDConnect() {
  const openIDService = new LinkedInOpenIDConnectService(DrMatchOpenIDConfig);

  try {
    // Generate Authorization URL
    const authorizationUrl = openIDService.generateAuthorizationUrl();
    console.log('Authorization URL:', authorizationUrl);

    // Simulate authorization code exchange 
    // (In a real app, this would come from the OAuth flow)
    const mockAuthorizationCode = 'MOCK_AUTHORIZATION_CODE';
    const tokenSet = await openIDService.exchangeAuthorizationCode(
      mockAuthorizationCode
    );
    console.log('Token Set:', tokenSet);

    // Retrieve User Information
    const userInfo = await openIDService.getUserInfo(
      tokenSet.access_token
    );
    console.log('User Information:', userInfo);

    // Validate Access Token
    const tokenValidation = await openIDService.validateAccessToken(
      tokenSet.access_token
    );
    console.log('Token Validation:', tokenValidation);

  } catch (error) {
    console.error('OpenID Connect Demonstration Failed', error);
  }
}

export default {
  LinkedInOpenIDConnectService,
  DrMatchOpenIDConfig,
  demonstrateLinkedInOpenIDConnect
};
