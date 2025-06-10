/**
 * Secure MCP Endpoints with SallyPort Protection
 * 
 * Provides protected access to DrClaude MCP secrets and authentication
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const express = require('express');
const MCPSallyPortSecurity = require('../auth/mcp-sallyport-security');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const sallyPort = new MCPSallyPortSecurity();

// Rate limiting for security endpoints
const securityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many security requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Very strict limit for sensitive operations
  message: {
    error: 'Rate limit exceeded for sensitive operations',
    retryAfter: '5 minutes'
  }
});

/**
 * Initialize SallyPort Security Checkpoint
 * GET /mcp/sallyport/init
 */
router.get('/sallyport/init', securityLimiter, async (req, res) => {
  try {
    await sallyPort.initializeMCPSallyPort(req, res);
  } catch (error) {
    console.error('SallyPort init error:', error);
    res.status(500).json({ error: 'Security checkpoint initialization failed' });
  }
});

/**
 * SallyPort Challenge Verification
 * POST /mcp/sallyport/challenge/:sessionId
 */
router.post('/sallyport/challenge/:sessionId', securityLimiter, async (req, res) => {
  try {
    await sallyPort.verifySallyPortChallenge(req, res);
  } catch (error) {
    console.error('SallyPort challenge error:', error);
    res.status(500).json({ error: 'Challenge verification failed' });
  }
});

/**
 * Get Secure OAuth Credentials
 * POST /mcp/secrets/oauth
 */
router.post('/secrets/oauth', 
  strictLimiter, 
  sallyPort.protectMCPSecrets.bind(sallyPort),
  async (req, res) => {
    try {
      await sallyPort.getSecureOAuthCredentials(req, res);
    } catch (error) {
      console.error('OAuth credentials error:', error);
      res.status(500).json({ error: 'Failed to retrieve OAuth credentials' });
    }
  }
);

/**
 * Get MCP Configuration
 * GET /mcp/config
 */
router.get('/config',
  securityLimiter,
  sallyPort.protectMCPSecrets.bind(sallyPort),
  async (req, res) => {
    try {
      // Verify config access permission
      if (!req.mcpPermissions?.configAllowed) {
        return res.status(403).json({ error: 'Configuration access not permitted' });
      }

      const config = {
        gatewayUrl: 'https://drclaude.live/mcp',
        authorizationUrl: 'https://drclaude.live/oauth/authorize',
        tokenUrl: 'https://drclaude.live/oauth/token',
        scopes: ['mcp:read', 'mcp:write', 'mcp:execute'],
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
          multiTenant: true
        },
        regions: ['us-west1', 'europe-west1'],
        supportedTenants: ['default', 'production', 'staging']
      };

      // Log configuration access
      await sallyPort.logSecureAccess(
        req.mcpSession.sessionId, 
        'mcp-config', 
        req.ip
      );

      res.status(200).json({
        success: true,
        config,
        accessedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Configuration retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve configuration' });
    }
  }
);

/**
 * Get Session Status
 * GET /mcp/session/:sessionId
 */
router.get('/session/:sessionId', securityLimiter, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const sessionDoc = await admin.firestore()
      .collection('mcp-sallyport-sessions')
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionDoc.data();
    
    // Return safe session info (no sensitive data)
    res.status(200).json({
      sessionId: session.sessionId,
      verificationStage: session.verificationStage,
      trustScore: session.trustScore,
      permissions: session.mcpAccess,
      timeRemaining: Math.max(0, 
        (session.entryTime + sallyPort.sessionTimeout) - Date.now()
      )
    });

  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ error: 'Failed to retrieve session status' });
  }
});

/**
 * Revoke Access Token
 * DELETE /mcp/access/:tokenHash
 */
router.delete('/access/:tokenHash', 
  strictLimiter,
  sallyPort.protectMCPSecrets.bind(sallyPort),
  async (req, res) => {
    try {
      const { tokenHash } = req.params;
      
      // Delete the access token
      await admin.firestore()
        .collection('mcp-access-tokens')
        .doc(tokenHash)
        .delete();

      // Log revocation
      await sallyPort.logSecureAccess(
        req.mcpSession.sessionId, 
        'token-revocation', 
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Access token revoked'
      });

    } catch (error) {
      console.error('Token revocation error:', error);
      res.status(500).json({ error: 'Failed to revoke access token' });
    }
  }
);

/**
 * Security Health Check
 * GET /mcp/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'operational',
    sallyPortActive: true,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Get Security Logs (Admin only)
 * GET /mcp/logs
 */
router.get('/logs',
  strictLimiter,
  sallyPort.protectMCPSecrets.bind(sallyPort),
  async (req, res) => {
    try {
      // Check for admin permissions (extend as needed)
      if (!req.mcpPermissions?.configAllowed) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const logsQuery = admin.firestore()
        .collection('mcp-security-logs')
        .orderBy('timestamp', 'desc')
        .limit(50);

      const snapshot = await logsQuery.get();
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        success: true,
        logs,
        count: logs.length
      });

    } catch (error) {
      console.error('Logs retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve security logs' });
    }
  }
);

/**
 * Emergency Lockdown (Admin only)
 * POST /mcp/emergency/lockdown
 */
router.post('/emergency/lockdown',
  strictLimiter,
  sallyPort.protectMCPSecrets.bind(sallyPort),
  async (req, res) => {
    try {
      // Emergency lockdown - revoke all active sessions and tokens
      const batch = admin.firestore().batch();
      
      // Get all active sessions
      const sessionsQuery = admin.firestore()
        .collection('mcp-sallyport-sessions')
        .where('verificationStage', '==', 'approved');
      
      const sessionsSnapshot = await sessionsQuery.get();
      
      // Mark all sessions as locked down
      sessionsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          verificationStage: 'emergency-lockdown',
          lockdownAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      // Get all active tokens
      const tokensQuery = admin.firestore()
        .collection('mcp-access-tokens')
        .where('expiresAt', '>', Date.now());
      
      const tokensSnapshot = await tokensQuery.get();
      
      // Delete all active tokens
      tokensSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Log emergency action
      await admin.firestore()
        .collection('mcp-security-logs')
        .add({
          action: 'emergency-lockdown',
          initiatedBy: req.mcpSession.sessionId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          affectedSessions: sessionsSnapshot.size,
          revokedTokens: tokensSnapshot.size
        });
      
      res.status(200).json({
        success: true,
        message: 'Emergency lockdown activated',
        affectedSessions: sessionsSnapshot.size,
        revokedTokens: tokensSnapshot.size
      });
      
    } catch (error) {
      console.error('Emergency lockdown error:', error);
      res.status(500).json({ error: 'Emergency lockdown failed' });
    }
  }
);

module.exports = router;

