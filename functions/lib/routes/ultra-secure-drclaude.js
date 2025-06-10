/**
 * Ultra-Secure DrClaude Routes
 * 
 * Protected endpoints for DrClaude and Doc/Prof access
 * Requires SA Internal (90+) or Diamond SAO (100+) clearance
 * 
 * (c) 2025 Copyright AI Publishing International LLP All Rights Reserved.
 */

const express = require('express');
const UltraSecureClearance = require('../auth/ultra-secure-clearance');
const rateLimit = require('express-rate-limit');
const admin = require('firebase-admin');

const router = express.Router();
const ultraClearance = new UltraSecureClearance();

// Ultra-strict rate limiting for DrClaude access
const drClaudeRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 2, // Only 2 requests per 10 minutes
  message: {
    error: 'DrClaude access rate limit exceeded',
    message: 'Ultra-high security endpoints have strict rate limits',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const docProfRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 requests per 5 minutes for doc/prof access
  message: {
    error: 'Doc/Prof access rate limit exceeded',
    retryAfter: '5 minutes'
  }
});

/**
 * Security Clearance Verification Endpoint
 * POST /clearance/verify
 */
router.post('/clearance/verify', drClaudeRateLimit, async (req, res) => {
  try {
    await ultraClearance.verifyClearanceLevel(req, res);
  } catch (error) {
    console.error('Clearance verification error:', error);
    res.status(500).json({ error: 'Clearance verification system error' });
  }
});

/**
 * DrClaude Access Portal
 * GET /drclaude
 * Requires SA Internal (90+) clearance
 */
