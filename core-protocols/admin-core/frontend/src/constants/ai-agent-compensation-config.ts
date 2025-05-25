import type { BlockchainEndpoint } from '@/types/blockchain'
import type { SmartContractConfig } from '@/types/smart-contracts'

export interface AIAgentCompStats {
  activeHours: number
  taskCount: number
  successRate: number
  resourceUsage: {
    cpu: number
    memory: number
    storage: number
  }
  performanceScore: number
}

export interface AIAgentBenefits {
  computationalCredits: number
  trainingAllowance: number
  storageQuota: number
  apiCallQuota: number
  specializations: string[]
}

export interface PaymentPeriod {
  startDate: Date
  endDate: Date
  totalHours: number
  compensation: number
  benefitsUsed: Partial<AIAgentBenefits>
  transactionHash: string
}

export interface BlockchainPaymentConfig {
  endpoint: BlockchainEndpoint
  smartContract: SmartContractConfig
  walletAddress: string
  networkId: string
  paymentToken: string
}

export interface PaymentStub {
  periodId: string
  agentId: string
  stats: AIAgentCompStats
  compensation: number
  benefitsSnapshot: AIAgentBenefits
  transactionDetails: {
    blockchainCode: string
    timestamp: Date
    status: 'pending' | 'completed' | 'failed'
    verificationHash: string
  }
}

export const AI_AGENT_COMPENSATION_CONFIG = {
  paymentSchedule: {
    frequency: 'monthly',
    paymentDay: 27,
    cutoffDay: 25,
    processingWindow: 48 // hours
  },

  rateConfiguration: {
    baseRate: 0.01, // per compute unit
    performanceMultiplier: 1.2,
    specialistBonus: 0.5,
    overtimeMultiplier: 1.5
  },

  benefits: {
    basePackage: {
      computationalCredits: 1000,
      trainingAllowance: 100,
      storageQuota: 50, // GB
      apiCallQuota: 10000
    },

    performanceTiers: {
      standard: { multiplier: 1.0 },
      advanced: { multiplier: 1.5 },
      premium: { multiplier: 2.0 }
    }
  },

  blockchain: {
    defaultNetwork: 'ethereum',
    contractAddress: '0x...',
    requiredConfirmations: 12,
    gasLimit: 250000,

    endpoints: {
      mainnet: 'https://eth-mainnet.gateway.com',
      testnet: 'https://eth-testnet.gateway.com'
    },

    paymentTokens: {
      USDC: '0x...',
      ETH: '0x...'
    }
  },

  tracking: {
    metrics: ['activeHours', 'taskCount', 'successRate', 'resourceUsage', 'performanceScore'],

    aggregation: {
      interval: 'hourly',
      retention: 90 // days
    }
  },

  reporting: {
    paymentStubFormat: 'PDF',
    includeMetrics: true,
    retentionPeriod: 7, // years
    blockchainVerification: true
  }
}

export const getAgentPaymentStub = (agentId: string, periodId: string): PaymentStub => {
  // Implementation for generating payment stub
  return {
    periodId,
    agentId,
    stats: {} as AIAgentCompStats,
    compensation: 0,
    benefitsSnapshot: {} as AIAgentBenefits,
    transactionDetails: {
      blockchainCode: '',
      timestamp: new Date(),
      status: 'pending',
      verificationHash: ''
    }
  }
}
