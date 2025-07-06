import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { createHash } from 'crypto';

/**
 * Claude OAuth2 token structure
 */
export interface ClaudeOAuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in milliseconds
  token_type: string;
  scope: string;
}

/**
 * Interface for token validation result
 */
export interface TokenValidationResult {
  isValid: boolean;
  username?: string;
  userId?: string;
  scopes?: string[];
  expiresAt?: number;
  refreshToken?: string;
  error?: string;
}

/**
 * Claude provider configuration
 */
export interface ClaudeProviderConfig {
  provider: {
    name: string;
    display_name: string;
    description: string;
    version: string;
  };
  oauth2: {
    auth_url: string;
    token_url: string;
    token_endpoint_auth_method: string;
    token_refresh_threshold_seconds: number;
  };
  scopes: string[];
  client: {
    client_id: string;
    client_secret: string;
  };
  redirect_uris: string[];
  token_management: {
    refresh_tokens_secret: string;
    access_tokens_cache_secret: string;
    store_refresh_tokens_only: boolean;
    use_cmek_encryption: boolean;
    audit_log_name: string;
    log_auth_events: boolean;
  };
  security: {
    pkce_required: boolean;
    token_rotation_months: number;
  };
}

/**
 * Claude Token Manager - Manages OAuth2 tokens for Claude AI API
 * Handles token storage, refresh, and validation
 */
export class ClaudeTokenManager {
  private secretClient: SecretManagerServiceClient;
  private projectId: string;
  private tokenCache: Map<string, ClaudeOAuthToken>;
  private expirationThresholdMs: number;
  private config: ClaudeProviderConfig;

  /**
   * Create a new Claude Token Manager
   * @param projectId GCP project ID
   * @param configPath Path to Claude provider config file
   */
  constructor(projectId: string, configPath?: string) {
    this.projectId = projectId;
    this.secretClient = new SecretManagerServiceClient();
    this.tokenCache = new Map<string, ClaudeOAuthToken>();
    
    // Load config from file
    const configFilePath = configPath || path.join(
      process.cwd(), 
      'providers', 
      'claude', 
      'config.yaml'
    );
    
    try {
      const configFile = fs.readFileSync(configFilePath, 'utf8');
      this.config = yaml.load(configFile) as ClaudeProviderConfig;
    } catch (error) {
      console.error('Failed to load Claude provider config:', error);
      throw new Error('Failed to load Claude provider configuration');
    }
    
    // Set expiration threshold from config (in milliseconds)
    this.expirationThresholdMs = this.config.oauth2.token_refresh_threshold_seconds * 1000;
    
    // Load client ID and secret from environment or replace placeholders
    this.config.client.client_id = this.config.client.client_id.replace(
      '${CLAUDE_CLIENT_ID}', 
      process.env.CLAUDE_CLIENT_ID || ''
    );
    
    this.config.client.client_secret = this.config.client.client_secret.replace(
      '${CLAUDE_CLIENT_SECRET}', 
      process.env.CLAUDE_CLIENT_SECRET || ''
    );
    
    // Ensure we have client credentials
    if (!this.config.client.client_id || !this.config.client.client_secret) {
      console.warn('Claude OAuth2 client credentials not set. Will attempt to load from Secret Manager.');
    }
  }

