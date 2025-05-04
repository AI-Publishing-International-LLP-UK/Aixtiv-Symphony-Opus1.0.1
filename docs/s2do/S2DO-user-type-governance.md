# User Type-Specific Governance Models

## Overview

The S2DO Governance system implements tailored governance models for different user types defined in the Aixtiv Symphony Opus 1 ecosystem. This document details how governance rules, verification requirements, and approval workflows are customized for each user type, ensuring appropriate oversight while maximizing user experience.

## User Type Classification

The system defines the following user types in the Firestore database:

| User Type | Description | Primary Use Cases | Risk Profile |
|-----------|-------------|-------------------|-------------|
| Individual | Personal users | Personal content creation, learning, exploration | Low |
| Professional | Professional practitioners | Client work, professional services, consulting | Medium |
| Student | Educational users | Coursework, projects, research assignments | Low-Medium |
| Enterprise | Business entities | Business operations, team collaboration, client delivery | Medium-High |
| Research | Research institutions | Data analysis, experiments, publication | Medium-High |
| Government | Government agencies | Public services, policy work, compliance | High |

## Governance Components

For each user type, governance is applied through several key components:

1. **Verification Requirements**: Authentication and validation needed for actions
2. **Approval Chains**: Required approvals for action completion
3. **Action Limitations**: Restrictions on action types and parameters
4. **Audit Requirements**: Level of detail in audit trails
5. **NFT Attribution**: How achievements are attributed and recorded

## Individual User Governance

Individual users receive a streamlined governance model focused on simplicity while maintaining security.

### Verification Requirements

```typescript
// src/governance/models/individual-governance.ts

export const individualVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.SINGLE,
  
  actionVerification: {
    // Content actions - self verification
    'S2DO:Create:Document': { type: S2DOVerificationType.SINGLE },
    'S2DO:Update:Document': { type: S2DOVerificationType.SINGLE },
    'S2DO:Share:Content': { type: S2DOVerificationType.SINGLE },
    
    // Financial actions - enhanced verification
    'S2DO:Authorize:Payment': { 
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['email', 'sms'],
      timeConstraint: 3600 // seconds
    },
    
    // High-impact actions - enhanced verification
    'S2DO:Delete:Account': {
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['email', 'password', 'recovery'],
      timeConstraint: 86400 // 24 hours
    }
  }
};
```

### Approval Chain

Individual users typically use self-approval for most actions:

```typescript
export const individualApprovalChain: ApprovalChainConfig = {
  defaultApprovalChain: [
    {
      role: 'self',
      requiresAuthentication: true,
      timeConstraint: null
    }
  ],
  
  // Financial action approval requires additional verification
  'S2DO:Authorize:Payment': [
    {
      role: 'self',
      requiresAuthentication: true,
      requiresMultiFactorAuth: true,
      timeConstraint: 3600
    }
  ]
};
```

### Action Limitations

Individual users have certain limitations to mitigate risk:

```typescript
export const individualActionLimitations: ActionLimitationConfig = {
  // Financial limitations
  'S2DO:Authorize:Payment': {
    maxAmount: 1000,
    dailyLimit: 2000,
    monthlyLimit: 10000,
    requiresVerifiedAccount: true
  },
  
  // Content limitations
  'S2DO:Create:Document': {
    maxSize: 10485760, // 10MB
    allowedTypes: ['text', 'image', 'pdf', 'audio'],
    restrictedCategories: ['commercial', 'enterprise']
  }
};
```

### Audit Trail

Individual users have basic audit requirements:

```typescript
export const individualAuditConfig: AuditConfig = {
  defaultLevel: AuditLevel.BASIC,
  
  actionAuditLevel: {
    // Financial actions - comprehensive audit
    'S2DO:Authorize:Payment': AuditLevel.COMPREHENSIVE,
    
    // Content actions - basic audit
    'S2DO:Create:Document': AuditLevel.BASIC,
    'S2DO:Update:Document': AuditLevel.BASIC
  },
  
  retentionPeriod: {
    default: 90, // days
    financial: 365, // days
    contentModification: 180 // days
  }
};
```

## Professional User Governance

Professional users require stronger verification and governance due to client and business implications.

### Verification Requirements

