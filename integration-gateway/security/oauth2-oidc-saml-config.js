/**
 * Enhanced OAuth2, OIDC, and SAML Security Configuration
 * 
 * Implements comprehensive hardening for ASOOS Integration Gateway
 * with Diamond/Emerald/Ruby/Sapphire membership tier support
 * 
 * © 2025 ASOOS Integration Gateway
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Membership Tier Configuration
const MEMBERSHIP_TIERS = {
  DIAMOND: {
    name: 'Diamond',
    level: 1,
    description: 'CEO level access',
    maxSessions: 10,
    sessionTimeout: 86400, // 24 hours
    requireMFA: true,
    requireBiometric: true,
    allowedRedirectUris: ['*'], // Full access
    ipRestrictions: false,
    geoRestrictions: false,
    maxApplications: 50
  },
  EMERALD: {
    name: 'Emerald',
    level: 2,
    description: 'Second tier leadership',
    maxSessions: 8,
    sessionTimeout: 43200, // 12 hours
    requireMFA: true,
    requireBiometric: true,
    allowedRedirectUris: ['https://*.asoos.cool/*', 'https://*.coaching2100.com/*'],
    ipRestrictions: true,
    geoRestrictions: false,
    maxApplications: 25
  },
  RUBY: {
    name: 'Ruby',
    level: 3,
    description: 'Third tier leadership',
    maxSessions: 5,
    sessionTimeout: 28800, // 8 hours
    requireMFA: true,
    requireBiometric: false,
    allowedRedirectUris: ['https://*.asoos.cool/*', 'https://*.coaching2100.com/*'],
    ipRestrictions: true,
    geoRestrictions: true,
    maxApplications: 10
  },
  SAPPHIRE: {
    name: 'Sapphire',
    level: 4,
    description: 'General members',
    maxSessions: 3,
    sessionTimeout: 14400, // 4 hours
    requireMFA: true,
    requireBiometric: false,
    allowedRedirectUris: ['https://academy.asoos.cool/*', 'https://portal.coaching2100.com/*'],
    ipRestrictions: true,
    geoRestrictions: true,
    maxApplications: 5
  }
};

// OAuth2 Configuration with Enhanced Security
const OAUTH2_CONFIG = {
  // Authorization Server Configuration
  authorizationServer: {
    issuer: 'https://auth.asoos.cool',
    authorizationEndpoint: 'https://auth.asoos.cool/oauth2/authorize',
    tokenEndpoint: 'https://auth.asoos.cool/oauth2/token',
    revocationEndpoint: 'https://auth.asoos.cool/oauth2/revoke',
    introspectionEndpoint: 'https://auth.asoos.cool/oauth2/introspect',
    userInfoEndpoint: 'https://auth.asoos.cool/oauth2/userinfo',
    jwksUri: 'https://auth.asoos.cool/.well-known/jwks.json',
    
    // Enhanced Security Features
    supportedResponseTypes: ['code'],
    supportedGrantTypes: ['authorization_code', 'refresh_token'],
    supportedScopes: ['openid', 'profile', 'email', 'asoos:read', 'asoos:write', 'asoos:admin'],
    supportedTokenEndpointAuthMethods: ['client_secret_basic', 'client_secret_post', 'private_key_jwt'],
    
    // PKCE Requirements
    pkceRequired: true,
    pkceMethodsSupported: ['S256'],
    
    // Additional Security
    requirePushedAuthorizationRequests: true,
    requireSignedRequestObject: true,
    supportedRequestObjectSigningAlgs: ['RS256', 'ES256'],
    
    // Token Security
    accessTokenLifetime: 3600, // 1 hour
    refreshTokenLifetime: 86400, // 24 hours  
    refreshTokenRotationEnabled: true,
    revokeRefreshTokenOnUse: true,
    
    // Rate Limiting
    rateLimiting: {
      tokensPerMinute: 60,
      authorizationsPerMinute: 10,
      introspectionsPerMinute: 100
    }
  },

  // Client Configuration by Tier
  clientConfiguration: {
    // Client Secret Management
    secretManagement: {
      rotationIntervalDays: 90,
      minimumSecretLength: 64,
      requireSecretHashing: true,
      secretHashingAlgorithm: 'SHA-256',
      allowPlaintextSecrets: false,
      
      // Tier-specific rotation
      tierRotationSchedule: {
        DIAMOND: 30,    // 30 days
        EMERALD: 60,    // 60 days
        RUBY: 90,       // 90 days
        SAPPHIRE: 180   // 180 days
      }
    },

    // PKCE Configuration for Public Clients
    pkceConfig: {
      enforceForPublicClients: true,
      enforceForConfidentialClients: true,
      allowPlainCodeChallenge: false,
      requiredCodeChallengeMethod: 'S256',
      minimumCodeVerifierLength: 43,
      maximumCodeVerifierLength: 128
    },

    // Redirect URI Whitelisting
    redirectUriValidation: {
      strictMatching: true,
      allowWildcards: false,
      enforceHttps: true,
      allowLocalhost: false, // Only in development
      maxRedirectUris: 10,
      
      // Tier-specific validation
      tierValidation: {
        DIAMOND: {
          allowAnySubdomain: true,
          requireExactMatch: false
        },
        EMERALD: {
          allowAnySubdomain: false,
          requireExactMatch: true
        },
        RUBY: {
          allowAnySubdomain: false,
          requireExactMatch: true
        },
        SAPPHIRE: {
          allowAnySubdomain: false,
          requireExactMatch: true
        }
      }
    },

    // IP and Geo Restrictions
    accessRestrictions: {
      ipWhitelisting: {
        enabled: true,
        allowDynamicIPs: false,
        maxIpAddresses: 10,
        
        // Tier-specific IP restrictions
        tierRestrictions: {
          DIAMOND: { enabled: false },
          EMERALD: { enabled: true, maxIPs: 20 },
          RUBY: { enabled: true, maxIPs: 10 },
          SAPPHIRE: { enabled: true, maxIPs: 5 }
        }
      },
      
      geographicRestrictions: {
        enabled: true,
        allowedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR'],
        blockedCountries: ['CN', 'RU', 'KP'],
        
        // Tier-specific geo restrictions
        tierRestrictions: {
          DIAMOND: { enabled: false },
          EMERALD: { enabled: false },
          RUBY: { enabled: true },
          SAPPHIRE: { enabled: true }
        }
      }
    }
  }
};

// OIDC Configuration with Enhanced Security
const OIDC_CONFIG = {
  // Core OIDC Configuration
  provider: {
    issuer: 'https://auth.asoos.cool',
    authorizationEndpoint: 'https://auth.asoos.cool/oidc/authorize',
    tokenEndpoint: 'https://auth.asoos.cool/oidc/token',
    userInfoEndpoint: 'https://auth.asoos.cool/oidc/userinfo',
    jwksUri: 'https://auth.asoos.cool/.well-known/jwks.json',
    endSessionEndpoint: 'https://auth.asoos.cool/oidc/logout',
    
    // ID Token Configuration
    idTokenSigningAlgValuesSupported: ['RS256', 'ES256', 'PS256'],
    idTokenEncryptionAlgValuesSupported: ['RSA-OAEP', 'RSA-OAEP-256', 'A128KW', 'A192KW', 'A256KW'],
    idTokenEncryptionEncValuesSupported: ['A128CBC-HS256', 'A192CBC-HS384', 'A256CBC-HS512', 'A128GCM', 'A192GCM', 'A256GCM'],
    
    // User Info Endpoint Security
    userInfoSigningAlgValuesSupported: ['RS256', 'ES256', 'PS256'],
    userInfoEncryptionAlgValuesSupported: ['RSA-OAEP', 'RSA-OAEP-256'],
    userInfoEncryptionEncValuesSupported: ['A128CBC-HS256', 'A192CBC-HS384', 'A256CBC-HS512'],
    
    // Claims Configuration
    claimsSupported: [
      'sub', 'name', 'given_name', 'family_name', 'email', 'email_verified',
      'picture', 'locale', 'zoneinfo', 'updated_at',
      // Custom ASOOS claims
      'membership_tier', 'ce_uuid', 'pilot_id', 'region', 'verifications'
    ],
    
    // Subject Types
    subjectTypesSupported: ['public', 'pairwise'],
    
    // Response Types and Modes
    responseTypesSupported: ['code', 'id_token', 'code id_token'],
    responseModesSupported: ['query', 'fragment', 'form_post'],
    
    // Grant Types
    grantTypesSupported: ['authorization_code', 'refresh_token'],
    
    // Token Endpoint Auth Methods
    tokenEndpointAuthMethodsSupported: ['client_secret_basic', 'client_secret_post', 'private_key_jwt'],
    tokenEndpointAuthSigningAlgValuesSupported: ['RS256', 'ES256', 'PS256']
  },

  // MFA Requirements by Tier
  mfaConfiguration: {
    required: true,
    methods: ['totp', 'sms', 'email', 'webauthn', 'biometric'],
    
    tierRequirements: {
      DIAMOND: {
        requiredMethods: ['webauthn', 'biometric'],
        minimumMethods: 2,
        reauthenticationInterval: 86400 // 24 hours
      },
      EMERALD: {
        requiredMethods: ['totp', 'webauthn'],
        minimumMethods: 2,
        reauthenticationInterval: 43200 // 12 hours
      },
      RUBY: {
        requiredMethods: ['totp'],
        minimumMethods: 1,
        reauthenticationInterval: 28800 // 8 hours
      },
      SAPPHIRE: {
        requiredMethods: ['totp'],
        minimumMethods: 1,
        reauthenticationInterval: 14400 // 4 hours
      }
    },
    
    // WebAuthn Configuration
    webauthn: {
      relyingPartyId: 'asoos.cool',
      relyingPartyName: 'ASOOS Integration Gateway',
      attestationConveyancePreference: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: true
      },
      timeout: 60000,
      extensions: {
        credProps: true,
        largeBlob: true
      }
    }
  },

  // Session Management
  sessionManagement: {
    sessionStateRequired: true,
    checkSessionIframe: 'https://auth.asoos.cool/oidc/check_session',
    endSessionEndpoint: 'https://auth.asoos.cool/oidc/logout',
    frontchannelLogoutSupported: true,
    frontchannelLogoutSessionSupported: true,
    backchannelLogoutSupported: true,
    backchannelLogoutSessionSupported: true
  }
};

// SAML Configuration with Enhanced Security
const SAML_CONFIG = {
  // Identity Provider Configuration
  identityProvider: {
    entityId: 'https://auth.asoos.cool/saml/metadata',
    singleSignOnService: {
      url: 'https://auth.asoos.cool/saml/sso',
      binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
    },
    singleLogoutService: {
      url: 'https://auth.asoos.cool/saml/slo',
      binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
    },
    
    // Certificate Configuration
    certificates: {
      signing: {
        algorithm: 'RSA',
        keySize: 4096,
        validityPeriod: 365, // days
        rotationInterval: 180 // days
      },
      encryption: {
        algorithm: 'RSA',
        keySize: 4096,
        validityPeriod: 365, // days
        rotationInterval: 180 // days
      }
    }
  },

  // Security Configuration
  security: {
    // Assertion Security
    assertionSecurity: {
      maxAssertionValidityMinutes: 5,
      notOnOrAfterLeewaySeconds: 300,
      audienceRestriction: true,
      subjectConfirmationRequired: true,
      subjectConfirmationMethods: ['urn:oasis:names:tc:SAML:2.0:cm:bearer'],
      
      // Tier-specific assertion validity
      tierAssertionValidity: {
        DIAMOND: 10, // 10 minutes
        EMERALD: 5,  // 5 minutes
        RUBY: 3,     // 3 minutes
        SAPPHIRE: 2  // 2 minutes
      }
    },

    // Encryption Requirements
    encryption: {
      requireEncryptedAssertions: true,
      requireEncryptedAttributes: true,
      encryptionAlgorithm: 'http://www.w3.org/2009/xmlenc11#aes256-gcm',
      keyEncryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p',
      
      // Tier-specific encryption
      tierEncryption: {
        DIAMOND: {
          algorithm: 'http://www.w3.org/2009/xmlenc11#aes256-gcm',
          keySize: 256
        },
        EMERALD: {
          algorithm: 'http://www.w3.org/2009/xmlenc11#aes256-gcm',
          keySize: 256
        },
        RUBY: {
          algorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
          keySize: 256
        },
        SAPPHIRE: {
          algorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
          keySize: 256
        }
      }
    },

    // Signature Requirements
    signatures: {
      requireSignedRequests: true,
      requireSignedAssertions: true,
      requireSignedResponses: true,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      
      // Tier-specific signature requirements
      tierSignatures: {
        DIAMOND: {
          algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
          keySize: 4096
        },
        EMERALD: {
          algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384',
          keySize: 3072
        },
        RUBY: {
          algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
          keySize: 2048
        },
        SAPPHIRE: {
          algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
          keySize: 2048
        }
      }
    }
  },

  // Just-In-Time Provisioning
  jitProvisioning: {
    enabled: true,
    createMissingUsers: true,
    updateExistingUsers: true,
    
    // Minimal Privilege Configuration
    defaultPrivileges: {
      DIAMOND: ['read', 'write', 'admin', 'manage_users', 'system_config'],
      EMERALD: ['read', 'write', 'admin', 'manage_team'],
      RUBY: ['read', 'write', 'manage_own'],
      SAPPHIRE: ['read', 'write_limited']
    },
    
    // Attribute Mapping
    attributeMapping: {
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'sub',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'name',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'email',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'given_name',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'family_name',
      // Custom ASOOS attributes
      'https://asoos.cool/claims/membership_tier': 'membership_tier',
      'https://asoos.cool/claims/ce_uuid': 'ce_uuid',
      'https://asoos.cool/claims/pilot_id': 'pilot_id'
    },
    
    // Tier Determination Logic
    tierDetermination: {
      attributeName: 'https://asoos.cool/claims/membership_tier',
      defaultTier: 'SAPPHIRE',
      validationRequired: true
    }
  }
};

// Security Utilities
class SecurityUtils {
  static generateClientSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  static generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  static validateRedirectUri(uri, tier, clientConfig) {
    const tierConfig = MEMBERSHIP_TIERS[tier];
    const allowedPatterns = tierConfig.allowedRedirectUris;

    if (allowedPatterns.includes('*')) {
      return true; // Diamond tier allows all
    }

    return allowedPatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(uri);
      }
      return pattern === uri;
    });
  }

  static isIPAllowed(ip, tier, clientConfig) {
    const tierConfig = MEMBERSHIP_TIERS[tier];
    
    if (!tierConfig.ipRestrictions) {
      return true;
    }

    // Implementation would check against configured IP whitelist
    return true; // Placeholder
  }

  static isGeoAllowed(country, tier) {
    const tierConfig = MEMBERSHIP_TIERS[tier];
    
    if (!tierConfig.geoRestrictions) {
      return true;
    }

    const restrictions = OAUTH2_CONFIG.clientConfiguration.accessRestrictions.geographicRestrictions;
    return restrictions.allowedCountries.includes(country) && 
           !restrictions.blockedCountries.includes(country);
  }

  static requiresMFA(tier, lastAuth) {
    const tierConfig = MEMBERSHIP_TIERS[tier];
    const mfaConfig = OIDC_CONFIG.mfaConfiguration.tierRequirements[tier];
    
    if (!tierConfig.requireMFA) {
      return false;
    }

    const timeSinceLastAuth = Date.now() - lastAuth;
    return timeSinceLastAuth > (mfaConfig.reauthenticationInterval * 1000);
  }
}

// Application Credential Rotation Manager
class CredentialRotationManager {
  static async rotateClientSecret(clientId, tier) {
    const rotationInterval = OAUTH2_CONFIG.clientConfiguration.secretManagement.tierRotationSchedule[tier];
    const newSecret = SecurityUtils.generateClientSecret();
    
    // Implementation would:
    // 1. Generate new secret
    // 2. Store in secure storage with version
    // 3. Schedule old secret deprecation
    // 4. Notify client of rotation
    
    return {
      clientId,
      newSecret,
      rotationDate: new Date(),
      deprecationDate: new Date(Date.now() + (rotationInterval * 24 * 60 * 60 * 1000))
    };
  }

  static async rotateSAMLCertificate(entityId, certificateType) {
    const certConfig = SAML_CONFIG.identityProvider.certificates[certificateType];
    
    // Implementation would:
    // 1. Generate new key pair
    // 2. Create new certificate
    // 3. Update metadata
    // 4. Schedule old certificate deprecation
    
    return {
      entityId,
      certificateType,
      rotationDate: new Date(),
      validUntil: new Date(Date.now() + (certConfig.validityPeriod * 24 * 60 * 60 * 1000))
    };
  }
}

module.exports = {
  MEMBERSHIP_TIERS,
  OAUTH2_CONFIG,
  OIDC_CONFIG,
  SAML_CONFIG,
  SecurityUtils,
  CredentialRotationManager
};
