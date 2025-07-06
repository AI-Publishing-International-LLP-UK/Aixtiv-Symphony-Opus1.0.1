import { BlockchainConfig } from '../types/blockchain'

export const costAccountingConfig = {
  hrCosts: {
    direct: {
      categories: ['Salaries', 'Benefits', 'Training', 'Recruitment'],
      trackingRules: {
        billingCycle: 'monthly',
        paymentDate: 27,
        validationRules: ['timesheet_approved', 'manager_verified']
      },
      recuperation: {
        methods: ['client_billing', 'project_allocation', 'overhead_distribution']
      }
    },
    indirect: {
      categories: ['Administration', 'Facilities', 'Insurance', 'Support'],
      allocationMethods: ['headcount', 'time_spent', 'usage_based']
    }
  },

  agentResources: {
    direct: {
      categories: ['Compute_Time', 'API_Costs', 'Storage', 'Bandwidth'],
      trackingMetrics: ['usage_hours', 'request_count', 'data_volume'],
      costBasis: 'usage_based'
    },
    indirect: {
      categories: ['Maintenance', 'Updates', 'Backup', 'Security'],
      allocationBasis: 'agent_count'
    }
  },

  physicalResources: {
    categories: ['Hardware', 'Office_Equipment', 'Infrastructure'],
    depreciation: {
      method: 'straight_line',
      tracking: 'asset_based'
    },
    inventory: {
      trackingMethod: 'rfid',
      auditFrequency: 'quarterly'
    }
  },

  digitalResources: {
    categories: ['Software_Licenses', 'Digital_Assets', 'Intellectual_Property'],
    amortization: {
      method: 'usage_based',
      tracking: 'access_logs'
    },
    valuation: {
      method: 'fair_market',
      updateFrequency: 'semi_annual'
    }
  },

  sgaAutomation: {
    categories: ['Marketing', 'Sales', 'General_Admin'],
    approvalWorkflow: ['department_head', 'finance', 'executive'],
    automatedRules: {
      recurring: ['rent', 'utilities', 'subscriptions'],
      threshold: {
        low: 1000,
        medium: 10000,
        high: 50000
      }
    }
  },

  ledgerSystem: {
    structure: 'double_entry',
    lockPeriod: 'monthly',
    modificationRules: {
      requires: ['executive_approval', 'audit_log'],
      blockchain: {
        enabled: true,
        contract: 'LedgerLock_v1'
      }
    }
  },

  historicalData: {
    reconstructionPeriods: ['2023', '2024'],
    sources: ['bank_statements', 'invoices', 'contracts'],
    validation: ['audit_trail', 'document_verification'],
    blockchain: {
      storageContract: 'HistoricalRecord_v1',
      verificationMethod: 'merkle_proof'
    }
  }
}
