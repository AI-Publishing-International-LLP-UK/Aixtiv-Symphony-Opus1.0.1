/**
 * ASOOS Tiered Security Configuration
 * 
 * Maps Diamond/Emerald/Ruby/Sapphire tiers to existing 9 ASOOS user types
 * Implements OAuth2, OIDC, and SAML hardening based on user type hierarchy
 * 
 * © 2025 ASOOS Integration Gateway
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Map your 9 existing user types to the 4-tier system
const ASOOS_USER_TYPE_TIER_MAPPING = {
  // DIAMOND TIER (CEO Level - Highest Security)
  'C-L-E': 'DIAMOND',           // Corporate Enterprise Leader
  'O-L-E': 'DIAMOND',           // Organizational Enterprise Leader
  
  // EMERALD TIER (Second Level Leadership)
  'C-L-T': 'EMERALD',           // Corporate Team Leader  
  'C-L-G': 'EMERALD',           // Corporate Group Leader
  'O-L-D': 'EMERALD',           // Organizational Department Leader
  'CM-L-I': 'EMERALD',          // Community Leader
  
  // RUBY TIER (Third Level Leadership/Advanced Members)
  'C-M-E': 'RUBY',              // Corporate Enterprise Member
  'A-F-C': 'RUBY',              // Academic Faculty
  'A-E-C': 'RUBY',              // Academic Educator
  
  // SAPPHIRE TIER (General Members)
  'C-M-T': 'SAPPHIRE',          // Corporate Team Member
  'C-M-G': 'SAPPHIRE',          // Corporate Group Member
  'O-M-T': 'SAPPHIRE',          // Organizational Team Member
  'A-S-C': 'SAPPHIRE',          // Academic Student
  'CM-M-I': 'SAPPHIRE'          // Community Member
};

// Enhanced tier configurations based on user type
const TIER_SECURITY_PROFILES = {
  DIAMOND: {
    name: 'Diamond',
    description: 'Enterprise Leadership - Maximum Security',
    securityLevel: 'maximum',
    
    // OAuth2/OIDC Configuration
    oauth2: {
      clientSecretRotationDays: 30,
      pkceRequired: true,
      strictRedirectUriValidation: false, // Allow flexibility for enterprise
      maxRedirectUris: 50,
      accessTokenLifetime: 7200,  // 2 hours
      refreshTokenLifetime: 172800, // 48 hours
      allowedScopes: ['openid', 'profile', 'email', 'asoos:admin', 'asoos:enterprise', 'asoos:read', 'asoos:write'],
      
      // IP/Geo Restrictions
      ipRestrictions: {
        enabled: false, // Diamond users can access from anywhere
        maxIpAddresses: 100
      },
      geoRestrictions: {
        enabled: false, // No geographic restrictions
        allowedCountries: '*'
      }
    },
    
    // MFA Requirements
    mfa: {
      required: true,
      minimumFactors: 2,
      supportedMethods: ['webauthn', 'biometric', 'totp', 'hardware_token'],
      requiredMethods: ['webauthn', 'biometric'],
      reauthenticationInterval: 86400, // 24 hours
      adaptiveAuth: true
    },
    
    // SAML Configuration
    saml: {
      assertionValidityMinutes: 15,
      encryptionRequired: true,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
      encryptionAlgorithm: 'http://www.w3.org/2009/xmlenc11#aes256-gcm',
      keySize: 4096
    },
    
    // Session Management
    session: {
      maxConcurrentSessions: 15,
      sessionTimeoutSeconds: 86400, // 24 hours
      idleTimeoutSeconds: 14400,    // 4 hours
      forceLogoutOnSuspiciousActivity: true
    },
    
    // Rate Limiting
    rateLimiting: {
      requestsPerMinute: 2000,
      authRequestsPerMinute: 50,
      tokenRequestsPerMinute: 200
    }
  },

  EMERALD: {
    name: 'Emerald', 
    description: 'Team/Department Leadership - High Security',
    securityLevel: 'high',
    
    oauth2: {
      clientSecretRotationDays: 60,
      pkceRequired: true,
      strictRedirectUriValidation: true,
      maxRedirectUris: 25,
      accessTokenLifetime: 3600,   // 1 hour
      refreshTokenLifetime: 86400, // 24 hours
      allowedScopes: ['openid', 'profile', 'email', 'asoos:lead', 'asoos:read', 'asoos:write'],
      
      ipRestrictions: {
        enabled: true,
        maxIpAddresses: 20,
        allowDynamicIPs: true
      },
      geoRestrictions: {
        enabled: false,
        allowedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'SE']
      }
    },
    
    mfa: {
      required: true,
      minimumFactors: 2,
      supportedMethods: ['webauthn', 'totp', 'sms', 'email'],
      requiredMethods: ['webauthn', 'totp'],
      reauthenticationInterval: 43200, // 12 hours
      adaptiveAuth: true
    },
    
    saml: {
      assertionValidityMinutes: 10,
      encryptionRequired: true,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha384',
      encryptionAlgorithm: 'http://www.w3.org/2009/xmlenc11#aes256-gcm',
      keySize: 3072
    },
    
    session: {
      maxConcurrentSessions: 10,
      sessionTimeoutSeconds: 43200, // 12 hours
      idleTimeoutSeconds: 7200,     // 2 hours
      forceLogoutOnSuspiciousActivity: true
    },
    
    rateLimiting: {
      requestsPerMinute: 1000,
      authRequestsPerMinute: 30,
      tokenRequestsPerMinute: 100
    }
  },

  RUBY: {
    name: 'Ruby',
    description: 'Advanced Members/Faculty - Enhanced Security', 
    securityLevel: 'enhanced',
    
    oauth2: {
      clientSecretRotationDays: 90,
      pkceRequired: true,
      strictRedirectUriValidation: true,
      maxRedirectUris: 10,
      accessTokenLifetime: 3600,   // 1 hour
      refreshTokenLifetime: 43200, // 12 hours
      allowedScopes: ['openid', 'profile', 'email', 'asoos:member', 'asoos:read', 'asoos:write_limited'],
      
      ipRestrictions: {
        enabled: true,
        maxIpAddresses: 10,
        allowDynamicIPs: false
      },
      geoRestrictions: {
        enabled: true,
        allowedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR']
      }
    },
    
    mfa: {
      required: true,
      minimumFactors: 1,
      supportedMethods: ['totp', 'sms', 'email', 'webauthn'],
      requiredMethods: ['totp'],
      reauthenticationInterval: 28800, // 8 hours
      adaptiveAuth: true
    },
    
    saml: {
      assertionValidityMinutes: 8,
      encryptionRequired: true,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      encryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
      keySize: 2048
    },
    
    session: {
      maxConcurrentSessions: 5,
      sessionTimeoutSeconds: 28800, // 8 hours
      idleTimeoutSeconds: 3600,     // 1 hour
      forceLogoutOnSuspiciousActivity: true
    },
    
    rateLimiting: {
      requestsPerMinute: 500,
      authRequestsPerMinute: 20,
      tokenRequestsPerMinute: 50
    }
  },

  SAPPHIRE: {
    name: 'Sapphire',
    description: 'General Members/Students - Standard Security',
    securityLevel: 'standard',
    
    oauth2: {
      clientSecretRotationDays: 180,
      pkceRequired: true,
      strictRedirectUriValidation: true,
      maxRedirectUris: 5,
      accessTokenLifetime: 1800,   // 30 minutes
      refreshTokenLifetime: 21600, // 6 hours
      allowedScopes: ['openid', 'profile', 'email', 'asoos:basic', 'asoos:read'],
      
      ipRestrictions: {
        enabled: true,
        maxIpAddresses: 5,
        allowDynamicIPs: false
      },
      geoRestrictions: {
        enabled: true,
        allowedCountries: ['US', 'CA', 'GB', 'AU']
      }
    },
    
    mfa: {
      required: true,
      minimumFactors: 1,
      supportedMethods: ['totp', 'sms', 'email'],
      requiredMethods: ['totp'],
      reauthenticationInterval: 14400, // 4 hours
      adaptiveAuth: false
    },
    
    saml: {
      assertionValidityMinutes: 5,
      encryptionRequired: true,
      signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
      encryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
      keySize: 2048
    },
    
    session: {
      maxConcurrentSessions: 3,
      sessionTimeoutSeconds: 14400, // 4 hours
      idleTimeoutSeconds: 1800,     // 30 minutes
      forceLogoutOnSuspiciousActivity: true
    },
    
    rateLimiting: {
      requestsPerMinute: 200,
      authRequestsPerMinute: 10,
      tokenRequestsPerMinute: 25
    }
  }
};

// Core OAuth2 Authorization Server Configuration
const OAUTH2_AUTHORIZATION_SERVER = {
  issuer: 'https://auth.asoos.cool',
  authorizationEndpoint: 'https://auth.asoos.cool/oauth2/authorize',
  tokenEndpoint: 'https://auth.asoos.cool/oauth2/token',
  revocationEndpoint: 'https://auth.asoos.cool/oauth2/revoke',
  introspectionEndpoint: 'https://auth.asoos.cool/oauth2/introspect',
  userInfoEndpoint: 'https://auth.asoos.cool/oauth2/userinfo',
  jwksUri: 'https://auth.asoos.cool/.well-known/jwks.json',
  
  // Security Hardening
  supportedResponseTypes: ['code'], // Only authorization code flow
  supportedGrantTypes: ['authorization_code', 'refresh_token'],
  supportedTokenEndpointAuthMethods: ['client_secret_basic', 'client_secret_post', 'private_key_jwt'],
  
  // PKCE Requirements
  pkceRequired: true,
  pkceMethodsSupported: ['S256'],
  
  // Advanced Security
  requirePushedAuthorizationRequests: true,
  requireSignedRequestObject: true,
  supportedRequestObjectSigningAlgs: ['RS256', 'ES256', 'PS256'],
  
  // Token Security Policies
  refreshTokenRotationEnabled: true,
  revokeRefreshTokenOnUse: true,
  
  // Supported Scopes
  supportedScopes: [
    'openid', 'profile', 'email',
    'asoos:basic', 'asoos:read', 'asoos:write', 'asoos:write_limited',
    'asoos:member', 'asoos:lead', 'asoos:admin', 'asoos:enterprise'
  ]
};

// OIDC Provider Configuration
const OIDC_PROVIDER_CONFIG = {
  issuer: OAUTH2_AUTHORIZATION_SERVER.issuer,
  authorizationEndpoint: 'https://auth.asoos.cool/oidc/authorize',
  tokenEndpoint: 'https://auth.asoos.cool/oidc/token',
  userInfoEndpoint: 'https://auth.asoos.cool/oidc/userinfo',
  jwksUri: 'https://auth.asoos.cool/.well-known/jwks.json',
  endSessionEndpoint: 'https://auth.asoos.cool/oidc/logout',
  
  // ID Token Security
  idTokenSigningAlgValuesSupported: ['RS256', 'ES256', 'PS256'],
  idTokenEncryptionAlgValuesSupported: ['RSA-OAEP', 'RSA-OAEP-256', 'A128KW', 'A192KW', 'A256KW'],
  idTokenEncryptionEncValuesSupported: ['A128CBC-HS256', 'A192CBC-HS384', 'A256CBC-HS512', 'A128GCM', 'A192GCM', 'A256GCM'],
  
  // User Info Endpoint Security
  userInfoSigningAlgValuesSupported: ['RS256', 'ES256', 'PS256'],
  userInfoEncryptionAlgValuesSupported: ['RSA-OAEP', 'RSA-OAEP-256'],
  userInfoEncryptionEncValuesSupported: ['A128CBC-HS256', 'A192CBC-HS384', 'A256CBC-HS512'],
  
  // Supported Claims
  claimsSupported: [
    'sub', 'name', 'given_name', 'family_name', 'email', 'email_verified',
    'picture', 'locale', 'zoneinfo', 'updated_at',
    // ASOOS specific claims
    'user_type', 'tier', 'ce_uuid', 'pilot_id', 'region', 'verifications',
    'track', 'position', 'level', 'specialized_roles', 'payment_tier'
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
  tokenEndpointAuthSigningAlgValuesSupported: ['RS256', 'ES256', 'PS256'],
  
  // Session Management
  sessionStateRequired: true,
  checkSessionIframe: 'https://auth.asoos.cool/oidc/check_session',
  frontchannelLogoutSupported: true,
  frontchannelLogoutSessionSupported: true,
  backchannelLogoutSupported: true,
  backchannelLogoutSessionSupported: true
};

// SAML Identity Provider Configuration
const SAML_IDENTITY_PROVIDER = {
  entityId: 'https://auth.asoos.cool/saml/metadata',
  singleSignOnService: {
    url: 'https://auth.asoos.cool/saml/sso',
    binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
  },
  singleLogoutService: {
    url: 'https://auth.asoos.cool/saml/slo',  
    binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
  },
  
  // Certificate Management
  certificates: {
    signing: {
      algorithm: 'RSA',
      defaultKeySize: 2048,
      validityPeriodDays: 365,
      rotationIntervalDays: 180
    },
    encryption: {
      algorithm: 'RSA', 
      defaultKeySize: 2048,
      validityPeriodDays: 365,
      rotationIntervalDays: 180
    }
  },
  
  // Security Requirements
  security: {
    requireSignedRequests: true,
    requireSignedAssertions: true, 
    requireSignedResponses: true,
    requireEncryptedAssertions: true,
    requireEncryptedAttributes: true,
    
    // Default algorithms (overridden by tier)
    defaultSignatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    defaultDigestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    defaultEncryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
    defaultKeyEncryptionAlgorithm: 'http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p',
    
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#'
  },
  
  // Just-In-Time Provisioning
  jitProvisioning: {
    enabled: true,
    createMissingUsers: true,
    updateExistingUsers: true,
    
    // Attribute Mapping
    attributeMapping: {
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'sub',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'name',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'email',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'given_name',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'family_name',
      // ASOOS custom attributes
      'https://asoos.cool/claims/user_type': 'user_type',
      'https://asoos.cool/claims/tier': 'tier',
      'https://asoos.cool/claims/ce_uuid': 'ce_uuid',
      'https://asoos.cool/claims/pilot_id': 'pilot_id',
      'https://asoos.cool/claims/region': 'region'
    },
    
    // Default Privileges by Tier
    defaultPrivileges: {
      DIAMOND: ['system:admin', 'enterprise:manage', 'users:manage', 'config:write', 'audit:view'],
      EMERALD: ['team:manage', 'content:create', 'reports:view', 'config:read'],
      RUBY: ['content:edit', 'projects:manage', 'analytics:view'],
      SAPPHIRE: ['content:view', 'profile:edit', 'basic:access']
    }
  }
};

// Security Utilities adapted for ASOOS user types
class ASOOSSecurityUtils {
  /**
   * Get tier for a user type
   */
  static getTierForUserType(userType) {
    return ASOOS_USER_TYPE_TIER_MAPPING[userType] || 'SAPPHIRE';
  }

  /**
   * Get security profile for user type
   */
  static getSecurityProfile(userType) {
    const tier = this.getTierForUserType(userType);
    return TIER_SECURITY_PROFILES[tier];
  }

  /**
   * Generate client secret based on tier
   */
  static generateClientSecret(tier, length = 64) {
    const profile = TIER_SECURITY_PROFILES[tier];
    const minLength = profile.securityLevel === 'maximum' ? 128 : 
                     profile.securityLevel === 'high' ? 96 :
                     profile.securityLevel === 'enhanced' ? 64 : 32;
    
    const actualLength = Math.max(length, minLength);
    return crypto.randomBytes(actualLength).toString('hex');
  }

  /**
   * Validate redirect URI based on tier and user type
   */
  static validateRedirectUri(uri, userType, clientConfig) {
    const profile = this.getSecurityProfile(userType);
    const oauth2Config = profile.oauth2;

    if (!oauth2Config.strictRedirectUriValidation && profile.securityLevel === 'maximum') {
      return true; // Diamond tier has flexibility
    }

    // For other tiers, validate against registered URIs
    const registeredUris = clientConfig.redirectUris || [];
    return registeredUris.includes(uri);
  }

  /**
   * Check if IP is allowed for user type
   */
  static isIPAllowed(ip, userType, registeredIPs = []) {
    const profile = this.getSecurityProfile(userType);
    const ipConfig = profile.oauth2.ipRestrictions;
    
    if (!ipConfig.enabled) {
      return true;
    }

    // Check against registered IPs
    return registeredIPs.includes(ip) || registeredIPs.length < ipConfig.maxIpAddresses;
  }

  /**
   * Check if geographic location is allowed
   */
  static isGeoAllowed(country, userType) {
    const profile = this.getSecurityProfile(userType);
    const geoConfig = profile.oauth2.geoRestrictions;
    
    if (!geoConfig.enabled) {
      return true;
    }

    if (geoConfig.allowedCountries === '*') {
      return true;
    }

    return geoConfig.allowedCountries.includes(country);
  }

  /**
   * Check if MFA is required
   */
  static requiresMFA(userType, lastAuthTime) {
    const profile = this.getSecurityProfile(userType);
    const mfaConfig = profile.mfa;
    
    if (!mfaConfig.required) {
      return false;
    }

    const timeSinceLastAuth = Date.now() - lastAuthTime;
    return timeSinceLastAuth > (mfaConfig.reauthenticationInterval * 1000);
  }

  /**
   * Get SAML configuration for user type
   */
  static getSAMLConfigForUserType(userType) {
    const profile = this.getSecurityProfile(userType);
    const samlConfig = profile.saml;
    
    return {
      ...SAML_IDENTITY_PROVIDER,
      security: {
        ...SAML_IDENTITY_PROVIDER.security,
        signatureAlgorithm: samlConfig.signatureAlgorithm,
        encryptionAlgorithm: samlConfig.encryptionAlgorithm,
        maxAssertionValidityMinutes: samlConfig.assertionValidityMinutes,
        keySize: samlConfig.keySize
      }
    };
  }

  /**
   * Parse ASOOS user type code
   */
  static parseUserTypeCode(code) {
    const parts = code.split('-');
    return {
      track: parts[0],           // C, O, A, CM
      position: parts[1],        // L, M, S, E, F, I
      level: parts[2],           // E, T, G, D, C, I
      entityId: parts[3],        // Optional entity ID
      userId: parts[4],          // Optional user ID
      specializedRoles: parts[5] ? [parts[5]] : [], // VV, CP, PI
      paymentTier: parts[6],     // M, Q, A, EL
      baseType: `${parts[0]}-${parts[1]}-${parts[2]}`,
      tier: ASOOS_USER_TYPE_TIER_MAPPING[`${parts[0]}-${parts[1]}-${parts[2]}`] || 'SAPPHIRE'
    };
  }
}

