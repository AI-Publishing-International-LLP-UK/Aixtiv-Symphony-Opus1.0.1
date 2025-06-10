import type { DashboardConfig, SecurityConfig } from '../types/dashboard'
import { FeatureFlags } from '../types/dashboard'

const baseSecurityConfig: SecurityConfig = {
  rolePermissions: ['VIEW', 'EDIT', 'DELETE', 'MANAGE'],
  contentVisibility: ['PUBLIC', 'PRIVATE', 'RESTRICTED'],
  ipRestrictions: {
    allowlist: true,
    geoFencing: true,
    vpnDetection: true
  },
  securityLogs: {
    retention: '365d',
    realTimeAlerts: true,
    auditTrail: true
  }
}

const baseMonitoring = {
  systemHealth: {
    uptime: true,
    resources: true,
    dependencies: true,
    alerts: true
  },
  performanceMetrics: {
    response: true,
    throughput: true,
    concurrency: true,
    latency: true
  },
  errorLogs: {
    severity: ['CRITICAL', 'ERROR', 'WARNING', 'INFO'],
    notification: true,
    aggregation: true
  },
  usageAnalytics: {
    realTime: true,
    historical: true,
    predictive: true
  }
}

export const saoDashboard: DashboardConfig = {
  version: '1.0.0',
  role: 'SUPER_ADMIN_OWNER',

  features: {
    base: {
      enabled: true,
      userManagement: {
        coachingStaff: {
          profiles: true,
          speakerManagement: true,
          courseInstructors: true,
          webinarHosts: true,
          professionalProfiles: true
        },
        clientManagement: {
          memberDirectory: true,
          enrollmentStatus: true,
          progressTracking: true,
          engagementMetrics: true
        }
      },
      security: {
        ...baseSecurityConfig,
        dataProtection: {
          backupManagement: true,
          privacySettings: true,
          gdprCompliance: true,
          dataEncryption: true
        }
      },
      monitoring: { ...baseMonitoring }
    },

    professionalNetwork: {
      enabled: true,
      networkManagement: {
        industryExperts: true,
        thoughtLeaders: true,
        sessionFacilitators: true,
        professionalProfiles: true
      }
    },

    coachingNetwork: {
      enabled: true,
      coaches: {
        profiles: true,
        expertiseAreas: true,
        sessionManagement: true,
        performanceAnalytics: true
      },
      alumni: {
        progressJourney: true,
        developmentPlans: true,
        engagementHistory: true,
        successMetrics: true
      }
    },

    aiCoaching: {
      enabled: true,
      executiveCoaches: {
        enterprise: true,
        advanced: true,
        foundation: true
      },
      nonExecutiveCoaches: {
        seniorLevel: true,
        associateLevel: true
      },
      aiSpeakers: {
        globalExpert: true,
        industrySpecialist: true,
        domainAuthority: true
      },
      aiInfluencers: {
        thoughtLeadership: true,
        industryImpact: true,
        innovationVoice: true
      }
    },

    aiSpecialists: {
      enabled: true,
      corporateSpecialists: {
        ceoAdvisory: {
          name: 'Dr. Grant',
          specialty: 'CEO Advisory & Intelligence',
          features: ['strategic-guidance', 'executive-intelligence']
        },
        cfoExcellence: {
          name: 'Dr. Burby',
          specialty: 'CFO Excellence & Fiduciary/Legal Risk',
          features: ['financial-strategy', 'risk-management']
        },
        ctoInnovation: {
          name: 'Dr. Sabena',
          specialty: 'CTO Innovation',
          features: ['tech-strategy', 'digital-transformation']
        },
        cooOperations: {
          name: 'Dr. Memoria',
          specialty: 'COO Operations',
          features: ['operational-excellence', 'process-optimization']
        },
        chroLeadership: {
          name: 'Dr. Cypriot',
          specialty: 'CHRO Leadership',
          features: ['talent-strategy', 'organizational-development']
        },
        cmoStrategy: {
          name: 'Professor Lee',
          specialty: 'CMO Strategy',
          features: ['marketing-innovation', 'brand-development']
        },
        croGrowth: {
          name: 'Dr. Match',
          specialty: 'CRO Growth',
          features: ['revenue-strategy', 'growth-optimization']
        }
      }
    },

    specialistFeatures: {
      enabled: true,
      aiPersonalityManagement: {
        customization: true,
        behaviorModeling: true,
        interactionStyles: true
      },
      domainExpertise: {
        configuration: true,
        knowledgeBase: true,
        specialization: true
      },
      analytics: {
        interactionAnalytics: true,
        performanceMetrics: true,
        learningPatterns: true
      },
      knowledgeBase: {
        updates: true,
        versioning: true,
        distribution: true
      }
    },

    learning: {
      enabled: true,
      courseManagement: {
        library: true,
        sessionPlanning: true,
        materialReview: true,
        activityManagement: true
      },
      assessmentTools: {
        quizManagement: true,
        surveyCreation: true,
        progressReports: true,
        certificationTools: true
      }
    },

    events: {
      enabled: true,
      management: {
        webinarScheduling: true,
        conferencePlanning: true,
        sessionCoordination: true,
        roomManagement: true
      },
      communication: {
        announcements: true,
        feedback: true,
        messageCenter: true,
        notifications: true
      }
    },

    system: {
      enabled: true,
      platformSettings: {
        siteConfiguration: true,
        integrationManagement: true,
        emailTemplates: true,
        backupSettings: true
      },
      monitoring: { ...baseMonitoring }
    }
  }
}
