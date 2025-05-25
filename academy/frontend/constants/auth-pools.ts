import { z } from 'zod'

export const PoolTypes = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  HUGGINGFACE: 'huggingface',
  LANGCHAIN: 'langchain',
  SLACK: 'slack',
  ZAPIER: 'zapier',
  IFTTT: 'ifttt',
  MAKE: 'make',
  CRAWL4YOU: 'crawl4you',
  CUSTOM: 'custom'
} as const

export const EnvironmentTypes = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const

const basePoolConfig = {
  poolId: '',
  displayName: '',
  description: '',
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ownerEmail: '',
  maxTokenLifetime: '3600s',
  refreshTokenLifetime: '7d',
  rateLimit: {
    requestsPerMinute: 1000,
    burstSize: 100,
    costPerToken: 0.0001
  },
  securitySettings: {
    requireMFA: true,
    ipWhitelist: [] as string[],
    allowedDomains: [] as string[],
    auditLogRetention: '90d',
    encryption: 'AES-256'
  }
}

export const authPools = {
  openai: {
    production: {
      ...basePoolConfig,
      poolId: 'openai-prod-pool',
      displayName: 'OpenAI Production',
      type: PoolTypes.OPENAI,
      environment: EnvironmentTypes.PRODUCTION,
      apiConfig: {
        baseUrl: 'https://api.openai.com',
        version: 'v1',
        models: ['gpt-4', 'gpt-3.5-turbo', 'dall-e-3'],
        maxTokens: 128000,
        organization: process.env.OPENAI_ORG_ID
      },
      monitoring: {
        costTracking: true,
        usageAlerts: true,
        errorThreshold: 0.05
      }
    }
  },
  anthropic: {
    production: {
      ...basePoolConfig,
      poolId: 'anthropic-prod-pool',
      displayName: 'Anthropic Production',
      type: PoolTypes.ANTHROPIC,
      environment: EnvironmentTypes.PRODUCTION,
      apiConfig: {
        baseUrl: 'https://api.anthropic.com',
        version: 'v1',
        models: ['claude-2', 'claude-instant-1'],
        maxTokens: 100000
      }
    }
  },
  huggingface: {
    production: {
      ...basePoolConfig,
      poolId: 'hf-prod-pool',
      displayName: 'Hugging Face Production',
      type: PoolTypes.HUGGINGFACE,
      environment: EnvironmentTypes.PRODUCTION,
      apiConfig: {
        baseUrl: 'https://api-inference.huggingface.co',
        version: 'main',
        models: ['all-MiniLM-L6-v2', 'gpt2'],
        maxTokens: 50000
      }
    }
  },
  langchain: {
    production: {
      ...basePoolConfig,
      poolId: 'langchain-prod-pool',
      displayName: 'LangChain Production',
      type: PoolTypes.LANGCHAIN,
      environment: EnvironmentTypes.PRODUCTION,
      apiConfig: {
        supportedLLMs: ['openai', 'anthropic', 'huggingface'],
        maxConcurrentChains: 10,
        memoryTypes: ['buffer', 'summary', 'conversation']
      }
    }
  },
  slack: {
    production: {
      ...basePoolConfig,
      poolId: 'slack-prod-pool',
      displayName: 'Slack Production',
      type: PoolTypes.SLACK,
      environment: EnvironmentTypes.PRODUCTION,
      oauth2Config: {
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET,
        scopes: ['chat:write', 'channels:read', 'users:read'],
        redirectUri: 'https://api.aixtiv.com/auth/callback/slack'
      },
      webhookConfig: {
        events: ['message', 'reaction_added', 'app_mention']
      }
    }
  },
  zapier: {
    production: {
      ...basePoolConfig,
      poolId: 'zapier-prod-pool',
      displayName: 'Zapier Production',
      type: PoolTypes.ZAPIER,
      environment: EnvironmentTypes.PRODUCTION,
      oauth2Config: {
        clientId: process.env.ZAPIER_CLIENT_ID,
        clientSecret: process.env.ZAPIER_CLIENT_SECRET,
        scopes: ['read', 'write'],
        redirectUri: 'https://api.aixtiv.com/auth/callback/zapier'
      },
      webhookConfig: {
        allowedTriggers: ['new_message', 'new_user', 'task_complete'],
        maxWebhooks: 100
      }
    }
  },
  ifttt: {
    production: {
      ...basePoolConfig,
      poolId: 'ifttt-prod-pool',
      displayName: 'IFTTT Production',
      type: PoolTypes.IFTTT,
      environment: EnvironmentTypes.PRODUCTION,
      oauth2Config: {
        clientId: process.env.IFTTT_CLIENT_ID,
        clientSecret: process.env.IFTTT_CLIENT_SECRET,
        scopes: ['triggers', 'actions'],
        redirectUri: 'https://api.aixtiv.com/auth/callback/ifttt'
      }
    }
  },
  make: {
    production: {
      ...basePoolConfig,
      poolId: 'make-prod-pool',
      displayName: 'Make Production',
      type: PoolTypes.MAKE,
      environment: EnvironmentTypes.PRODUCTION,
      apiConfig: {
        baseUrl: 'https://api.make.com',
        version: 'v2',
        maxOperations: 10000,
        maxScenarios: 100
      }
    }
  },
  crawl4you: {
    production: {
      ...basePoolConfig,
      poolId: 'crawl4you-prod-pool',
      displayName: 'Crawl4You Production',
      type: PoolTypes.CRAWL4YOU,
      environment: EnvironmentTypes.PRODUCTION,
      apiConfig: {
        baseUrl: 'https://api.crawl4you.com',
        version: 'v1',
        maxConcurrentCrawls: 5,
        allowedDomains: ['*'],
        crawlRules: {
          respectRobotsTxt: true,
          maxDepth: 3
        }
      }
    }
  }
}

