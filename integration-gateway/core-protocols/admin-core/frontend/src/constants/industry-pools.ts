import type { IntegrationPool } from '../types/integration'
import { OAuthConfig, SecurityConfig } from '../types/integration'

/**
 * Industry-specific integration pools configuration
 */
export const industryPools: Record<string, IntegrationPool> = {
  publishing: {
    name: 'Publishing Integrations',
    description: 'Integrations for book publishing and distribution',
    integrations: {
      amazonKdp: {
        name: 'Amazon KDP',
        apiEndpoint: 'https://kdp.amazon.com/api/v2',
        securityConfig: {
          accessLevel: 'publisher',
          rateLimit: 1000,
          ipRestrictions: true,
          tokenExpiry: '24h'
        },
        oauth2: {
          authorizationUrl: 'https://kdp.amazon.com/oauth2/authorize',
          tokenUrl: 'https://kdp.amazon.com/oauth2/token',
          scopes: ['publish', 'read', 'analytics']
        }
      },
      barnesAndNoble: {
        name: 'Barnes & Noble Press',
        apiEndpoint: 'https://press.barnesandnoble.com/api/v1',
        securityConfig: {
          accessLevel: 'publisher',
          rateLimit: 500,
          ipRestrictions: true,
          tokenExpiry: '12h'
        },
        oauth2: {
          authorizationUrl: 'https://press.barnesandnoble.com/oauth/authorize',
          tokenUrl: 'https://press.barnesandnoble.com/oauth/token',
          scopes: ['content.publish', 'content.read']
        }
      },
      ingramSpark: {
        name: 'IngramSpark',
        apiEndpoint: 'https://api.ingramspark.com/v1',
        securityConfig: {
          accessLevel: 'publisher',
          rateLimit: 300,
          ipRestrictions: true,
          tokenExpiry: '24h'
        },
        oauth2: {
          authorizationUrl: 'https://api.ingramspark.com/oauth2/auth',
          tokenUrl: 'https://api.ingramspark.com/oauth2/token',
          scopes: ['distribution', 'inventory', 'reports']
        }
      },
      draft2Digital: {
        name: 'Draft2Digital',
        apiEndpoint: 'https://api.draft2digital.com/v1',
        securityConfig: {
          accessLevel: 'publisher',
          rateLimit: 400,
          ipRestrictions: true,
          tokenExpiry: '24h'
        },
        oauth2: {
          authorizationUrl: 'https://api.draft2digital.com/oauth/authorize',
          tokenUrl: 'https://api.draft2digital.com/oauth/token',
          scopes: ['publish', 'distribute', 'sales']
        }
      }
    }
  },

  businessSystems: {
    name: 'General Business Integrations',
    description: 'Common business system integrations',
    integrations: {
      crm: {
        salesforce: {
          name: 'Salesforce',
          apiEndpoint: 'https://api.salesforce.com/v52.0',
          securityConfig: {
            accessLevel: 'enterprise',
            rateLimit: 2000,
            ipRestrictions: true,
            tokenExpiry: '24h'
          },
          oauth2: {
            authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
            tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
            scopes: ['api', 'refresh_token', 'offline_access']
          }
        },
        hubspot: {
          name: 'HubSpot',
          apiEndpoint: 'https://api.hubapi.com/v3',
          securityConfig: {
            accessLevel: 'business',
            rateLimit: 1000,
            ipRestrictions: true,
            tokenExpiry: '24h'
          },
          oauth2: {
            authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
            tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
            scopes: ['contacts', 'timeline', 'content']
          }
        }
      },
      accounting: {
        quickbooks: {
          name: 'QuickBooks',
          apiEndpoint: 'https://quickbooks.api.intuit.com/v3',
          securityConfig: {
            accessLevel: 'financial',
            rateLimit: 500,
            ipRestrictions: true,
            tokenExpiry: '12h'
          },
          oauth2: {
            authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
            tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
            scopes: ['accounting', 'payments']
          }
        },
        xero: {
          name: 'Xero',
          apiEndpoint: 'https://api.xero.com/api.xro/2.0',
          securityConfig: {
            accessLevel: 'financial',
            rateLimit: 500,
            ipRestrictions: true,
            tokenExpiry: '12h'
          },
          oauth2: {
            authorizationUrl: 'https://login.xero.com/identity/connect/authorize',
            tokenUrl: 'https://identity.xero.com/connect/token',
            scopes: ['accounting.transactions', 'accounting.settings']
          }
        }
      }
    }
  },

  construction: {
    name: 'Construction & Architecture Integrations',
    description: 'Construction industry specific integrations',
    integrations: {
      design: {
        autocad: {
          name: 'AutoCAD',
          apiEndpoint: 'https://developer.api.autodesk.com/autocad/v1',
          securityConfig: {
            accessLevel: 'professional',
            rateLimit: 1000,
            ipRestrictions: true,
            tokenExpiry: '24h'
          },
          oauth2: {
            authorizationUrl: 'https://developer.api.autodesk.com/authentication/v1/authorize',
            tokenUrl: 'https://developer.api.autodesk.com/authentication/v1/token',
            scopes: ['data:read', 'data:write', 'data:create']
          }
        },
        revit: {
          name: 'Revit',
          apiEndpoint: 'https://developer.api.autodesk.com/revit/v1',
          securityConfig: {
            accessLevel: 'professional',
            rateLimit: 1000,
            ipRestrictions: true,
            tokenExpiry: '24h'
          },
          oauth2: {
            authorizationUrl: 'https://developer.api.autodesk.com/authentication/v1/authorize',
            tokenUrl: 'https://developer.api.autodesk.com/authentication/v1/token',
            scopes: ['data:read', 'data:write', 'data:create']
          }
        }
      },
      projectManagement: {
        procore: {
          name: 'Procore',
          apiEndpoint: 'https://api.procore.com/rest/v1.0',
          securityConfig: {
            accessLevel: 'project',
            rateLimit: 600,
            ipRestrictions: true,
            tokenExpiry: '24h'
          },
          oauth2: {
            authorizationUrl: 'https://login.procore.com/oauth/authorize',
            tokenUrl: 'https://login.procore.com/oauth/token',
            scopes: ['projects.read', 'projects.write']
          }
        },
        bim360: {
          name: 'BIM 360',
          apiEndpoint: 'https://developer.api.autodesk.com/bim360/v1',
          securityConfig: {
            accessLevel: 'project',
            rateLimit: 800,
            ipRestrictions: true,
            tokenExpiry: '24h'
          },
          oauth2: {
            authorizationUrl: 'https://developer.api.autodesk.com/authentication/v1/authorize',
            tokenUrl: 'https://developer.api.autodesk.com/authentication/v1/token',
            scopes: ['data:read', 'data:write', 'account:read']
          }
        }
      },
      supplyChain: {
        homedepot: {
          name: 'Home Depot Pro',
          apiEndpoint: 'https://api.homedepot.com/v1',
          securityConfig: {
            accessLevel: 'supplier',
            rateLimit: 500,
            ipRestrictions: true,
            tokenExpiry: '12h'
          },
          oauth2: {
            authorizationUrl: 'https://auth.homedepot.com/oauth2/authorize',
            tokenUrl: 'https://auth.homedepot.com/oauth2/token',
            scopes: ['inventory', 'orders', 'pricing']
          }
        },
        lowes: {
          name: 'Lowes Pro',
          apiEndpoint: 'https://api.lowes.com/v1',
          securityConfig: {
            accessLevel: 'supplier',
            rateLimit: 500,
            ipRestrictions: true,
            tokenExpiry: '12h'
          },
          oauth2: {
            authorizationUrl: 'https://auth.lowes.com/oauth/authorize',
            tokenUrl: 'https://auth.lowes.com/oauth/token',
            scopes: ['inventory', 'orders', 'pricing']
          }
        }
      },
      procurement: {
        stateEprocurement: {
          name: 'State eProcurement Systems',
          apiEndpoint: 'https://api.eprocure.gov/v1',
          securityConfig: {
            accessLevel: 'government',
            rateLimit: 300,
            ipRestrictions: true,
            tokenExpiry: '12h'
          },
          oauth2: {
            authorizationUrl: 'https://auth.eprocure.gov/oauth/authorize',
            tokenUrl: 'https://auth.eprocure.gov/oauth/token',
            scopes: ['bids', 'contracts', 'vendors']
          }
        }
      }
    }
  },

  enterprise: {
    name: 'Enterprise Integrations',
    description: 'Enterprise-level system integrations',
    integrations: {
      identity: {
        name: 'Enterprise Identity Management',
        apiEndpoint: 'https://api.enterprise.local/identity/v1',
        securityConfig: {
          accessLevel: 'enterprise',
          rateLimit: 5000,
          ipRestrictions: true,
          tokenExpiry: '12h',
          mfaRequired: true
        },
        oauth2: {
          authorizationUrl: 'https://auth.enterprise.local/oauth/authorize',
          tokenUrl: 'https://auth.enterprise.local/oauth/token',
          scopes: ['user.read', 'user.write', 'admin']
        }
      },
      security: {
        name: 'Enterprise Security Controls',
        apiEndpoint: 'https://api.enterprise.local/security/v1',
        securityConfig: {
          accessLevel: 'enterprise',
          rateLimit: 1000,
          ipRestrictions: true,
          tokenExpiry: '6h',
          mfaRequired: true
        },
        oauth2: {
          authorizationUrl: 'https://auth.enterprise.local/oauth/authorize',
          tokenUrl: 'https://auth.enterprise.local/oauth/token',
          scopes: ['security.read', 'security.write', 'audit']
        }
      }
    }
  }
}
