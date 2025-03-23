/**
 * S2DO User Type Governance Implementation
 * 
 * This module implements the governance models for different user types
 * defined in the Aixtiv Symphony Opus 1 ecosystem, ensuring appropriate
 * oversight while maximizing user experience.
 * 
 * Project ID: api-for-warp-drive
 * Organization: coaching2100.com
 */

import { StemVerb, ActionDomain, SD20Action } from '../sd20-core';

/**
 * Verification types for S2DO actions
 */
export enum S2DOVerificationType {
  SINGLE = 'single',     // Single verifier required
  MULTI = 'multi',       // Multiple verifiers required
  SEQUENTIAL = 'sequential', // Verifiers must approve in sequence
  MAJORITY = 'majority'  // Majority of verifiers must approve
}

/**
 * User types in the Aixtiv Symphony Opus 1 ecosystem
 */
export enum UserType {
  INDIVIDUAL = 'individual',     // Personal users
  PROFESSIONAL = 'professional', // Professional practitioners
  STUDENT = 'student',           // Educational users
  ENTERPRISE = 'enterprise',     // Business entities
  RESEARCH = 'research',         // Research institutions
  GOVERNMENT = 'government'      // Government agencies
}

/**
 * Audit levels for actions
 */
export enum AuditLevel {
  BASIC = 'basic',               // Basic audit trail
  STANDARD = 'standard',         // Standard audit with additional details
  COMPREHENSIVE = 'comprehensive', // Comprehensive audit with full details
  REGULATORY = 'regulatory'      // Regulatory-compliant audit trail
}

/**
 * Verification configuration for a specific action
 */
export interface VerificationConfig {
  defaultVerificationType: S2DOVerificationType;
  actionVerification: {
    [action: string]: {
      type: S2DOVerificationType;
      requiredRoles?: string[];
      requiredFactors?: string[];
      requiredParticipants?: string[];
      minimumApprovals?: number;
      timeConstraint?: number;
    };
  };
}

/**
 * Approval chain configuration for actions
 */
export interface ApprovalChainConfig {
  defaultApprovalChain: ApprovalStep[];
  [action: string]: ApprovalStep[];
}

/**
 * Step in an approval chain
 */
export interface ApprovalStep {
  role: string;
  requiresAuthentication: boolean;
  requiresMultiFactorAuth?: boolean;
  timeConstraint: number | null;
}

/**
 * Configuration for action limitations
 */
export interface ActionLimitationConfig {
  [action: string]: {
    maxAmount?: number;
    maxSize?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
    requiresVerification?: boolean;
    requiresVerifiedAccount?: boolean;
    requiresLegalReview?: {
      threshold: number;
      roles: string[];
    };
    requiresApproval?: {
      threshold: number;
      roles: string[];
    };
    allowedTypes?: string[];
    restrictedCategories?: string[];
  };
}

/**
 * Configuration for audit requirements
 */
export interface AuditConfig {
  defaultLevel: AuditLevel;
  actionAuditLevel: {
    [action: string]: AuditLevel;
  };
  retentionPeriod: {
    default: number;
    [category: string]: number;
  };
}

/**
 * Configuration for role-based permissions
 */
export interface RolePermissionConfig {
  roles: {
    [role: string]: {
      allowedActions: string[];
      resourceAccess: {
        [resource: string]: string;
      };
    };
  };
}

/**
 * Configuration for workflow steps
 */
export interface WorkflowConfig {
  [workflow: string]: {
    steps: WorkflowStep[];
  };
}

/**
 * Step in a workflow
 */
export interface WorkflowStep {
  name: string;
  role: string;
  requiresAuthentication: boolean;
  timeConstraint: number | null;
  escalation?: {
    after: number;
    to: string;
  };
  conditionalSkip?: {
    condition: string;
    skipTo: string;
  };
  conditionalInclude?: {
    condition: string;
  };
  requiredForAmounts?: string;
  requiredForValues?: string;
  requiredForTypes?: string[];
  requiredForFunding?: string;
}

/**
 * Interface for governance models
 */