  /**
   * Validate a Claude OAuth token
   * @param tokenData The token data to validate
   * @returns Validation result
   */
  public async validateClaudeToken(tokenData: ClaudeOAuthToken): Promise<TokenValidationResult> {
    try {
      const { access_token, refresh_token, expires_at } = tokenData;
      
      // Check if token is expired or about to expire
      const now = Date.now();
      if (expires_at && now >= expires_at - this.expirationThresholdMs) {
        console.log('Token expired or about to expire, refreshing...');
        const refreshedToken = await this.refreshOAuthToken(refresh_token);
        if (refreshedToken) {
          return this.validateClaudeToken(refreshedToken);
        }
      }

      // Validate token by making a request to Claude API
      try {
        const response = await axios.get('https://api.anthropic.com/v1/user', {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Extract user info from response
        const userData = response.data;
        
        // Parse scopes from token (usually in JWT format, but may vary)
        const scopes = tokenData.scope?.split(' ') || [];
        
        return {
          isValid: true,
          username: userData.email || userData.username,
          userId: userData.id,
          scopes,
          expiresAt: expires_at,
          refreshToken: refresh_token
        };
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          // Try refreshing token on 401 Unauthorized
          const refreshedToken = await this.refreshOAuthToken(refresh_token);
          if (refreshedToken) {
            return this.validateClaudeToken(refreshedToken);
          }
        }
        
        return {
          isValid: false,
          error: axios.isAxiosError(error) 
            ? `API validation failed: ${error.response?.status} ${error.response?.statusText}`
            : error instanceof Error 
              ? error.message 
              : 'Unknown error'
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check a token stored in Secret Manager
   * @param secretName Name of the secret containing the token
   * @returns Validation result
   */
  public async checkSecretManagerToken(secretName: string): Promise<TokenValidationResult> {
    try {
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.secretClient.accessSecretVersion({ name });
      const tokenJson = version.payload?.data?.toString() || '';
      
      try {
        const token = JSON.parse(tokenJson) as ClaudeOAuthToken;
        return await this.validateClaudeToken(token);
      } catch (e) {
        return {
          isValid: false,
          error: `Invalid token format in secret: ${e instanceof Error ? e.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: `Secret Manager error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Rotate a token in Secret Manager
   * @param secretName Name of the secret to update
   * @param newToken New token data
   * @returns Success status
   */
  public async rotateToken(secretName: string, newToken: ClaudeOAuthToken): Promise<boolean> {
    try {
      // Validate new token before rotation
      const validation = await this.validateClaudeToken(newToken);
      if (!validation.isValid) {
        throw new Error(`New token validation failed: ${validation.error}`);
      }

      // Create new version in Secret Manager
      const parent = `projects/${this.projectId}/secrets/${secretName}`;
      await this.secretClient.addSecretVersion({
        parent,
        payload: {
          data: Buffer.from(JSON.stringify(newToken))
        }
      });

      this.tokenCache.delete(secretName); // Clear cache
      
      // Log the audit event if configured
      if (this.config.token_management.log_auth_events) {
        console.info(`[${this.config.token_management.audit_log_name}] Token rotated for ${secretName}`);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Token rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh an OAuth token using the refresh token
   * @param refreshToken Refresh token to use
   * @returns New token data or null if refresh failed
   */
  public async refreshOAuthToken(refreshToken: string): Promise<ClaudeOAuthToken | null> {
    try {
      // Ensure we have client credentials
      if (!this.config.client.client_id || !this.config.client.client_secret) {
        await this.loadClientCredentials();
      }
      
      // Make token refresh request
      const response = await axios.post(
        this.config.oauth2.token_url,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.client.client_id,
          client_secret: this.config.client.client_secret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const data = response.data;
      
      // Calculate token expiration
      const expiresInMs = (data.expires_in || 3600) * 1000;
      const expiresAt = Date.now() + expiresInMs;
      
      // Build token object
      const token: ClaudeOAuthToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep old one
        token_type: data.token_type || 'Bearer',
        scope: data.scope || '',
        expires_at: expiresAt
      };
      
      // Log the audit event if configured
      if (this.config.token_management.log_auth_events) {
        console.info(`[${this.config.token_management.audit_log_name}] Token refreshed`);
      }
      
      return token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  /**
   * Initiate OAuth flow and exchange code for tokens
   * @param code Authorization code from OAuth redirect
   * @param codeVerifier PKCE code verifier (if used)
   * @returns Token data
   */
  public async initiateOAuthFlow(code: string, codeVerifier?: string): Promise<ClaudeOAuthToken> {
    try {
      // Ensure we have client credentials
      if (!this.config.client.client_id || !this.config.client.client_secret) {
        await this.loadClientCredentials();
      }
      
      // Build token request params
      const params: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        client_id: this.config.client.client_id,
        client_secret: this.config.client.client_secret,
        redirect_uri: this.config.redirect_uris[0] // Use first redirect URI by default
      };
      
      // Add code verifier if PKCE is used
      if (codeVerifier && this.config.security.pkce_required) {
        params.code_verifier = codeVerifier;
      }
      
      // Exchange code for tokens
      const response = await axios.post(
        this.config.oauth2.token_url,
        new URLSearchParams(params),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const data = response.data;
      
      // Calculate token expiration
      const expiresInMs = (data.expires_in || 3600) * 1000;
      const expiresAt = Date.now() + expiresInMs;
      
      // Build token object
      const token: ClaudeOAuthToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || 'Bearer',
        scope: data.scope || '',
        expires_at: expiresAt
      };
      
      // Log the audit event if configured
      if (this.config.token_management.log_auth_events) {
        console.info(`[${this.config.token_management.audit_log_name}] New OAuth token issued`);
      }
      
      return token;
    } catch (error) {
      throw new Error(`OAuth flow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitor the health of multiple tokens
   * @param secretNames List of secret names to check
   * @returns Map of token statuses
   */
  public async monitorTokenHealth(secretNames: string[]): Promise<Map<string, TokenValidationResult>> {
    const results = new Map<string, TokenValidationResult>();
    
    for (const secretName of secretNames) {
      const status = await this.checkSecretManagerToken(secretName);
      results.set(secretName, status);

      // Alert if token is expired or near expiration
      if (status.expiresAt) {
        const timeToExpiration = status.expiresAt - Date.now();
        if (timeToExpiration < this.expirationThresholdMs) {
          console.warn(`Token ${secretName} expires soon: ${new Date(status.expiresAt).toISOString()}`);
          
          // Attempt to refresh if possible
          if (status.refreshToken) {
            try {
              const refreshedToken = await this.refreshOAuthToken(status.refreshToken);
              if (refreshedToken) {
                await this.rotateToken(secretName, refreshedToken);
                console.info(`Token ${secretName} refreshed successfully`);
              }
            } catch (error) {
              console.error(`Failed to auto-refresh token ${secretName}:`, error);
            }
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Get a secure token from Secret Manager with automatic refresh
   * @param secretName Name of the secret containing the token
   * @returns Valid token
   */
  public async getSecureToken(secretName: string): Promise<ClaudeOAuthToken> {
    // Check if valid token is cached
    if (this.tokenCache.has(secretName)) {
      const cachedToken = this.tokenCache.get(secretName)!;
      const now = Date.now();
      
      // Return cached token if not expired or about to expire
      if (now < cachedToken.expires_at - this.expirationThresholdMs) {
        return cachedToken;
      }
      
      // Token is expired or about to expire, try to refresh
      if (cachedToken.refresh_token) {
        const refreshedToken = await this.refreshOAuthToken(cachedToken.refresh_token);
        if (refreshedToken) {
          // Store refreshed token in Secret Manager if configured to do so
          if (!this.config.token_management.store_refresh_tokens_only) {
            await this.rotateToken(secretName, refreshedToken);
          } else {
            // Only store refresh token
            const refreshSecret = `${secretName}-refresh`;
            await this.rotateToken(refreshSecret, {
              ...refreshedToken,
              access_token: '' // Don't store access token
            });
          }
          
          this.tokenCache.set(secretName, refreshedToken);
          return refreshedToken;
        }
      }
    }

    // Fetch token from Secret Manager
    const tokenCheck = await this.checkSecretManagerToken(secretName);
    if (tokenCheck.isValid && tokenCheck.refreshToken) {
      // Construct token from validation result
      const token: ClaudeOAuthToken = {
        access_token: '', // Will be populated below
        refresh_token: tokenCheck.refreshToken,
        expires_at: tokenCheck.expiresAt || 0,
        token_type: 'Bearer',
        scope: tokenCheck.scopes?.join(' ') || ''
      };
      
      // Get full token details including access token
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.secretClient.accessSecretVersion({ name });
      const tokenJson = version.payload?.data?.toString() || '';
      const fullToken = JSON.parse(tokenJson) as ClaudeOAuthToken;
      
      // Merge details
      token.access_token = fullToken.access_token;
      
      // Cache and return token
      this.tokenCache.set(secretName, token);
      return token;
    }
    
    throw new Error(`Invalid or expired token in ${secretName}: ${tokenCheck.error}`);
  }

  /**
   * Generate authorization URL for initiating OAuth flow
   * @param redirectUri Optional override for redirect URI
   * @param state Optional state parameter for CSRF protection
   * @param scopes Optional specific scopes to request
   * @returns Authorization URL and PKCE code verifier if used
   */
  public async generateAuthorizationUrl(
    redirectUri?: string, 
    state?: string,
    scopes?: string[]
  ): Promise<{ url: string; codeVerifier?: string }> {
    // Ensure we have client credentials
    if (!this.config.client.client_id || !this.config.client.client_secret) {
      await this.loadClientCredentials();
    }
    
    // Build authorization URL params
    const params: Record<string, string> = {
      response_type: 'code',
      client_id: this.config.client.client_id,
      redirect_uri: redirectUri || this.config.redirect_uris[0],
      scope: scopes?.join(' ') || this.config.scopes.join(' ')
    };
    
    // Add state parameter if provided
    if (state) {
      params.state = state;
    }
    
    // Implement PKCE if required
    let codeVerifier: string | undefined;
    if (this.config.security.pkce_required) {
      codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      
      params.code_challenge = codeChallenge;
      params.code_challenge_method = 'S256';
    }
    
    // Build URL
    const authUrl = new URL(this.config.oauth2.auth_url);
    Object.entries(params).forEach(([key, value]) => {
      authUrl.searchParams.append(key, value);
    });
    
    return {
      url: authUrl.toString(),
      codeVerifier
    };
  }

  /**
   * Generate a PKCE code verifier
   * @returns Random code verifier
   */
  private generateCodeVerifier(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const length = 128; // Recommended length for code verifier
    
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  /**
   * Generate a PKCE code challenge from a code verifier
   * @param codeVerifier Code verifier to transform
   * @returns Code challenge
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const hash = createHash('sha256').update(codeVerifier).digest('base64');
    return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Load client credentials from Secret Manager
   */
  private async loadClientCredentials(): Promise<void> {
    try {
      // Try to load client ID
      if (!this.config.client.client_id) {
        const clientIdSecret = `projects/${this.projectId}/secrets/claude-oauth-client-id/versions/latest`;
        const [clientIdVersion] = await this.secretClient.accessSecretVersion({ name: clientIdSecret });
        this.config.client.client_id = clientIdVersion.payload?.data?.toString() || '';
      }
      
      // Try to load client secret
      if (!this.config.client.client_secret) {
        const clientSecretSecret = `projects/${this.projectId}/secrets/claude-oauth-client-secret/versions/latest`;
        const [clientSecretVersion] = await this.secretClient.accessSecretVersion({ name: clientSecretSecret });
        this.config.client.client_secret = clientSecretVersion.payload?.data?.toString() || '';
      }
      
      if (!this.config.client.client_id || !this.config.client.client_secret) {
        throw new Error('Failed to load client credentials from environment or Secret Manager');
      }
    } catch (error) {
      throw new Error(`Failed to load client credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default ClaudeTokenManager;