```typescript
export const professionalVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.MULTI,
  
  actionVerification: {
    // Client-related actions - enhanced verification
    'S2DO:Create:ClientProject': { 
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['email', 'app'],
      timeConstraint: 3600
    },
    'S2DO:Deliver:ClientWork': {
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['email', 'app'],
      timeConstraint: 3600
    },
    
    // Financial actions - strict verification
    'S2DO:Invoice:Client': {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['account-manager', 'financial-officer'],
      minimumApprovals: 2,
      timeConstraint: 86400
    }
  }
};
```

### Approval Chain

Professional users often require multi-party approval:

```typescript
export const professionalApprovalChain: ApprovalChainConfig = {
  defaultApprovalChain: [
    {
      role: 'self',
      requiresAuthentication: true,
      timeConstraint: null
    }
  ],
  
  // Client deliverable approval
  'S2DO:Deliver:ClientWork': [
    {
      role: 'self',
      requiresAuthentication: true,
      timeConstraint: null
    },
    {
      role: 'quality-reviewer',
      requiresAuthentication: true,
      timeConstraint: 172800 // 48 hours
    }
  ],
  
  // Invoice approval
  'S2DO:Invoice:Client': [
    {
      role: 'self',
      requiresAuthentication: true,
      timeConstraint: null
    },
    {
      role: 'financial-officer',
      requiresAuthentication: true,
      timeConstraint: 86400 // 24 hours
    }
  ]
};
```

### Action Limitations

Professional accounts have different limitations focused on client work:

```typescript
export const professionalActionLimitations: ActionLimitationConfig = {
  // Contract limitations
  'S2DO:Create:Contract': {
    requiresVerification: true,
    maxValue: 50000,
    requiresLegalReview: {
      threshold: 10000,
      roles: ['legal-advisor']
    }
  },
  
  // Invoice limitations
  'S2DO:Invoice:Client': {
    maxAmount: 25000,
    requiresApproval: {
      threshold: 5000,
      roles: ['financial-officer']
    }
  }
};
```

## Enterprise User Governance

Enterprise users have the most comprehensive governance model, with role-based permissions and approval workflows.

### Verification Requirements

```typescript
export const enterpriseVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.MULTI,
  
  actionVerification: {
    // Administrative actions
    'S2DO:Create:Department': {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['department-head', 'hr-director', 'executive'],
      minimumApprovals: 3,
      timeConstraint: 604800 // 7 days
    },
    
    // Financial actions
    'S2DO:Approve:Budget': {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['department-head', 'finance-director', 'executive'],
      minimumApprovals: 3,
      timeConstraint: 604800 // 7 days
    },
    
    // Security actions
    'S2DO:Grant:SystemAccess': {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['it-security', 'department-head'],
      minimumApprovals: 2,
      timeConstraint: 86400 // 24 hours
    }
  }
};
```

### Role-Based Permissions

Enterprise governance includes detailed role-based permissions:

```typescript
export const enterpriseRolePermissions: RolePermissionConfig = {
  roles: {
    'employee': {
      allowedActions: [
        'S2DO:Create:Document',
        'S2DO:Update:Document',
        'S2DO:Share:Document',
        'S2DO:Request:Approval'
      ],
      resourceAccess: {
        documents: 'team',
        projects: 'team',
        budgets: 'view-only'
      }
    },
    
    'manager': {
      allowedActions: [
        'S2DO:Create:Project',
        'S2DO:Assign:Task',
        'S2DO:Approve:TimeOff',
        'S2DO:Review:Performance'
      ],
      resourceAccess: {
        documents: 'department',
        projects: 'department',
        budgets: 'department-edit',
        employees: 'team-manage'
      }
    },
    
    'executive': {
      allowedActions: [
        'S2DO:Approve:Budget',
        'S2DO:Create:Department',
        'S2DO:Authorize:Partnership',
        'S2DO:Approve:Strategy'
      ],
      resourceAccess: {
        documents: 'organization',
        projects: 'organization',
        budgets: 'organization-edit',
        employees: 'organization-view'
      }
    }
  }
};
```

### Approval Workflows

Enterprise governance includes complex approval workflows:

```typescript
export const enterpriseApprovalWorkflows: WorkflowConfig = {
  'budget-approval': {
    steps: [
      {
        name: 'Department Review',
        role: 'department-head',
        requiresAuthentication: true,
        timeConstraint: 172800, // 48 hours
        escalation: {
          after: 172800, // 48 hours
          to: 'finance-director'
        }
      },
      {
        name: 'Financial Review',
        role: 'finance-director',
        requiresAuthentication: true,
        timeConstraint: 172800, // 48 hours
        conditionalSkip: {
          condition: 'amount < 10000',
          skipTo: 'complete'
        }
      },
      {
        name: 'Executive Approval',
        role: 'executive',
        requiresAuthentication: true,
        timeConstraint: 259200, // 72 hours
        requiredForAmounts: 'amount >= 50000'
      }
    ]
  },
  
  'contract-approval': {
    steps: [
      {
        name: 'Legal Review',
        role: 'legal-counsel',
        requiresAuthentication: true,
        timeConstraint: 259200, // 72 hours
        escalation: {
          after: 259200, // 72 hours
          to: 'general-counsel'
        }
      },
      {
        name: 'Financial Impact Review',
        role: 'finance-director',
        requiresAuthentication: true,
        timeConstraint: 172800, // 48 hours
      },
      {
        name: 'Final Approval',
        role: 'executive',
        requiresAuthentication: true,
        timeConstraint: 259200, // 72 hours
        requiredForValues: 'value >= 100000'
      }
    ]
  }
};
```

## Student User Governance

Student users have governance optimized for educational contexts, including instructor oversight.

### Verification Requirements

```typescript
export const studentVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.SINGLE,
  
  actionVerification: {
    // Assignment submission
    'S2DO:Submit:Assignment': {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['student'],
      timeConstraint: null
    },
    
    // Exam verification
    'S2DO:Start:Exam': {
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['email', 'password', 'proctor'],
      timeConstraint: 300 // 5 minutes
    }
  }
};
```

### Educational Workflows

Student governance includes educational workflows:

```typescript
export const studentEducationalWorkflows: WorkflowConfig = {
  'assignment-submission': {
    steps: [
      {
        name: 'Student Submission',
        role: 'student',
        requiresAuthentication: true,
        timeConstraint: null
      },
      {
        name: 'Plagiarism Check',
        role: 'system',
        requiresAuthentication: false,
        timeConstraint: 3600 // 1 hour
      },
      {
        name: 'Instructor Review',
        role: 'instructor',
        requiresAuthentication: true,
        timeConstraint: 604800 // 7 days
      }
    ]
  },
  
  'research-approval': {
    steps: [
      {
        name: 'Student Proposal',
        role: 'student',
        requiresAuthentication: true,
        timeConstraint: null
      },
      {
        name: 'Advisor Review',
        role: 'advisor',
        requiresAuthentication: true,
        timeConstraint: 604800 // 7 days
      },
      {
        name: 'Ethics Committee',
        role: 'ethics-committee',
        requiresAuthentication: true,
        timeConstraint: 1209600, // 14 days
        conditionalInclude: {
          condition: 'involvesHumanSubjects == true || involvesAnimalSubjects == true',
        }
      }
    ]
  }
};
```

## Research User Governance

Research users have governance focused on research integrity, ethics, and data protection.

### Research Protocol Verification

```typescript
export const researchVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.MULTI,
  
  actionVerification: {
    // Research data collection
    'S2DO:Collect:ResearchData': {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['researcher', 'ethics-officer'],
      minimumApprovals: 2,
      timeConstraint: 604800 // 7 days
    },
    
    // Research publication
    'S2DO:Publish:Research': {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['researcher', 'research-lead', 'institution-authority'],
      minimumApprovals: 3,
      timeConstraint: 1209600 // 14 days
    }
  }
};
```

### Research Ethics Workflows

```typescript
export const researchEthicsWorkflows: WorkflowConfig = {
  'research-ethics-approval': {
    steps: [
      {
        name: 'Research Proposal',
        role: 'researcher',
        requiresAuthentication: true,
        timeConstraint: null
      },
      {
        name: 'Department Review',
        role: 'department-head',
        requiresAuthentication: true,
        timeConstraint: 604800 // 7 days
      },
      {
        name: 'Ethics Committee Review',
        role: 'ethics-committee',
        requiresAuthentication: true,
        timeConstraint: 1209600, // 14 days
        requiredForTypes: [
          'human-subjects',
          'animal-subjects',
          'sensitive-data',
          'environmental-impact'
        ]
      },
      {
        name: 'Institutional Approval',
        role: 'institutional-authority',
        requiresAuthentication: true,
        timeConstraint: 604800, // 7 days
        requiredForFunding: 'fundingAmount >= 100000'
      }
    ]
  }
};
```