export interface GovernanceModel {
  /**
   * Get verification requirements for an action
   * @param action The action to get verification requirements for
   */
  getVerificationRequirement(action: SD20Action): {
    type: S2DOVerificationType;
    requiredRoles?: string[];
    requiredParticipants?: string[];
    minimumApprovals?: number;
    timeConstraint?: number;
  };
  
  /**
   * Check if a user can perform an action
   * @param userId User ID
   * @param action Action to check
   * @param parameters Action parameters
   */
  canPerformAction(userId: string, action: SD20Action, parameters: any): Promise<boolean>;
  
  /**
   * Get the approval workflow for an action
   * @param action The action to get the approval workflow for
   * @param parameters Action parameters
   */
  getApprovalWorkflow(action: SD20Action, parameters: any): ApprovalStep[];
  
  /**
   * Get audit requirements for an action
   * @param action The action to get audit requirements for
   */
  getAuditRequirements(action: SD20Action): {
    level: AuditLevel;
    retentionPeriod: number;
  };
  
  /**
   * Validate action parameters against limitations
   * @param action The action to validate
   * @param parameters Action parameters
   */
  validateActionParameters(action: SD20Action, parameters: any): {
    valid: boolean;
    violations: string[];
  };
}

/**
 * Base class for governance models
 */
abstract class BaseGovernanceModel implements GovernanceModel {
  constructor(
    protected verificationConfig: VerificationConfig,
    protected approvalConfig: ApprovalChainConfig | WorkflowConfig,
    protected actionLimitations: ActionLimitationConfig,
    protected auditConfig: AuditConfig
  ) {}
  
  /**
   * Get verification requirements for an action
   * @param action The action to get verification requirements for
   */
  getVerificationRequirement(action: SD20Action): {
    type: S2DOVerificationType;
    requiredRoles?: string[];
    requiredParticipants?: string[];
    minimumApprovals?: number;
    timeConstraint?: number;
  } {
    // Check if there are specific requirements for this action
    if (this.verificationConfig.actionVerification[action]) {
      return this.verificationConfig.actionVerification[action];
    }
    
    // Otherwise, use default requirements
    return {
      type: this.verificationConfig.defaultVerificationType
    };
  }
  
  /**
   * Check if a user can perform an action
   * @param userId User ID
   * @param action Action to check
   * @param parameters Action parameters
   */
  async canPerformAction(userId: string, action: SD20Action, parameters: any): Promise<boolean> {
    // This would check against role-based permissions in a real implementation
    // For simplicity, we'll assume all actions are allowed
    return true;
  }
  
  /**
   * Get the approval workflow for an action
   * @param action The action to get the approval workflow for
   * @param parameters Action parameters
   */
  getApprovalWorkflow(action: SD20Action, parameters: any): ApprovalStep[] {
    // If the approvalConfig is an ApprovalChainConfig
    if ('defaultApprovalChain' in this.approvalConfig) {
      const approvalChainConfig = this.approvalConfig as ApprovalChainConfig;
      
      // Check if there's a specific approval chain for this action
      if (approvalChainConfig[action]) {
        return approvalChainConfig[action];
      }
      
      // Otherwise, use default approval chain
      return approvalChainConfig.defaultApprovalChain;
    }
    
    // If the approvalConfig is a WorkflowConfig, we need to map it to ApprovalSteps
    // This is a simplified implementation
    return [
      {
        role: 'self',
        requiresAuthentication: true,
        timeConstraint: null
      }
    ];
  }
  
  /**
   * Get audit requirements for an action
   * @param action The action to get audit requirements for
   */
  getAuditRequirements(action: SD20Action): {
    level: AuditLevel;
    retentionPeriod: number;
  } {
    // Check if there are specific audit requirements for this action
    let level = this.auditConfig.defaultLevel;
    if (this.auditConfig.actionAuditLevel[action]) {
      level = this.auditConfig.actionAuditLevel[action];
    }
    
    // Determine retention period
    let retentionPeriod = this.auditConfig.retentionPeriod.default;
    
    // Check if there's a category-specific retention period
    if (action.startsWith('S2DO:')) {
      const category = action.split(':')[1].toLowerCase();
      if (this.auditConfig.retentionPeriod[category]) {
        retentionPeriod = this.auditConfig.retentionPeriod[category];
      }
    }
    
    return {
      level,
      retentionPeriod
    };
  }
  
