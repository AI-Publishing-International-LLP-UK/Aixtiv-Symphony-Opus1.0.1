import { z } from 'zod'

export const BillingCycleSchema = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL'])
export type BillingCycle = z.infer<typeof BillingCycleSchema>

export const ServiceTypeSchema = z.enum(['COACHING', 'CONSULTING', 'SPEAKING', 'TRAINING', 'ADVISORY'])
export type ServiceType = z.infer<typeof ServiceTypeSchema>

export const PaymentStatusSchema = z.enum(['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED'])
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>

export const billingConfig = {
  paymentSchedule: {
    monthlyPaymentDay: 27,
    processingWindow: 3, // days before payment date
    validationDeadline: 5, // days before payment date
    reminderDays: [7, 3, 1] // days before validation deadline
  },

  tracking: {
    minimumBillableIncrement: 15, // minutes
    maxDailyHours: 12,
    requireApproval: true,
    approvalDeadline: {
      days: 5,
      notificationFrequency: 24 // hours
    }
  },

  validation: {
    requirements: ['TIME_ENTRY', 'SERVICE_CATEGORY', 'CLIENT_ASSIGNMENT', 'MANAGER_APPROVAL', 'SYSTEM_TIMESTAMP'],
    autoValidation: {
      enabled: true,
      thresholds: {
        maxHoursPerDay: 12,
        maxDaysPerMonth: 22,
        minHoursPerEntry: 0.25
      }
    }
  },

  hrIntegration: {
    tables: {
      serviceRecords: 'human_service_records',
      timeTracking: 'human_time_tracking',
      approvals: 'human_service_approvals',
      payments: 'human_service_payments'
    },
    required: {
      employeeId: true,
      departmentCode: true,
      serviceType: true,
      clientId: true
    }
  },

  billing: {
    accumulation: {
      groupBy: ['SERVICE_TYPE', 'CLIENT', 'PROJECT'],
      calculations: ['HOURS', 'RATE', 'ADJUSTMENTS', 'TAXES'],
      summaryLevels: ['DAILY', 'WEEKLY', 'MONTHLY']
    },
    approvals: {
      levels: ['MANAGER', 'FINANCE', 'HR'],
      autoApprovalThreshold: 0, // all entries require approval
      escalationThreshold: 48 // hours before escalation
    }
  },

  notifications: {
    channels: ['EMAIL', 'SYSTEM', 'MOBILE'],
    triggers: {
      missingTimeEntry: true,
      pendingApproval: true,
      approvalComplete: true,
      paymentProcessing: true,
      paymentComplete: true
    },
    escalation: {
      enabled: true,
      thresholds: [24, 48, 72] // hours
    }
  }
} as const

export const timeTrackingRules = {
  validateServiceEntry: (entry: ServiceEntry): ValidationResult => {
    const results: ValidationError[] = []

    if (!entry.timestamp) {
      results.push({
        code: 'MISSING_TIMESTAMP',
        message: 'Service entry must include system timestamp'
      })
    }

    if (!entry.serviceType) {
      results.push({
        code: 'MISSING_SERVICE_TYPE',
        message: 'Service type must be specified'
      })
    }

    // Additional validation logic

    return {
      isValid: results.length === 0,
      errors: results
    }
  },

  canProcessPayment: (records: ServiceRecord[]): boolean => {
    return records.every(record => record.isValidated && record.isApproved && record.hoursTracked > 0)
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  code: string
  message: string
}

export interface ServiceEntry {
  timestamp: Date
  serviceType: ServiceType
  hours: number
  employeeId: string
  clientId: string
  projectId?: string
  notes?: string
}

export interface ServiceRecord {
  id: string
  entry: ServiceEntry
  isValidated: boolean
  isApproved: boolean
  hoursTracked: number
  approvalChain: string[]
  paymentStatus: PaymentStatus
}
