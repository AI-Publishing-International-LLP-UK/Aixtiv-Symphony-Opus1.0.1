export const CentralReportingConfig = {
  security: {
    dataTiers: {
      tier1: {
        name: 'Highly Sensitive',
        encryption: 'AES-256-GCM',
        containerization: 'isolated',
        accessLevel: 'restricted'
      },
      tier2: {
        name: 'Sensitive',
        encryption: 'AES-256-CBC',
        containerization: 'shared-isolated',
        accessLevel: 'limited'
      },
      tier3: {
        name: 'Internal',
        encryption: 'AES-256-CBC',
        containerization: 'shared',
        accessLevel: 'internal'
      }
    },
    encryption: {
      algorithm: 'AES-256-GCM',
      keyRotation: '7d',
      saltRounds: 10
    },
    containerization: {
      type: 'kubernetes',
      isolation: 'strict',
      networkPolicy: 'restricted'
    },
    accessControl: {
      authentication: 'multi-factor',
      authorization: 'role-based',
      sessionTimeout: '1h'
    }
  },

  llmIntegration: {
    supported: ['gpt-4', 'claude-2', 'palm-2', 'llama-2', 'anthropic-claude'],
    settings: {
      apiTimeout: '30s',
      rateLimiting: 'enabled',
      loadBalancing: 'enabled',
      fallback: 'enabled'
    },
    modelSelection: {
      defaultModel: 'gpt-4',
      autoSwitch: true,
      performanceThreshold: 0.95
    },
    monitoring: {
      metrics: ['latency', 'accuracy', 'cost'],
      alerts: 'enabled',
      reporting: 'real-time'
    }
  },

  viewerCustomization: {
    preferences: {
      saveEnabled: true,
      maxSavedViews: 10,
      sharing: 'restricted'
    },
    templates: {
      types: ['executive', 'detailed', 'summary'],
      customization: 'enabled',
      versioning: true
    },
    dashboards: {
      layouts: ['grid', 'flexible', 'fixed'],
      widgets: 'configurable',
      refreshRate: 'user-defined'
    },
    export: {
      formats: ['pdf', 'xlsx', 'json', 'csv'],
      scheduling: 'enabled',
      watermarking: true
    }
  },

  dataProtection: {
    antiBleed: {
      detection: 'real-time',
      prevention: 'proactive',
      isolation: 'immediate'
    },
    isolation: {
      method: 'physical-separation',
      backups: 'encrypted',
      recovery: 'automated'
    },
    audit: {
      level: 'comprehensive',
      retention: '7y',
      realTime: true
    },
    monitoring: {
      type: 'continuous',
      alerts: 'immediate',
      response: 'automated'
    }
  }
} as const

export type CentralReportingConfig = typeof CentralReportingConfig