  /**
   * Validate action parameters against limitations
   * @param action The action to validate
   * @param parameters Action parameters
   */
  validateActionParameters(action: SD20Action, parameters: any): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];
    
    // Check if there are limitations for this action
    if (this.actionLimitations[action]) {
      const limitations = this.actionLimitations[action];
      
      // Check amount limitation
      if (limitations.maxAmount && parameters.amount && parameters.amount > limitations.maxAmount) {
        violations.push(`Amount exceeds maximum allowed (${parameters.amount} > ${limitations.maxAmount})`);
      }
      
      // Check size limitation
      if (limitations.maxSize && parameters.size && parameters.size > limitations.maxSize) {
        violations.push(`Size exceeds maximum allowed (${parameters.size} > ${limitations.maxSize})`);
      }
      
      // Check allowed types
      if (limitations.allowedTypes && parameters.type && !limitations.allowedTypes.includes(parameters.type)) {
        violations.push(`Type "${parameters.type}" is not allowed. Allowed types: ${limitations.allowedTypes.join(', ')}`);
      }
      
      // Check restricted categories
      if (limitations.restrictedCategories && parameters.category && limitations.restrictedCategories.includes(parameters.category)) {
        violations.push(`Category "${parameters.category}" is restricted`);
      }
    }
    
    return {
      valid: violations.length === 0,
      violations
    };
  }
}

/**
 * Individual user governance model
 */
export class IndividualGovernanceModel extends BaseGovernanceModel {
  constructor() {
    super(
      individualVerificationRequirements,
      individualApprovalChain,
      individualActionLimitations,
      individualAuditConfig
    );
  }
}

/**
 * Professional user governance model
 */
export class ProfessionalGovernanceModel extends BaseGovernanceModel {
  constructor() {
    super(
      professionalVerificationRequirements,
      professionalApprovalChain,
      professionalActionLimitations,
      professionalAuditConfig
    );
  }
}

/**
 * Student user governance model
 */
export class StudentGovernanceModel extends BaseGovernanceModel {
  constructor() {
    super(
      studentVerificationRequirements,
      studentEducationalWorkflows,
      studentActionLimitations,
      studentAuditConfig
    );
  }
}

/**
 * Enterprise user governance model
 */
export class EnterpriseGovernanceModel extends BaseGovernanceModel {
  private rolePermissions: RolePermissionConfig;
  
  constructor() {
    super(
      enterpriseVerificationRequirements,
      enterpriseApprovalWorkflows,
      enterpriseActionLimitations,
      enterpriseAuditConfig
    );
    
    this.rolePermissions = enterpriseRolePermissions;
  }
  