// Credential Rotation Manager for ASOOS
class ASOOSCredentialManager {
  /**
   * Rotate client secret based on user type
   */
  static async rotateClientSecret(clientId, userType) {
    const profile = ASOOSSecurityUtils.getSecurityProfile(userType);
    const rotationInterval = profile.oauth2.clientSecretRotationDays;
    const newSecret = ASOOSSecurityUtils.generateClientSecret(profile.name.toUpperCase());
    
    return {
      clientId,
      userType,
      tier: ASOOSSecurityUtils.getTierForUserType(userType),
      newSecret,
      rotationDate: new Date(),
      deprecationDate: new Date(Date.now() + (rotationInterval * 24 * 60 * 60 * 1000)),
      securityLevel: profile.securityLevel
    };
  }

  /**
   * Rotate SAML certificate based on user type
   */
  static async rotateSAMLCertificate(entityId, userType, certificateType = 'signing') {
    const profile = ASOOSSecurityUtils.getSecurityProfile(userType);
    const certConfig = SAML_IDENTITY_PROVIDER.certificates[certificateType];
    const keySize = profile.saml.keySize;
    
    return {
      entityId,
      userType,
      tier: ASOOSSecurityUtils.getTierForUserType(userType),
      certificateType,
      keySize,
      rotationDate: new Date(),
      validUntil: new Date(Date.now() + (certConfig.validityPeriodDays * 24 * 60 * 60 * 1000)),
      algorithm: profile.saml.signatureAlgorithm
    };
  }
}

module.exports = {
  ASOOS_USER_TYPE_TIER_MAPPING,
  TIER_SECURITY_PROFILES,
  OAUTH2_AUTHORIZATION_SERVER,
  OIDC_PROVIDER_CONFIG,
  SAML_IDENTITY_PROVIDER,
  ASOOSSecurityUtils,
  ASOOSCredentialManager
};
