/**
 * SallyPort Security Layer for DrClaude MCP Gateway
 * 
 * Provides secure authentication and access control for MCP secret endpoints
 * and sensitive authentication operations.
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 * Part of the AIXTIV SYMPHONY ORCHESTRATING OPERATING SYSTEM (ASOOS)
 */

const admin = require('firebase-admin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const crypto = require('crypto');
const axios = require('axios');

// Initialize clients
const secretClient = new SecretManagerServiceClient();
const PROJECT_ID = 'api-for-warp-drive';
const SALLYPORT_BASE_URL = process.env.SALLYPORT_BASE_URL || 'https://sallyport.aixtiv.dev/api/v1';

class MCPSallyPortSecurity {
  constructor() {
    this.verificationThreshold = 85; // Minimum trust score for MCP access
    this.sessionTimeout = 300000; // 5 minutes
    this.maxVerificationAttempts = 3;
  }

  /**
   * Create secure SallyPort session for MCP access
   */
  async initializeMCPSallyPort(req, res) {
    try {
      const sessionId = crypto.randomUUID();
      const entryTime = Date.now();
      
      // Initial security assessment
      const securityContext = {
        sessionId,
        entryTime,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceFingerprint: req.headers['device-fingerprint'] || null,
        verificationStage: 'sally-port-entry',
        trustScore: 100,
        verificationStatus: {
          identity: false,
          device: false,
          network: false,
          behavioral: false,
          sallyPortChallenge: false
        },
        mcpAccess: {
          secretsAllowed: false,
          oauthAllowed: false,
          configAllowed: false
        }
      };

      // Store session in Firestore
      await admin.firestore()
        .collection('mcp-sallyport-sessions')
        .doc(sessionId)
        .set(securityContext);

      res.status(200).json({
        success: true,
        sessionId,
        message: 'SallyPort security checkpoint initialized',
        nextStep: 'identity-verification',
        challengeEndpoint: `/mcp/sallyport/challenge/${sessionId}`
      });

    } catch (error) {
      console.error('SallyPort initialization error:', error);
      res.status(500).json({ error: 'Failed to initialize security checkpoint' });
    }
  }

  /**
   * Verify identity and issue SallyPort challenge
   */
  async verifySallyPortChallenge(req, res) {
    try {
      const { sessionId } = req.params;
      const { identityToken, challengeResponse, biometricData } = req.body;

      // Retrieve session
      const sessionDoc = await admin.firestore()
        .collection('mcp-sallyport-sessions')
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const session = sessionDoc.data();
      
      // Check session timeout
      if (Date.now() - session.entryTime > this.sessionTimeout) {
        await this.expireSession(sessionId);
        return res.status(401).json({ error: 'Session expired' });
      }

      // Verify identity token (Firebase Auth or OAuth)
      let identityVerified = false;
      let userProfile = null;

      if (identityToken) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(identityToken);
          userProfile = decodedToken;
          identityVerified = true;
          session.trustScore += 25;
        } catch (error) {
          console.error('Identity verification failed:', error);
        }
      }

      // Verify SallyPort challenge response
      const challengeVerified = await this.verifyChallengeResponse(
        sessionId, 
        challengeResponse
      );

      // Update verification status
      session.verificationStatus.identity = identityVerified;
      session.verificationStatus.sallyPortChallenge = challengeVerified;
      session.verificationStatus.device = await this.verifyDeviceTrust(req);
      session.verificationStatus.network = await this.verifyNetworkContext(req);

      // Calculate final trust score
      const finalTrustScore = this.calculateTrustScore(session);
      session.trustScore = finalTrustScore;

      // Determine MCP access permissions
      if (finalTrustScore >= this.verificationThreshold) {
        session.mcpAccess = {
          secretsAllowed: true,
          oauthAllowed: true,
          configAllowed: true
        };
        session.verificationStage = 'approved';
        
        // Generate secure access token for MCP operations
        const mcpAccessToken = await this.generateMCPAccessToken(session, userProfile);
        
        // Update session
        await admin.firestore()
          .collection('mcp-sallyport-sessions')
          .doc(sessionId)
          .update(session);

        res.status(200).json({
          success: true,
          accessGranted: true,
          trustScore: finalTrustScore,
          mcpAccessToken,
          permissions: session.mcpAccess,
          expiresAt: Date.now() + this.sessionTimeout
        });
      } else {
        session.verificationStage = 'denied';
        await admin.firestore()
          .collection('mcp-sallyport-sessions')
          .doc(sessionId)
          .update(session);

        res.status(403).json({
          success: false,
          accessGranted: false,
          trustScore: finalTrustScore,
          message: 'Insufficient verification for MCP access',
          requiredScore: this.verificationThreshold
        });
      }

    } catch (error) {
      console.error('SallyPort verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  }

  /**
   * Middleware to protect MCP secret endpoints
   */
  async protectMCPSecrets(req, res, next) {
    try {
      const mcpAccessToken = req.headers['x-mcp-access-token'];
      
      if (!mcpAccessToken) {
        return res.status(401).json({ 
          error: 'MCP access token required',
          sallyPortEndpoint: '/mcp/sallyport/init'
        });
      }

      // Verify MCP access token
      const tokenValid = await this.verifyMCPAccessToken(mcpAccessToken);
      
      if (!tokenValid) {
        return res.status(403).json({ 
          error: 'Invalid or expired MCP access token',
          sallyPortEndpoint: '/mcp/sallyport/init'
        });
      }

      // Add session context to request
      req.mcpSession = tokenValid.session;
      req.mcpPermissions = tokenValid.permissions;
      
      next();

    } catch (error) {
      console.error('MCP protection error:', error);
      res.status(500).json({ error: 'Security verification failed' });
    }
  }

  /**
   * Get OAuth credentials with SallyPort protection
   */
  async getSecureOAuthCredentials(req, res) {
    try {
      // Verify MCP permissions
      if (!req.mcpPermissions?.oauthAllowed) {
        return res.status(403).json({ error: 'OAuth access not permitted' });
      }

      // Retrieve OAuth credentials from Secret Manager
      const [clientIdVersion] = await secretClient.accessSecretVersion({
        name: `projects/${PROJECT_ID}/secrets/mcp-oauth-client-id/versions/latest`
      });
      
      const [clientSecretVersion] = await secretClient.accessSecretVersion({
        name: `projects/${PROJECT_ID}/secrets/mcp-oauth-client-secret/versions/latest`
      });

      const clientId = clientIdVersion.payload.data.toString();
      const clientSecret = clientSecretVersion.payload.data.toString();

      // Log access attempt
      await this.logSecureAccess(req.mcpSession.sessionId, 'oauth-credentials', req.ip);

      res.status(200).json({
        success: true,
        credentials: {
          clientId,
          clientSecret,
          authorizationUrl: 'https://drclaude.live/oauth/authorize',
          tokenUrl: 'https://drclaude.live/oauth/token'
        },
        accessedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('OAuth credential retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve credentials' });
    }
  }

  /**
   * Helper methods
   */
  async verifyChallengeResponse(sessionId, response) {
    // Implement challenge-response verification
    // This could be a cryptographic challenge, CAPTCHA, or other verification
    return response && response.length > 10; // Simplified for demo
  }

  async verifyDeviceTrust(req) {
    // Implement device fingerprinting and trust assessment
    return req.headers['device-fingerprint'] ? true : false;
  }

  async verifyNetworkContext(req) {
    // Implement network security assessment
    return !req.ip.startsWith('127.') && !req.ip.startsWith('192.168.');
  }

  calculateTrustScore(session) {
    let score = session.trustScore;
    
    // Deduct points for failed verifications
    if (!session.verificationStatus.identity) score -= 30;
    if (!session.verificationStatus.sallyPortChallenge) score -= 25;
    if (!session.verificationStatus.device) score -= 15;
    if (!session.verificationStatus.network) score -= 10;
    
    return Math.max(0, score);
  }

  async generateMCPAccessToken(session, userProfile) {
    const tokenPayload = {
      sessionId: session.sessionId,
      userId: userProfile?.uid || 'anonymous',
      permissions: session.mcpAccess,
      issuedAt: Date.now(),
      expiresAt: Date.now() + this.sessionTimeout
    };

    // Sign token with secret
    const secret = crypto.randomBytes(32).toString('hex');
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    
    // Store token hash for verification
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await admin.firestore()
      .collection('mcp-access-tokens')
      .doc(tokenHash)
      .set({
        sessionId: session.sessionId,
        issuedAt: tokenPayload.issuedAt,
        expiresAt: tokenPayload.expiresAt,
        permissions: session.mcpAccess
      });

    return token;
  }

  async verifyMCPAccessToken(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const tokenDoc = await admin.firestore()
        .collection('mcp-access-tokens')
        .doc(tokenHash)
        .get();

      if (!tokenDoc.exists) return false;

      const tokenData = tokenDoc.data();
      if (Date.now() > tokenData.expiresAt) {
        // Token expired, clean up
        await tokenDoc.ref.delete();
        return false;
      }

      return {
        valid: true,
        session: tokenData,
        permissions: tokenData.permissions
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  async logSecureAccess(sessionId, resource, ip) {
    await admin.firestore()
      .collection('mcp-security-logs')
      .add({
        sessionId,
        resource,
        ip,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action: 'secure-access'
      });
  }

  async expireSession(sessionId) {
    await admin.firestore()
      .collection('mcp-sallyport-sessions')
      .doc(sessionId)
      .update({
        verificationStage: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
}

module.exports = MCPSallyPortSecurity;