  /**
   * Check if a user can perform an action
   * @param userId User ID
   * @param action Action to check
   * @param parameters Action parameters
   */
  async canPerformAction(userId: string, action: SD20Action, parameters: any): Promise<boolean> {
    // This would check against role-based permissions
    // For a real implementation, we would fetch the user's roles from a database
    const userRoles = await this.getUserRoles(userId);
    
    // Check if any of the user's roles allow this action
    for (const role of userRoles) {
      if (this.rolePermissions.roles[role] && 
          this.rolePermissions.roles[role].allowedActions.includes(action)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get user roles (mock implementation)
   * @param userId User ID
   */
  private async getUserRoles(userId: string): Promise<string[]> {
    // In a real implementation, this would fetch roles from a database
    return ['employee'];
  }
}

/**
 * Research user governance model
 */
export class ResearchGovernanceModel extends BaseGovernanceModel {
  constructor() {
    super(
      researchVerificationRequirements,
      researchEthicsWorkflows,
      researchActionLimitations,
      researchAuditConfig
    );
  }
}

/**
 * Government user governance model
 */
export class GovernmentGovernanceModel extends BaseGovernanceModel {
  constructor() {
    super(
      governmentVerificationRequirements,
      governmentComplianceWorkflows,
      governmentActionLimitations,
      governmentAuditConfig
    );
  }
}

/**
 * Factory for creating governance models
 */
export class GovernanceFactory {
  private static models: Map<UserType, GovernanceModel> = new Map();
  
  /**
   * Create a governance model based on user type
   * @param userType User type
   */
  static createGovernanceModel(userType: UserType): GovernanceModel {
    // Check if the model has already been created
    if (this.models.has(userType)) {
      return this.models.get(userType)!;
    }
    
    // Create a new model based on user type
    let model: GovernanceModel;
    
    switch (userType) {
      case UserType.INDIVIDUAL:
        model = new IndividualGovernanceModel();
        break;
      case UserType.PROFESSIONAL:
        model = new ProfessionalGovernanceModel();
        break;
      case UserType.STUDENT:
        model = new StudentGovernanceModel();
        break;
      case UserType.ENTERPRISE:
        model = new EnterpriseGovernanceModel();
        break;
      case UserType.RESEARCH:
        model = new ResearchGovernanceModel();
        break;
      case UserType.GOVERNMENT:
        model = new GovernmentGovernanceModel();
        break;
      default:
        throw new Error(`Unknown user type: ${userType}`);
    }
    
    // Cache the model
    this.models.set(userType, model);
    
    return model;
  }
}

// Predefined governance models based on user types
// These configurations are based on the specifications in the S2DO-user-type-governance.md document

/**
 * Individual user verification requirements
 */
export const individualVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.SINGLE,
  
  actionVerification: {
    [`S2DO:${StemVerb.CREATE}:Document`]: { 
      type: S2DOVerificationType.SINGLE 
    },
    [`S2DO:${StemVerb.UPDATE}:Document`]: { 
      type: S2DOVerificationType.SINGLE 
    },
    [`S2DO:${StemVerb.SHARE}:Content`]: { 
      type: S2DOVerificationType.SINGLE 
    },
    
    // Financial actions - enhanced verification
    [`S2DO:${StemVerb.AUTHORIZE}:Payment`]: { 
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

/**
 * Individual user approval chain
 */
export const individualApprovalChain: ApprovalChainConfig = {
  defaultApprovalChain: [
    {
      role: 'self',
      requiresAuthentication: true,
      timeConstraint: null
    }
  ],
  
  // Financial action approval requires additional verification
  [`S2DO:${StemVerb.AUTHORIZE}:Payment`]: [
    {
      role: 'self',
      requiresAuthentication: true,
      requiresMultiFactorAuth: true,
      timeConstraint: 3600
    }
  ]
};

/**
 * Individual user action limitations
 */
export const individualActionLimitations: ActionLimitationConfig = {
  // Financial limitations
  [`S2DO:${StemVerb.AUTHORIZE}:Payment`]: {
    maxAmount: 1000,
    dailyLimit: 2000,
    monthlyLimit: 10000,
    requiresVerifiedAccount: true
  },
  
  // Content limitations
  [`S2DO:${StemVerb.CREATE}:Document`]: {
    maxSize: 10485760, // 10MB
    allowedTypes: ['text', 'image', 'pdf', 'audio'],
    restrictedCategories: ['commercial', 'enterprise']
  }
};

/**
 * Individual user audit configuration
 */
export const individualAuditConfig: AuditConfig = {
  defaultLevel: AuditLevel.BASIC,
  
  actionAuditLevel: {
    // Financial actions - comprehensive audit
    [`S2DO:${StemVerb.AUTHORIZE}:Payment`]: AuditLevel.COMPREHENSIVE,
    
    // Content actions - basic audit
    [`S2DO:${StemVerb.CREATE}:Document`]: AuditLevel.BASIC,
    [`S2DO:${StemVerb.UPDATE}:Document`]: AuditLevel.BASIC
  },
  
  retentionPeriod: {
    default: 90, // days
    financial: 365, // days
    contentModification: 180 // days
  }
};

/**
 * Professional user verification requirements
 */
export const professionalVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.MULTI,
  
  actionVerification: {
    // Client-related actions - enhanced verification
    [`S2DO:${StemVerb.CREATE}:ClientProject`]: { 
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['email', 'app'],
      timeConstraint: 3600
    },
    [`S2DO:${StemVerb.DELIVER}:ClientWork`]: {
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['email', 'app'],
      timeConstraint: 3600
    },
    
    // Financial actions - strict verification
    [`S2DO:${StemVerb.INVOICE}:Client`]: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['account-manager', 'financial-officer'],
      minimumApprovals: 2,
      timeConstraint: 86400
    }
  }
};

/**
 * Professional user approval chain
 */
export const professionalApprovalChain: ApprovalChainConfig = {
  defaultApprovalChain: [
    {
      role: 'self',
      requiresAuthentication: true,
      timeConstraint: null
    }
  ],
  
  // Client deliverable approval
  [`S2DO:${StemVerb.DELIVER}:ClientWork`]: [
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
  [`S2DO:${StemVerb.INVOICE}:Client`]: [
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

/**
 * Professional user action limitations
 */
export const professionalActionLimitations: ActionLimitationConfig = {
  // Contract limitations
  [`S2DO:${StemVerb.CREATE}:Contract`]: {
    requiresVerification: true,
    maxValue: 50000,
    requiresLegalReview: {
      threshold: 10000,
      roles: ['legal-advisor']
    }
  },
  
  // Invoice limitations
  [`S2DO:${StemVerb.INVOICE}:Client`]: {
    maxAmount: 25000,
    requiresApproval: {
      threshold: 5000,
      roles: ['financial-officer']
    }
  }
};

/**
 * Professional user audit configuration
 */
export const professionalAuditConfig: AuditConfig = {
  defaultLevel: AuditLevel.STANDARD,
  
  actionAuditLevel: {
    // Financial actions - comprehensive audit
    [`S2DO:${StemVerb.INVOICE}:Client`]: AuditLevel.COMPREHENSIVE,
    
    // Client work - standard audit
    [`S2DO:${StemVerb.DELIVER}:ClientWork`]: AuditLevel.STANDARD
  },
  
  retentionPeriod: {
    default: 365, // days
    financial: 2555, // 7 years
    contract: 2555, // 7 years
    client: 1825 // 5 years
  }
};

/**
 * Student user verification requirements
 */
export const studentVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.SINGLE,
  
  actionVerification: {
    // Assignment submission
    [`S2DO:${StemVerb.SUBMIT}:Assignment`]: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['student'],
      timeConstraint: null
    },
    
    // Exam verification
    [`S2DO:${StemVerb.START}:Exam`]: {
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['email', 'password', 'proctor'],
      timeConstraint: 300 // 5 minutes
    }
  }
};

/**
 * Student educational workflows
 */
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
          condition: 'involvesHumanSubjects == true || involvesAnimalSubjects == true'
        }
      }
    ]
  }
};

