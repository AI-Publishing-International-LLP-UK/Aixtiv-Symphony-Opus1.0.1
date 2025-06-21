import express from 'express';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import ClaudeTokenManager from '../core-protocols/admin-core/claude_token_manager';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { createHash } from 'crypto';
import logger, { claudeAuthLogger } from '../lib/logger';

// Create router
const router = express.Router();

// Load configuration
const configPath = path.join(process.cwd(), 'providers', 'claude', 'config.yaml');
let config: any;

try {
  const configFile = fs.readFileSync(configPath, 'utf8');
  config = yaml.load(configFile);
} catch (error) {
  logger.error('Failed to load Claude provider config:', error);
  throw new Error('Failed to load Claude provider configuration');
}

// Initialize token manager
const projectId = process.env.GCP_PROJECT_ID || 'api-for-warp-drive';
const claudeTokenManager = new ClaudeTokenManager(projectId);

// Session store for PKCE code verifiers and state
interface PkceSession {
  codeVerifier: string;
  state: string;
  redirectAfterAuth?: string;
}

// Store PKCE sessions in memory (in production, use Redis or another distributed store)
const pkceSessions = new Map<string, PkceSession>();

/**
 * Middleware to check if user is authenticated with Claude
 */
export const requireClaudeAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Get token from session or authorization header
    const sessionToken = req.session?.claudeToken;
    const authHeader = req.headers.authorization;
    
    let token: string | undefined;
    
    if (sessionToken) {
      token = sessionToken;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Claude authentication required',
        auth_url: `/auth/claude/login?redirect=${encodeURIComponent(req.originalUrl)}`
      });
    }
    
    // Validate token
    try {
      // Get full token object
      const tokenObject = JSON.parse(req.session?.claudeTokenObject || '{}');
      
      // Check if token is expired
      if (tokenObject.expires_at && Date.now() >= tokenObject.expires_at) {
        // Token is expired, try to refresh
        const refreshedToken = await claudeTokenManager.refreshOAuthToken(tokenObject.refresh_token);
        
        if (!refreshedToken) {
          return res.status(401).json({ 
            error: 'Token expired', 
            message: 'Claude authentication token expired',
            auth_url: `/auth/claude/login?redirect=${encodeURIComponent(req.originalUrl)}`
          });
        }
        
        // Store refreshed token
        req.session.claudeToken = refreshedToken.access_token;
        req.session.claudeTokenObject = JSON.stringify(refreshedToken);
        
        // Use new token
        token = refreshedToken.access_token;
      }
      
      // Set user info in request
      req.user = {
        ...req.user,
        claude: {
          token,
          scopes: tokenObject.scope?.split(' ') || [],
          userId: tokenObject.userId
        }
      };
      
      return next();
    } catch (error) {
      logger.error('Token validation error:', error);
      return res.status(401).json({ 
        error: 'Invalid token', 
        message: 'Claude authentication token is invalid',
        auth_url: `/auth/claude/login?redirect=${encodeURIComponent(req.originalUrl)}`
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate a PKCE code verifier
 * @returns Random code verifier
 */
function generateCodeVerifier(): string {
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
function generateCodeChallenge(codeVerifier: string): string {
  const hash = createHash('sha256').update(codeVerifier).digest('base64');
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Route to initiate Claude OAuth2 flow
 */
router.get('/login', (req, res) => {
  try {
    // Get redirect URI from config
    const redirectUri = config.redirect_uris[0];
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    // Generate state parameter for CSRF protection
    const state = uuidv4();
    
    // Store code verifier and state in session
    const sessionId = uuidv4();
    pkceSessions.set(sessionId, {
      codeVerifier,
      state,
      redirectAfterAuth: req.query.redirect as string
    });
    
    // Set session cookie
    res.cookie('claude_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });
    
    // Build authorization URL
    const authUrl = new URL(config.oauth2.auth_url);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', process.env.CLAUDE_CLIENT_ID || config.client.client_id);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', config.scopes.join(' '));
    authUrl.searchParams.append('state', state);
    
    // Add PKCE parameters if required
    if (config.security.pkce_required) {
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
    }
    
    // Redirect to authorization URL
    res.redirect(authUrl.toString());
  } catch (error) {
    logger.error('Error initiating Claude OAuth flow:', error);
    res.status(500).json({ error: 'Failed to initiate Claude OAuth flow' });
  }
});

/**
 * Route to handle OAuth2 callback
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const sessionId = req.cookies.claude_session_id;
    
    // Verify session and state
    if (!sessionId || !pkceSessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session' });
    }
    
    const session = pkceSessions.get(sessionId)!;
    
    if (state !== session.state) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    // Exchange code for tokens
    try {
      const token = await claudeTokenManager.initiateOAuthFlow(
        code as string, 
        config.security.pkce_required ? session.codeVerifier : undefined
      );
      
      // Store tokens in session
      req.session.claudeToken = token.access_token;
      req.session.claudeTokenObject = JSON.stringify(token);
      
      // Store token in Secret Manager
      try {
        await claudeTokenManager.rotateToken('claude-oauth-token', token);
      } catch (error) {
        logger.error('Failed to store token in Secret Manager:', error);
      }
      
      // Clear PKCE session
      pkceSessions.delete(sessionId);
      res.clearCookie('claude_session_id');
      
      // Redirect to original destination or success page
      const redirectTo = session.redirectAfterAuth || '/auth/claude/success';
      res.redirect(redirectTo);
    } catch (error) {
      logger.error('Error exchanging code for token:', error);
      res.status(500).json({ error: 'Failed to complete OAuth flow' });
    }
  } catch (error) {
    logger.error('Error handling OAuth callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Route to handle success after authentication
 */
router.get('/success', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Claude authentication successful',
    isAuthenticated: !!req.session?.claudeToken
  });
});

/**
 * Route to check authentication status
 */
router.get('/status', async (req, res) => {
  try {
    // Check if user has a token
    const token = req.session?.claudeToken;
    
    if (!token) {
      return res.status(200).json({
        isAuthenticated: false,
        message: 'Not authenticated with Claude'
      });
    }
    
    // Get token object
    const tokenObject = JSON.parse(req.session?.claudeTokenObject || '{}');
    
    // Validate token if possible
    try {
      const validation = await claudeTokenManager.validateClaudeToken(tokenObject);
      
      return res.status(200).json({
        isAuthenticated: validation.isValid,
        scopes: validation.scopes,
        username: validation.username,
        userId: validation.userId,
        error: validation.error
      });
    } catch (error) {
      return res.status(200).json({
        isAuthenticated: false,
        error: 'Token validation failed'
      });
    }
  } catch (error) {
    logger.error('Error checking authentication status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Route to get a token for API usage
 */
router.get('/token', requireClaudeAuth, (req, res) => {
  try {
    // Token is available from the middleware
    const token = req.user?.claude?.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated with Claude' });
    }
    
    // Return token info
    return res.status(200).json({
      access_token: token,
      scopes: req.user?.claude?.scopes,
      userId: req.user?.claude?.userId
    });
  } catch (error) {
    logger.error('Error getting token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Route to refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    // Check if user has a token
    const tokenObject = JSON.parse(req.session?.claudeTokenObject || '{}');
    
    if (!tokenObject.refresh_token) {
      return res.status(401).json({ error: 'No refresh token available' });
    }
    
    // Refresh token
    try {
      const refreshedToken = await claudeTokenManager.refreshOAuthToken(tokenObject.refresh_token);
      
      if (!refreshedToken) {
        return res.status(400).json({ error: 'Token refresh failed' });
      }
      
      // Store refreshed token
      req.session.claudeToken = refreshedToken.access_token;
      req.session.claudeTokenObject = JSON.stringify(refreshedToken);
      
      // Store token in Secret Manager
      try {
        await claudeTokenManager.rotateToken('claude-oauth-token', refreshedToken);
      } catch (error) {
        logger.error('Failed to store refreshed token in Secret Manager:', error);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        expires_at: refreshedToken.expires_at
      });
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return res.status(400).json({ error: 'Token refresh failed' });
    }
  } catch (error) {
    logger.error('Error handling token refresh:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Route to sign out
 */
router.post('/logout', (req, res) => {
  try {
    // Clear session
    delete req.session.claudeToken;
    delete req.session.claudeTokenObject;
    
    return res.status(200).json({
      success: true,
      message: 'Signed out from Claude successfully'
    });
  } catch (error) {
    logger.error('Error signing out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Route to handle MCP callback
 * This is an alternate callback endpoint for Claude MCP integration
 */
router.get('/mcp/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const sessionId = req.cookies.claude_session_id;
    
    // Verify session and state
    if (!sessionId || !pkceSessions.has(sessionId)) {
      return res.status(400).json({ error: 'Invalid session' });
    }
    
    const session = pkceSessions.get(sessionId)!;
    
    if (state !== session.state) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    // Exchange code for tokens
    try {
      const token = await claudeTokenManager.initiateOAuthFlow(
        code as string, 
        config.security.pkce_required ? session.codeVerifier : undefined
      );
      
      // Store tokens in session
      req.session.claudeToken = token.access_token;
      req.session.claudeTokenObject = JSON.stringify(token);
      
      // Store token in Secret Manager
      try {
        await claudeTokenManager.rotateToken('claude-oauth-token', token);
      } catch (error) {
        logger.error('Failed to store token in Secret Manager:', error);
      }
      
      // Clear PKCE session
      pkceSessions.delete(sessionId);
      res.clearCookie('claude_session_id');
      
      // Redirect to original destination or success page
      const redirectTo = session.redirectAfterAuth || '/auth/claude/success';
      res.redirect(redirectTo);
    } catch (error) {
      logger.error('Error exchanging code for token:', error);
      res.status(500).json({ error: 'Failed to complete OAuth flow' });
    }
  } catch (error) {
    logger.error('Error handling MCP OAuth callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export router
export default router;
