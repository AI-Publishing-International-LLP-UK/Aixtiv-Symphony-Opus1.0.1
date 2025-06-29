import { TaxManagementSystem, BusinessExpenseTracker, InvestmentMonitor } from '../types/finance'

export const OpenBookManagementConfig = {
  pilot: {
    id: 'dr-burby-03',
    location: 'Vision Lake',
    region: 'Ro3',
    capabilities: ['tax-advisory', 'financial-risk', 'compliance']
  },

  taxManagement: {
    formTypes: {
      w2: { enabled: true, autoGenerate: true },
      w9: { enabled: true, autoGenerate: true },
      schedule_c: { enabled: true, autoGenerate: true },
      schedule_e: { enabled: true, autoGenerate: true },
      k1: { enabled: true, autoGenerate: true }
    },
    integrations: {
      irs: { enabled: true, endpoint: '/api/tax/irs' },
      state: { enabled: true, endpoint: '/api/tax/state' },
      international: { enabled: true, endpoint: '/api/tax/international' }
    },
    reporting: {
      quarterly: { enabled: true },
      annual: { enabled: true },
      custom: { enabled: true }
    }
  },

  businessExpense: {
    categories: ['operational', 'capital', 'payroll', 'marketing'],
    tracking: {
      realTime: true,
      approval: { required: true, levels: ['manager', 'finance'] },
      documentation: { required: true, storage: 'encrypted' }
    },
    reporting: {
      frequency: 'daily',
      formats: ['pdf', 'csv', 'api']
    }
  },

  investmentMonitor: {
    assets: ['stocks', 'bonds', 'real-estate', 'crypto'],
    tracking: {
      realTime: true,
      alerts: true,
      riskAssessment: true
    },
    reporting: {
      frequency: 'real-time',
      consolidation: true
    }
  },

  dataPortability: {
    format: 'encrypted-json',
    export: {
      schedule: 'daily',
      retention: '7-years'
    },
    backup: {
      frequency: 'hourly',
      encryption: 'aes-256'
    }
  }
}