## Government User Governance

Government users have the most stringent governance with comprehensive audit trails and multi-level approvals.

### Government Verification Requirements

```typescript
export const governmentVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.MULTI,
  
  actionVerification: {
    // Policy actions
    'S2DO:Create:Policy': {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['policy-author', 'department-head', 'legal-review', 'executive-approval'],
      minimumApprovals: 4,
      timeConstraint: 2419200 // 28 days
    },
    
    // Sensitive data actions
    'S2DO:Access:SensitiveData': {
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['smartcard', 'pin', 'biometric'],
      requiredRoles: ['data-custodian', 'security-officer'],
      minimumApprovals: 2,
      timeConstraint: 3600 // 1 hour
    }
  }
};
```

### Government Compliance Workflows

```typescript
export const governmentComplianceWorkflows: WorkflowConfig = {
  'policy-approval': {
    steps: [
      {
        name: 'Policy Draft',
        role: 'policy-author',
        requiresAuthentication: true,
        timeConstraint: null
      },
      {
        name: 'Departmental Review',
        role: 'department-head',
        requiresAuthentication: true,
        timeConstraint: 604800 // 7 days
      },
      {
        name: 'Legal Review',
        role: 'legal-counsel',
        requiresAuthentication: true,
        timeConstraint: 1209600 // 14 days
      },
      {
        name: 'Public Comment Period',
        role: 'system',
        requiresAuthentication: false,
        timeConstraint: 2419200, // 28 days
        conditionalInclude: {
          condition: 'requiresPublicComment == true'
        }
      },
      {
        name: 'Executive Approval',
        role: 'executive',
        requiresAuthentication: true,
        timeConstraint: 604800 // 7 days
      }
    ]
  }
};
```

## Implementation

The user type-specific governance models are implemented through a combination of Firestore rules, blockchain smart contracts, and application logic:

1. **Firestore Rules**: Enforce basic access controls based on user type
2. **Smart Contracts**: Implement verification workflows on the blockchain
3. **Ray Cluster Actors**: Process governance rules in distributed computing environment
4. **API Middleware**: Apply governance rules at the API layer
5. **UI Components**: Present appropriate governance interfaces based on user type

### Example Implementation

```typescript
// src/governance/services/governance-factory.ts

export class GovernanceFactory {
  /**
   * Create a governance model based on user type
   */
  static createGovernanceModel(userType: UserType): GovernanceModel {
    switch (userType) {
      case UserType.INDIVIDUAL:
        return new IndividualGovernanceModel(
          individualVerificationRequirements,
          individualApprovalChain,
          individualActionLimitations,
          individualAuditConfig
        );
        
      case UserType.PROFESSIONAL:
        return new ProfessionalGovernanceModel(
          professionalVerificationRequirements,
          professionalApprovalChain,
          professionalActionLimitations,
          professionalAuditConfig
        );
        
      case UserType.STUDENT:
        return new StudentGovernanceModel(
          studentVerificationRequirements,
          studentEducationalWorkflows,
          studentActionLimitations,
          studentAuditConfig
        );
        
      case UserType.ENTERPRISE:
        return new EnterpriseGovernanceModel(
          enterpriseVerificationRequirements,
          enterpriseApprovalWorkflows,
          enterpriseRolePermissions,
          enterpriseAuditConfig
        );
        
      case UserType.RESEARCH:
        return new ResearchGovernanceModel(
          researchVerificationRequirements,
          researchEthicsWorkflows,
          researchActionLimitations,
          researchAuditConfig
        );
        
      case UserType.GOVERNMENT:
        return new GovernmentGovernanceModel(
          governmentVerificationRequirements,
          governmentComplianceWorkflows,
          governmentActionLimitations,
          governmentAuditConfig
        );
        
      default:
        throw new Error(`Unknown user type: ${userType}`);
    }
  }
}
```

## Integration with the S2DO System

The user type-specific governance models integrate with the core S2DO system through:

1. **Verification Service**: Applies the appropriate verification requirements based on user type
2. **Approval Chain Service**: Implements the approval workflows for each user type
3. **Action Limitation Service**: Enforces action limitations based on user type
4. **Audit Service**: Captures the appropriate audit trail based on user type and action

This integration ensures that all S2DO actions are governed appropriately based on the user's context and risk profile.
