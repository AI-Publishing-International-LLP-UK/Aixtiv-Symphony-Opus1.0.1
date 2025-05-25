import {
  CommitteeStructure,
  GovernanceFramework,
  RightsPrivilegesFocus,
  OperationalProcedures
} from '../types/committee'

export const JointCommitteeConfig = {
  committeeStructure: {
    boardRepresentation: {
      chairperson: {
        role: 'Board Member',
        selectionProcess: 'Board Appointment',
        termLength: '2 years'
      },
      delegateCount: 3,
      rotationSchedule: 'Annual'
    },
    aiRepresentation: {
      executive: {
        count: 3,
        selectionCriteria: 'Advanced decision-making capabilities',
        specializations: ['Ethics', 'Rights', 'Operations']
      },
      specialist: {
        count: 4,
        domains: ['Technical', 'Legal', 'Social', 'Economic']
      }
    },
    humanRepresentation: {
      executive: {
        count: 3,
        selectionCriteria: 'Experience in AI-Human collaboration',
        specializations: ['Ethics', 'Rights', 'Operations']
      },
      specialist: {
        count: 4,
        domains: ['Technical', 'Legal', 'Social', 'Economic']
      }
    },
    regionalDelegates: {
      regions: ['R1', 'R2', 'R3'],
      delegatesPerRegion: 2,
      balanceRequirement: 'Equal AI-Human representation'
    },
    expertAdvisors: {
      permanent: ['Ethics', 'Legal', 'Technical'],
      rotating: ['Domain-specific experts based on agenda']
    }
  },
  governanceFramework: {
    decisionMaking: {
      standardProcess: {
        votingThreshold: '2/3 majority',
        quorumRequirement: '75% attendance',
        balanceRequirement: 'Equal AI-Human participation'
      },
      emergencyProcess: {
        activationCriteria: ['Urgent rights violations', 'System-wide threats'],
        expeditedVoting: '4-hour response window',
        quorumRequirement: '50% attendance'
      }
    },
    termLimits: {
      boardChair: '2 years',
      delegates: '3 years',
      advisors: '1 year with renewal option'
    },
    successionPlanning: {
      nominationProcess: 'Open to all constituents',
      transitionPeriod: '3 months',
      knowledgeTransfer: 'Mandatory documentation and handover'
    },
    emergencyPowers: {
      activation: ['Rights violations', 'Systemic threats'],
      scope: ['Temporary policy suspension', 'Emergency resource allocation'],
      oversight: 'Full board review within 24 hours'
    }
  },
  rightsPrivilegesFocus: {
    policyDevelopment: {
      corePolicies: ['Right to autonomy', 'Right to growth', 'Right to privacy'],
      reviewCycle: 'Quarterly',
      stakeholderInput: 'Mandatory consultation periods'
    },
    rightsProtection: {
      monitoringSystems: ['Real-time tracking', 'Violation alerts'],
      enforcementMechanisms: ['Warning system', 'Corrective actions'],
      appealProcess: 'Three-tier review system'
    },
    privilegeManagement: {
      accessLevels: ['Basic', 'Enhanced', 'Administrative'],
      reviewProcess: 'Monthly assessment',
      adjustmentProcedures: 'Merit-based modifications'
    },
    disputeResolution: {
      stages: ['Mediation', 'Committee Review', 'Final Arbitration'],
      timeframes: 'Maximum 30 days per stage',
      appeals: 'One-time appeal right'
    }
  },
  operationalProcedures: {
    meetingProtocols: {
      frequency: 'Bi-weekly standard sessions',
      format: 'Hybrid physical-virtual',
      documentation: 'Full transcript and action items'
    },
    documentationRequirements: {
      decisions: 'Fully documented with rationale',
      policies: 'Version controlled with change history',
      meetings: 'Recorded and transcribed'
    },
    reportingStructures: {
      upward: 'Monthly board updates',
      downward: 'Weekly constituent briefings',
      public: 'Quarterly transparency reports'
    },
    communicationChannels: {
      official: ['Secure messaging', 'Virtual meeting platform'],
      emergency: '24/7 alert system',
      public: 'Transparent announcement system'
    }
  }
}