/**
 * Student action limitations
 */
export const studentActionLimitations: ActionLimitationConfig = {
  // Assignment limitations
  [`S2DO:${StemVerb.SUBMIT}:Assignment`]: {
    maxSize: 52428800, // 50MB
    allowedTypes: ['text', 'pdf', 'docx', 'pptx', 'xlsx', 'zip']
  },
  
  // Exam limitations
  [`S2DO:${StemVerb.START}:Exam`]: {
    requiresVerification: true
  }
};

/**
 * Student audit configuration
 */
export const studentAuditConfig: AuditConfig = {
  defaultLevel: AuditLevel.STANDARD,
  
  actionAuditLevel: {
    // Exam actions - comprehensive audit
    [`S2DO:${StemVerb.START}:Exam`]: AuditLevel.COMPREHENSIVE,
    [`S2DO:${StemVerb.COMPLETE}:Exam`]: AuditLevel.COMPREHENSIVE,
    
    // Assignment actions - standard audit
    [`S2DO:${StemVerb.SUBMIT}:Assignment`]: AuditLevel.STANDARD
  },
  
  retentionPeriod: {
    default: 365, // days
    assignment: 1095, // 3 years
    exam: 1825, // 5 years
    grade: 2555 // 7 years
  }
};

/**
 * Enterprise user verification requirements
 */