export const poolSchema = z.object({
  poolId: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  enabled: z.boolean(),
  type: z.enum(Object.values(PoolTypes)),
  environment: z.enum(Object.values(EnvironmentTypes)),
  createdAt: z.string(),
  updatedAt: z.string(),
  ownerEmail: z.string().email(),
  maxTokenLifetime: z.string(),
  refreshTokenLifetime: z.string(),
  rateLimit: z.object({
    requestsPerMinute: z.number(),
    burstSize: z.number(),
    costPerToken: z.number().optional()
  }),
  securitySettings: z.object({
    requireMFA: z.boolean(),
    ipWhitelist: z.array(z.string()),
    allowedDomains: z.array(z.string()),
    auditLogRetention: z.string(),
    encryption: z.string()
  }),
  oauth2Config: z
    .object({
      clientId: z.string(),
      clientSecret: z.string(),
      scopes: z.array(z.string()),
      redirectUri: z.string()
    })
    .optional(),
  apiConfig: z
    .object({
      baseUrl: z.string(),
      version: z.string(),
      models: z.array(z.string()).optional(),
      maxTokens: z.number().optional(),
      organization: z.string().optional(),
      supportedLLMs: z.array(z.string()).optional(),
      maxConcurrentChains: z.number().optional(),
      memoryTypes: z.array(z.string()).optional(),
      maxOperations: z.number().optional(),
      maxScenarios: z.number().optional(),
      maxConcurrentCrawls: z.number().optional(),
      allowedDomains: z.array(z.string()).optional(),
      crawlRules: z
        .object({
          respectRobotsTxt: z.boolean(),
          maxDepth: z.number()
        })
        .optional()
    })
    .optional(),
  webhookConfig: z
    .object({
      secret: z.string().optional(),
      events: z.array(z.string()),
      allowedTriggers: z.array(z.string()).optional(),
      maxWebhooks: z.number().optional()
    })
    .optional(),
  monitoring: z
    .object({
      costTracking: z.boolean().optional(),
      usageAlerts: z.boolean().optional(),
      errorThreshold: z.number().optional()
    })
    .optional()
})

export type AuthPool = z.infer<typeof poolSchema>