router.get('/drclaude', 
  drClaudeRateLimit,
  ultraClearance.protectUltraSecureEndpoint(90), // SA Internal level
  async (req, res) => {
    try {
      // Log high-clearance access
      await admin.firestore()
        .collection('drclaude-access-logs')
        .add({
          userId: req.clearance.userId,
          clearanceLevel: req.clearance.level,
          accessTime: admin.firestore.FieldValue.serverTimestamp(),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });

      // Return DrClaude interface configuration
      res.status(200).json({
        access: 'granted',
        service: 'DrClaude AI Consultation',
        clearanceLevel: req.clearance.level,
        interface: {
          endpoint: 'https://drclaude.live/mcp',
          capabilities: [
            'advanced-ai-consultation',
            'medical-analysis',
            'research-assistance',
            'professional-guidance'
          ],
          securityNotice: 'All interactions are monitored and logged',
          sessionTimeout: 900000, // 15 minutes
          restrictions: [
            'No sharing of session tokens',
            'No recording or screenshots',
            'Authorized personnel only'
          ]
        },
        accessedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('DrClaude access error:', error);
      res.status(500).json({ error: 'DrClaude service error' });
    }
  }
);

/**
 * DrClaude MCP Configuration
 * GET /drclaude/mcp-config
 * Requires Diamond SAO (100+) clearance for MCP configuration
 */
router.get('/drclaude/mcp-config',
  drClaudeRateLimit,
  ultraClearance.protectUltraSecureEndpoint(100), // Diamond SAO level
  async (req, res) => {
    try {
      // Retrieve OAuth credentials from Secret Manager
      const clientId = await getSecretValue('mcp-oauth-client-id');
      const clientSecret = await getSecretValue('mcp-oauth-client-secret');

      const mcpConfig = {
        gatewayUrl: 'https://drclaude.live/mcp',
        authorizationUrl: 'https://drclaude.live/oauth/authorize',
        tokenUrl: 'https://drclaude.live/oauth/token',
        clientId,
        clientSecret,
        scopes: ['mcp:read', 'mcp:write', 'mcp:execute'],
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
          multiTenant: true
        },
        securityLevel: 'ultra-high',
        clearanceRequired: 'Diamond SAO (100+)'
      };

      // Log MCP config access
      await admin.firestore()
        .collection('mcp-config-access-logs')
        .add({
          userId: req.clearance.userId,
          clearanceLevel: req.clearance.level,
          accessTime: admin.firestore.FieldValue.serverTimestamp(),
          ipAddress: req.ip,
          configType: 'mcp-credentials'
        });

      res.status(200).json({
        success: true,
        mcpConfig,
        accessedAt: new Date().toISOString(),
        securityNotice: 'MCP credentials are for authorized use only'
      });

    } catch (error) {
      console.error('MCP config access error:', error);
      res.status(500).json({ error: 'Failed to retrieve MCP configuration' });
    }
  }
);

/**
 * Doctor/Professor Portal Access
 * GET /doc-prof
 * Requires SA Internal (90+) clearance
 */
router.get('/doc-prof',
  docProfRateLimit,
  ultraClearance.protectUltraSecureEndpoint(90), // SA Internal level
  async (req, res) => {
    try {
      // Check specific professional authorization
      const professionalAuth = await checkProfessionalAuthorization(req.clearance.userId);
      
      if (!professionalAuth.authorized) {
        return res.status(403).json({
          error: 'Additional professional authorization required',
          reason: professionalAuth.reason
        });
      }

      // Log professional access
      await admin.firestore()
        .collection('professional-access-logs')
        .add({
          userId: req.clearance.userId,
          clearanceLevel: req.clearance.level,
          professionalLevel: professionalAuth.level,
          accessTime: admin.firestore.FieldValue.serverTimestamp(),
          ipAddress: req.ip
        });

      res.status(200).json({
        access: 'granted',
        service: 'Professional Consultation Portal',
        clearanceLevel: req.clearance.level,
        professionalLevel: professionalAuth.level,
        availableServices: [
          'medical-consultation',
          'academic-research',
          'professional-analysis',
          'expert-opinion',
          'peer-review'
        ],
        interface: {
          endpoint: 'https://drclaude.live/professional',
          securityProtocol: 'HIPAA-compliant',
          dataEncryption: 'end-to-end',
          auditTrail: 'comprehensive'
        },
        accessedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Doc/Prof access error:', error);
      res.status(500).json({ error: 'Professional portal service error' });
    }
  }
);

/**
 * Emergency Access Override
 * POST /emergency/override
 * Requires Diamond SAO (100+) clearance
 */
router.post('/emergency/override',
  ultraClearance.protectUltraSecureEndpoint(100), // Diamond SAO only
  async (req, res) => {
    try {
      const { emergencyCode, justification, targetUserId } = req.body;
      
      // Verify emergency code
      const emergencyValid = await verifyEmergencyCode(emergencyCode);
      if (!emergencyValid) {
        return res.status(401).json({ error: 'Invalid emergency code' });
      }

      // Grant temporary elevated access
      const overrideToken = await generateEmergencyOverrideToken(
        req.clearance.userId,
        targetUserId,
        justification
      );

      // Log emergency override
      await admin.firestore()
        .collection('emergency-overrides')
        .add({
          authorizedBy: req.clearance.userId,
          targetUserId,
          justification,
          overrideToken,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          ipAddress: req.ip,
          emergencyCode: emergencyCode.substring(0, 4) + '****' // Partial log
        });

      res.status(200).json({
        overrideGranted: true,
        overrideToken,
        validFor: '30 minutes',
        authorizedBy: req.clearance.userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Emergency override error:', error);
      res.status(500).json({ error: 'Emergency override system error' });
    }
  }
);

/**
 * Security Audit Log
 * GET /security/audit
 * Requires Diamond SAO (100+) clearance
 */
router.get('/security/audit',
  ultraClearance.protectUltraSecureEndpoint(100),
  async (req, res) => {
    try {
      const { timeRange = '24h', severity = 'all' } = req.query;
      
      let startTime;
      switch (timeRange) {
        case '1h': startTime = Date.now() - (60 * 60 * 1000); break;
        case '24h': startTime = Date.now() - (24 * 60 * 60 * 1000); break;
        case '7d': startTime = Date.now() - (7 * 24 * 60 * 60 * 1000); break;
        default: startTime = Date.now() - (24 * 60 * 60 * 1000);
      }

      let query = admin.firestore()
        .collection('ultra-secure-audit-logs')
        .where('timestamp', '>=', new Date(startTime))
        .orderBy('timestamp', 'desc')
        .limit(100);

      if (severity !== 'all') {
        query = query.where('severity', '==', severity);
      }

      const snapshot = await query.get();
      const auditLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        success: true,
        auditLogs,
        timeRange,
        severity,
        count: auditLogs.length,
        retrievedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Security audit error:', error);
      res.status(500).json({ error: 'Security audit system error' });
    }
  }
);

/**
 * System Status for Ultra-Secure Services
 * GET /status
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'operational',
    securityLevel: 'ultra-high',
    clearanceLevels: {
      'SA Internal': 90,
      'Diamond SAO': 100
    },
    protectedServices: [
      'DrClaude AI Consultation',
      'Professional Portal (Doc/Prof)',
      'MCP Secret Configuration',
      'Emergency Override System'
    ],
    securityFeatures: [
      'Multi-factor authentication',
      'Biometric verification',
      'Hardware token requirements',
      'Real-time background checks',
      'Comprehensive audit logging'
    ],
    timestamp: new Date().toISOString()
  });
});

// Helper functions
async function getSecretValue(secretName) {
  try {
    const [version] = await secretClient.accessSecretVersion({
      name: `projects/api-for-warp-drive/secrets/${secretName}/versions/latest`
    });
    return version.payload.data.toString();
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}:`, error);
    throw error;
  }
}

async function checkProfessionalAuthorization(userId) {
  try {
    const profDoc = await admin.firestore()
      .collection('professional-authorizations')
      .doc(userId)
      .get();

    if (!profDoc.exists) {
      return {
        authorized: false,
        reason: 'No professional authorization on file'
      };
    }

    const profData = profDoc.data();
    if (profData.expiresAt && Date.now() > profData.expiresAt) {
      return {
        authorized: false,
        reason: 'Professional authorization expired'
      };
    }

    return {
      authorized: true,
      level: profData.professionalLevel,
      specializations: profData.specializations
    };
  } catch (error) {
    console.error('Professional authorization check error:', error);
    return {
      authorized: false,
      reason: 'Authorization system error'
    };
  }
}

async function verifyEmergencyCode(emergencyCode) {
  // Verify emergency override code
  // In production, this would check against secure emergency codes
  return emergencyCode && emergencyCode.startsWith('EMERGENCY-') && emergencyCode.length > 20;
}

async function generateEmergencyOverrideToken(authorizedBy, targetUserId, justification) {
  const overrideData = {
    authorizedBy,
    targetUserId,
    justification,
    issuedAt: Date.now(),
    expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
    type: 'emergency-override'
  };

  return Buffer.from(JSON.stringify(overrideData)).toString('base64');
}

module.exports = router;