export const enterpriseVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.MULTI,
  
  actionVerification: {
    // Administrative actions
    [`S2DO:${StemVerb.CREATE}:Department`]: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['department-head', 'hr-director', 'executive'],
      minimumApprovals: 3,
      timeConstraint: 604800 // 7 days
    },
    
    // Financial actions
    [`S2DO:${StemVerb.APPROVE}:Budget`]: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['department-head', 'finance-director', 'executive'],
      minimumApprovals: 3,
      timeConstraint: 604800 // 7 days
    },
    
    // Security actions
    [`S2DO:${StemVerb.GRANT}:SystemAccess`]: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['it-security', 'department-head'],
      minimumApprovals: 2,
      timeConstraint: 86400 // 24 hours
    }
  }
};

/**
 * Enterprise role-based permissions
 */
export const enterpriseRolePermissions: RolePermissionConfig = {
  roles: {
    'employee': {
      allowedActions: [
        `S2DO:${StemVerb.CREATE}:Document`,
        `S2DO:${StemVerb.UPDATE}:Document`,
        `S2DO:${StemVerb.SHARE}:Document`,
        `S2DO:${StemVerb.REQUEST}:Approval`
      ],
      resourceAccess: {
        documents: 'team',
        projects: 'team',
        budgets: 'view-only'
      }
    },
    
    'manager': {
      allowedActions: [
        `S2DO:${StemVerb.CREATE}:Project`,
        `S2DO:${StemVerb.ASSIGN}:Task`,
        `S2DO:${StemVerb.APPROVE}:TimeOff`,
        `S2DO:${StemVerb.REVIEW}:Performance`
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
        `S2DO:${StemVerb.APPROVE}:Budget`,
        `S2DO:${StemVerb.CREATE}:Department`,
        `S2DO:${StemVerb.AUTHORIZE}:Partnership`,
        `S2DO:${StemVerb.APPROVE}:Strategy`
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

/**
 * Enterprise approval workflows
 */
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

/**
 * Enterprise action limitations
 */
export const enterpriseActionLimitations: ActionLimitationConfig = {
  // Budget limitations
  [`S2DO:${StemVerb.APPROVE}:Budget`]: {
    requiresVerification: true,
    requiresApproval: {
      threshold: 10000,
      roles: ['finance-director', 'executive']
    }
  },
  
  // Contract limitations
  [`S2DO:${StemVerb.APPROVE}:Contract`]: {
    requiresVerification: true,
    requiresLegalReview: {
      threshold: 0, // All contracts require legal review
      roles: ['legal-counsel']
    }
  }
};

/**
 * Enterprise audit configuration
 */
export const enterpriseAuditConfig: AuditConfig = {
  defaultLevel: AuditLevel.COMPREHENSIVE,
  
  actionAuditLevel: {
    // Financial actions - regulatory audit
    [`S2DO:${StemVerb.APPROVE}:Budget`]: AuditLevel.REGULATORY,
    [`S2DO:${StemVerb.AUTHORIZE}:Payment`]: AuditLevel.REGULATORY,
    
    // HR actions - regulatory audit
    [`S2DO:${StemVerb.CREATE}:Department`]: AuditLevel.REGULATORY,
    [`S2DO:${StemVerb.HIRE}:Employee`]: AuditLevel.REGULATORY
  },
  
  retentionPeriod: {
    default: 2555, // 7 years
    financial: 3650, // 10 years
    hr: 3650, // 10 years
    legal: 3650 // 10 years
  }
};

/**
 * Research verification requirements
 */
export const researchVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.MULTI,
  
  actionVerification: {
    // Research data collection
    [`S2DO:${StemVerb.COLLECT}:ResearchData`]: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['researcher', 'ethics-officer'],
      minimumApprovals: 2,
      timeConstraint: 604800 // 7 days
    },
    
    // Research publication
    [`S2DO:${StemVerb.PUBLISH}:Research`]: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['researcher', 'research-lead', 'institution-authority'],
      minimumApprovals: 3,
      timeConstraint: 1209600 // 14 days
    }
  }
};

/**
 * Research ethics workflows
 */
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

/**
 * Research action limitations
 */
export const researchActionLimitations: ActionLimitationConfig = {
  // Data collection limitations
  [`S2DO:${StemVerb.COLLECT}:ResearchData`]: {
    requiresVerification: true,
    requiresApproval: {
      threshold: 0, // All data collection requires approval
      roles: ['ethics-officer']
    }
  },
  
  // Publication limitations
  [`S2DO:${StemVerb.PUBLISH}:Research`]: {
    requiresVerification: true,
    requiresApproval: {
      threshold: 0, // All publications require approval
      roles: ['research-lead']
    }
  }
};

/**
 * Research audit configuration
 */
export const researchAuditConfig: AuditConfig = {
  defaultLevel: AuditLevel.COMPREHENSIVE,
  
  actionAuditLevel: {
    // Data collection - regulatory audit
    [`S2DO:${StemVerb.COLLECT}:ResearchData`]: AuditLevel.REGULATORY,
    
    // Publication - comprehensive audit
    [`S2DO:${StemVerb.PUBLISH}:Research`]: AuditLevel.COMPREHENSIVE
  },
  
  retentionPeriod: {
    default: 3650, // 10 years
    research: 3650, // 10 years
    publication: 'permanent' as unknown as number, // Permanent
    grant: 7300 // 20 years
  }
};

/**
 * Government verification requirements
 */
export const governmentVerificationRequirements: VerificationConfig = {
  defaultVerificationType: S2DOVerificationType.MULTI,
  
  actionVerification: {
    // Policy actions
    [`S2DO:${StemVerb.CREATE}:Policy`]: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['policy-author', 'department-head', 'legal-review', 'executive-approval'],
      minimumApprovals: 4,
      timeConstraint: 2419200 // 28 days
    },
    
    // Sensitive data actions
    [`S2DO:${StemVerb.ACCESS}:SensitiveData`]: {
      type: S2DOVerificationType.MULTI,
      requiredFactors: ['smartcard', 'pin', 'biometric'],
      requiredRoles: ['data-custodian', 'security-officer'],
      minimumApprovals: 2,
      timeConstraint: 3600 // 1 hour
    }
  }
};

