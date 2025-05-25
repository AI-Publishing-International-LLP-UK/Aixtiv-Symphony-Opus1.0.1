import { HumanBillingConfig } from './human-billing-config'
import { RoleFlightConfig } from './role-flight-config'
import { QuickBooksIntegration } from './accounting-integration'

export interface TimeTrackingConfig {
  weeklyHourLimit: number
  punchInRequirements: string[]
  authorizedOvertime: boolean
  breakTracking: boolean
}

export interface AuditConfig {
  retentionPeriod: number
  anonymizationPeriod: number
  requiredFields: string[]
  gdprCompliance: {
    dataFields: string[]
    processingBasis: string
    retentionRules: string[]
  }
}

export interface DocumentConfig {
  requiredDocuments: string[]
  signatureRequirements: string[]
  retentionPolicy: {
    duration: number
    securityLevel: string
    archiveMethod: string
  }
}

export const jobCoordinationConfig = {
  timeTracking: {
    weeklyHourLimit: 40,
    punchInRequirements: ['Geolocation verification', 'Biometric confirmation', 'Project code entry'],
    overtimeRules: {
      maxWeeklyOvertime: 10,
      approvalRequired: true,
      rateMultiplier: 1.5
    },
    breakPolicy: {
      mandatoryBreaks: [
        { duration: 30, type: 'Lunch' },
        { duration: 15, type: 'Rest', frequency: 'Every 4 hours' }
      ]
    }
  },

  documentManagement: {
    requiredDocuments: [
      'Employment contract',
      'NDA agreement',
      'Tax forms',
      'Benefits enrollment',
      'Emergency contacts'
    ],
    signatureRequirements: {
      method: 'Digital',
      validationSteps: ['Identity verification', 'Email confirmation', 'IP tracking'],
      retention: '7 years'
    },
    retentionPolicy: {
      duration: 7,
      securityLevel: 'Highly Confidential',
      archiveMethod: 'Encrypted Cloud Storage',
      anonymization: {
        trigger: '2 years',
        fields: ['name', 'address', 'phone', 'email', 'nationalId']
      }
    }
  },

  auditTrail: {
    retentionPeriod: 7, // years
    anonymizationPeriod: 2, // years
    requiredFields: ['timestamp', 'action', 'user', 'changes', 'location', 'device'],
    gdprCompliance: {
      dataFields: ['personalIdentifiers', 'contactInformation', 'workHistory', 'performanceMetrics'],
      processingBasis: 'Contract Performance',
      retentionRules: [
        'Full retention - 2 years',
        'Anonymized retention - 5 additional years',
        'Permanent deletion thereafter'
      ]
    }
  },

  billingIntegration: {
    platform: 'QuickBooks',
    configuration: {
      apiEndpoint: '/api/quickbooks/v1',
      syncFrequency: 'daily',
      categories: ['Regular hours', 'Overtime', 'Benefits', 'Expenses']
    },
    automation: {
      invoiceGeneration: '27th monthly',
      paymentProcessing: '27th monthly',
      reconciliation: 'End of month'
    },
    validation: {
      requireApproval: true,
      approvalChain: ['Project Manager', 'Department Head', 'Finance']
    }
  },

  termsAndConditions: {
    version: '1.0.0',
    lastUpdated: '2024-01-01',
    mandatoryAgreements: ['Employment Terms', 'Code of Conduct', 'Data Protection', 'Intellectual Property'],
    acknowledgement: {
      method: 'Digital Signature',
      frequency: 'Annual',
      tracking: {
        status: 'Active/Inactive',
        lastSigned: 'Date',
        nextRenewal: 'Date'
      }
    }
  },

  quickbooksIntegration: {
    apiConfig: QuickBooksIntegration,
    syncSettings: {
      frequency: 'Real-time',
      dataPoints: ['Hours worked', 'Overtime', 'Benefits', 'Deductions'],
      validationRules: ['Manager approval', 'Hour limits', 'Budget constraints']
    }
  },

  punchSystem: {
    requirements: {
      inPunch: ['Location verification', 'Time stamp', 'Project code'],
      outPunch: ['Work summary', 'Hours confirmation', 'Next day agenda']
    },
    validation: {
      geoFencing: true,
      deviceRestriction: true,
      biometricRequired: true
    },
    alerts: {
      missedPunch: 'Immediate',
      overtime: 'Real-time',
      irregularPattern: '24h review'
    }
  }
}
