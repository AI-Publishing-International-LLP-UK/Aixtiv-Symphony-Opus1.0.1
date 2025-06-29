import type { RoleType } from '../types'
import { Pilot, MemorySystem } from '../types'

export interface RoleFlightConfig {
  role: {
    id: string
    title: string
    type: RoleType
    canToggle: boolean
    currentMode: 'human' | 'ai'
    status: 'active' | 'transitioning' | 'inactive'
    transitionProtocol: {
      requiresApproval: boolean
      cooldownPeriod: number
      notificationList: string[]
    }
  }
  pilotAssignment: {
    primary: {
      pilotId: string
      name: string
      expertise: string[]
      availability: number[]
    }
    backup: {
      pilotId: string
      name: string
      expertise: string[]
    }
    rotation: {
      schedule: {
        frequency: 'daily' | 'weekly' | 'monthly'
        nextRotation: string
        lastRotation: string
      }
      team: string[]
    }
  }
  memorySystem: {
    primaryBank: string
    backupBanks: string[]
    knowledgeBase: {
      sources: string[]
      updateFrequency: number
      lastUpdate: string
    }
    metrics: {
      storageLocation: string
      retentionPeriod: number
      aggregation: boolean
    }
  }
}

export const roleFlightConfigs: Record<string, RoleFlightConfig> = {
  'ceo-advisory': {
    role: {
      id: 'dr-grant',
      title: 'CEO Advisory & Intelligence',
      type: 'executive',
      canToggle: true,
      currentMode: 'ai',
      status: 'active',
      transitionProtocol: {
        requiresApproval: true,
        cooldownPeriod: 3600,
        notificationList: ['admin', 'security', 'operations']
      }
    },
    pilotAssignment: {
      primary: {
        pilotId: 'pilot-001',
        name: 'Senior Pilot Alpha',
        expertise: ['Strategic Leadership', 'Corporate Governance'],
        availability: [0, 1, 2, 3, 4, 5, 6]
      },
      backup: {
        pilotId: 'pilot-002',
        name: 'Backup Pilot Beta',
        expertise: ['Executive Coaching', 'Business Intelligence']
      },
      rotation: {
        schedule: {
          frequency: 'weekly',
          nextRotation: '2024-01-14T00:00:00Z',
          lastRotation: '2024-01-07T00:00:00Z'
        },
        team: ['pilot-001', 'pilot-002', 'pilot-003']
      }
    },
    memorySystem: {
      primaryBank: 'ceo-primary-memory',
      backupBanks: ['strategic-backup', 'governance-backup'],
      knowledgeBase: {
        sources: ['corporate-strategy', 'board-relations', 'executive-comms'],
        updateFrequency: 86400,
        lastUpdate: '2024-01-07T12:00:00Z'
      },
      metrics: {
        storageLocation: 'metrics-db-01',
        retentionPeriod: 7776000,
        aggregation: true
      }
    }
  },

  'cto-innovation': {
    role: {
      id: 'dr-sabena',
      title: 'CTO Innovation',
      type: 'executive',
      canToggle: true,
      currentMode: 'ai',
      status: 'active',
      transitionProtocol: {
        requiresApproval: true,
        cooldownPeriod: 3600,
        notificationList: ['admin', 'security', 'tech-lead']
      }
    },
    pilotAssignment: {
      primary: {
        pilotId: 'pilot-004',
        name: 'Senior Pilot Gamma',
        expertise: ['Technology Strategy', 'Digital Innovation'],
        availability: [0, 1, 2, 3, 4, 5, 6]
      },
      backup: {
        pilotId: 'pilot-005',
        name: 'Backup Pilot Delta',
        expertise: ['IT Infrastructure', 'Emerging Tech']
      },
      rotation: {
        schedule: {
          frequency: 'weekly',
          nextRotation: '2024-01-14T00:00:00Z',
          lastRotation: '2024-01-07T00:00:00Z'
        },
        team: ['pilot-004', 'pilot-005', 'pilot-006']
      }
    },
    memorySystem: {
      primaryBank: 'cto-primary-memory',
      backupBanks: ['tech-backup', 'innovation-backup'],
      knowledgeBase: {
        sources: ['tech-strategy', 'digital-transformation', 'ai-ml'],
        updateFrequency: 86400,
        lastUpdate: '2024-01-07T12:00:00Z'
      },
      metrics: {
        storageLocation: 'metrics-db-02',
        retentionPeriod: 7776000,
        aggregation: true
      }
    }
  }
}

export const getActiveMode = (roleId: string): 'human' | 'ai' => {
  return roleFlightConfigs[roleId]?.role.currentMode || 'human'
}

export const getPilotInfo = (roleId: string) => {
  return roleFlightConfigs[roleId]?.pilotAssignment
}

export const getMemorySystem = (roleId: string) => {
  return roleFlightConfigs[roleId]?.memorySystem
}