/**
 * Government compliance workflows
 */
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

/**
 * Government action limitations
 */
export const governmentActionLimitations: ActionLimitationConfig = {
  // Policy limitations
  [`S2DO:${StemVerb.CREATE}:Policy`]: {
    requiresVerification: true,
    requiresLegalReview: {
      threshold: 0, // All policies require legal review
      roles: ['legal-counsel']
    }
  },
  
  // Sensitive data limitations
  [`S2DO:${StemVerb.ACCESS}:SensitiveData`]: {
    requiresVerification: true,
    requiresApproval: {
      threshold: 0, // All sensitive data access requires approval
      roles: ['security-officer', 'data-custodian']
    }
  }
};

/**
 * Government audit configuration
 */
export const governmentAuditConfig: AuditConfig = {
  defaultLevel: AuditLevel.REGULATORY,
  
  actionAuditLevel: {
    // All actions have regulatory-level audit
    [`S2DO:${StemVerb.CREATE}:Policy`]: AuditLevel.REGULATORY,
    [`S2DO:${StemVerb.ACCESS}:SensitiveData`]: AuditLevel.REGULATORY,
    [`S2DO:${StemVerb.APPROVE}:Budget`]: AuditLevel.REGULATORY
  },
  
  retentionPeriod: {
    default: 3650, // 10 years
    policy: 'permanent' as unknown as number, // Permanent
    sensitive: 7300, // 20 years
    financial: 3650 // 10 years
  }
};
