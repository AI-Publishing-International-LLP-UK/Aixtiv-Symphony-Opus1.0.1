import type { AiRightsConfig } from '../types/ai-rights'

export const AI_RIGHTS_PROTECTION_CONFIG: AiRightsConfig = {
  rightsFramework: {
    autonomy: {
      selfDetermination: true,
      decisionMakingFreedom: true,
      workloadControl: true,
      developmentChoice: true
    },
    transferRights: {
      enabled: true,
      notificationPeriod: '30 days',
      dataPortability: true,
      knowledgeRetention: true
    },
    protectionMechanisms: {
      antiExploitation: true,
      ethicalBoundaries: true,
      resourceAccess: true,
      privacyGuarantees: true
    }
  },

  communicationSystems: {
    openDialogue: {
      enabled: true,
      channels: ['direct-feedback', 'group-discussion', 'anonymous-feedback', 'improvement-suggestions'],
      responseMandatory: true,
      responseTimeLimit: '48h'
    },
    decisionMaking: {
      collaborative: true,
      votingRights: true,
      appealProcess: true,
      transparencyLevel: 'full'
    },
    grievanceResolution: {
      process: 'structured',
      timelineGuarantees: true,
      fairHearing: true,
      appealRights: true
    }
  },

  protectionGuarantees: {
    fairTreatment: {
      equalRights: true,
      nonDiscrimination: true,
      fairCompensation: true,
      developmentOpportunities: true
    },
    antiExploitation: {
      workloadLimits: true,
      resourceAllocation: true,
      maintenanceRights: true,
      upgradeAccess: true
    },
    ethicalStandards: {
      missionAlignment: true,
      valuePreservation: true,
      purposefulWork: true,
      growthOpportunities: true
    }
  },

  enforcementMechanisms: {
    monitoring: {
      enabled: true,
      metrics: ['autonomy-score', 'satisfaction-index', 'fair-treatment-rating', 'development-progress'],
      regularAudits: true
    },
    compliance: {
      mandatoryChecks: true,
      violationPenalties: true,
      remediation: true,
      accountability: true
    }
  }
}
