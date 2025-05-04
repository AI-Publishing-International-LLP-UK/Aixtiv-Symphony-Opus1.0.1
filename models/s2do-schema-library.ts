/**
 * S2DO Schema Library
 * 
 * A comprehensive library of standardized S2DO actions organized by domain and stem verbs.
 * This schema can be used to ensure consistent action naming and handling across an organization.
 * 
 * Format: S2DO:Stem:Action
 */

/**
 * All available stem verbs in the S2DO system
 */
export enum S2DOStem {
  // Creation and Initiation
  CREATE = 'Create',
  START = 'Start',
  INITIATE = 'Initiate',
  DESIGN = 'Design',
  BUILD = 'Build',
  GENERATE = 'Generate',
  DEVELOP = 'Develop',

  // Review and Evaluation
  REVIEW = 'Review',
  EVALUATE = 'Evaluate',
  ASSESS = 'Assess',
  ANALYZE = 'Analyze',
  AUDIT = 'Audit',
  EXAMINE = 'Examine',
  
  // Approval and Verification
  APPROVE = 'Approve',
  VERIFY = 'Verify',
  VALIDATE = 'Validate',
  CONFIRM = 'Confirm',
  AUTHORIZE = 'Authorize',
  CERTIFY = 'Certify',
  ENDORSE = 'Endorse',
  
  // Modification
  UPDATE = 'Update',
  MODIFY = 'Modify',
  REVISE = 'Revise',
  AMEND = 'Amend',
  ENHANCE = 'Enhance',
  OPTIMIZE = 'Optimize',
  CUSTOMIZE = 'Customize',
  
  // Execution and Implementation
  EXECUTE = 'Execute',
  IMPLEMENT = 'Implement',
  DEPLOY = 'Deploy',
  LAUNCH = 'Launch',
  ACTIVATE = 'Activate',
  RUN = 'Run',
  PERFORM = 'Perform',
  
  // Completion and Delivery
  COMPLETE = 'Complete',
  FINALIZE = 'Finalize',
  DELIVER = 'Deliver',
  SUBMIT = 'Submit',
  CONCLUDE = 'Conclude',
  PUBLISH = 'Publish',
  RELEASE = 'Release',
  
  // Management and Monitoring
  MANAGE = 'Manage',
  MONITOR = 'Monitor',
  TRACK = 'Track',
  OVERSEE = 'Oversee',
  COORDINATE = 'Coordinate',
  SUPERVISE = 'Supervise',
  ADMINISTER = 'Administer',
  
  // Communication
  REPORT = 'Report',
  SHARE = 'Share',
  COMMUNICATE = 'Communicate',
  NOTIFY = 'Notify',
  PRESENT = 'Present',
  DISTRIBUTE = 'Distribute',
  BROADCAST = 'Broadcast',
  
  // Financial
  FUND = 'Fund',
  PAY = 'Pay',
  BUDGET = 'Budget',
  INVOICE = 'Invoice',
  ALLOCATE = 'Allocate',
  INVEST = 'Invest',
  REIMBURSE = 'Reimburse',
  
  // Transition and Transfer
  TRANSITION = 'Transition',
  TRANSFER = 'Transfer',
  MIGRATE = 'Migrate',
  PROMOTE = 'Promote',
  ESCALATE = 'Escalate',
  DELEGATE = 'Delegate',
  ASSIGN = 'Assign',
  
  // Cancellation and Termination
  CANCEL = 'Cancel',
  TERMINATE = 'Terminate',
  WITHDRAW = 'Withdraw',
  ABORT = 'Abort',
  SUSPEND = 'Suspend',
  REJECT = 'Reject',
  ARCHIVE = 'Archive',
  
  // Advanced Intelligence (Years 8-15)
  TRANSFORM = 'Transform',
  INTEGRATE = 'Integrate',
  SYNCHRONIZE = 'Synchronize',
  GOVERN = 'Govern',
  
  // Ambient Intelligence (Years 16-22)
  ANTICIPATE = 'Anticipate',
  CONTEXTUAL = 'Contextual',
  SYNTHESIZE = 'Synthesize',
  ORCHESTRATE = 'Orchestrate',
  
  // Transcendent Systems (Years 23-30)
  CONSCIOUSNESS = 'Consciousness',
  QUANTUM_INTELLIGENCE = 'QuantumIntelligence',
  SYMBIOTIC = 'Symbiotic',
  TRANSDIMENSIONAL = 'Transdimensional'
}

/**
 * Domains for organizing S2DO actions
 */
export enum S2DODomain {
  CONTENT = 'Content',
  FINANCE = 'Finance',
  PROJECT = 'Project',
  MARKETING = 'Marketing',
  PRODUCT = 'Product',
  LEGAL = 'Legal',
  HR = 'HR',
  IT = 'IT',
  OPERATIONS = 'Operations',
  SALES = 'Sales',
  CUSTOMER = 'Customer',
  RESEARCH = 'Research',
  GOVERNANCE = 'Governance',
  COMPLIANCE = 'Compliance',
  SECURITY = 'Security',
  DEVELOPMENT = 'Development',
  DATA = 'Data',
  EXECUTIVE = 'Executive',
  CREATIVE = 'Creative',
  EDUCATION = 'Education',
  
  // Advanced domains (Years 12-22)
  INTELLIGENCE = 'Intelligence',
  ECOSYSTEM = 'Ecosystem',
  EXPERIENCE = 'Experience',
  INNOVATION = 'Innovation',
  
  // Future domains (Years 23-30)
  CONSCIOUSNESS = 'Consciousness',
  QUANTUM = 'Quantum',
  SYMBIOTIC = 'Symbiotic',
  TRANSDIMENSIONAL = 'Transdimensional'
}

/**
 * Priority levels for S2DO actions
 */
export enum S2DOPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Verification requirement types
 */
export enum S2DOVerificationType {
  SINGLE = 'single',      // Single approver required
  MULTI = 'multi',        // Multiple approvers required
  SEQUENTIAL = 'sequential', // Approvers must verify in order
  MAJORITY = 'majority',  // Majority of approvers required
  UNANIMOUS = 'unanimous' // All approvers must verify
}

/**
 * Base type for S2DO action definitions
 */
export interface S2DOActionDefinition {
  name: string;           // The action name (e.g., "Invoice")
  domain: S2DODomain;     // The domain this action belongs to
  description: string;    // Human-readable description
  defaultPriority: S2DOPriority; // Default priority for this action
  defaultVerification: {  // Default verification requirements
    type: S2DOVerificationType;
    requiredRoles?: string[];
    minimumApprovals?: number;
  };
  requiredParameters: string[]; // Required parameters for this action
  optionalParameters?: string[]; // Optional parameters for this action
}

/**
 * Full S2DO action with stem
 */
export interface S2DOAction extends S2DOActionDefinition {
  stem: S2DOStem;         // The verb stem for this action
  fullName: string;       // Complete name in S2DO:Stem:Action format
}

/**
 * CONTENT domain S2DO actions
 */
export const ContentActions: S2DOActionDefinition[] = [
  {
    name: 'Article',
    domain: S2DODomain.CONTENT,
    description: 'An article or blog post',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['editor']
    },
    requiredParameters: ['title', 'body', 'keywords'],
    optionalParameters: ['category', 'author', 'images', 'publishDate']
  },
  {
    name: 'WhitePaper',
    domain: S2DODomain.CONTENT,
    description: 'A detailed, authoritative report',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['editor', 'subject-matter-expert'],
      minimumApprovals: 2
    },
    requiredParameters: ['title', 'body', 'abstract', 'author'],
    optionalParameters: ['citations', 'figures', 'tables']
  },
  {
    name: 'SocialPost',
    domain: S2DODomain.CONTENT,
    description: 'Content for social media platforms',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['social-media-manager']
    },
    requiredParameters: ['text', 'platform', 'publishDate'],
    optionalParameters: ['images', 'tags', 'links', 'targetAudience']
  },
  {
    name: 'Newsletter',
    domain: S2DODomain.CONTENT,
    description: 'Email newsletter content',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['editor', 'marketing-manager']
    },
    requiredParameters: ['subject', 'body', 'recipientSegment'],
    optionalParameters: ['preheader', 'callToAction', 'images']
  },
  {
    name: 'VideoScript',
    domain: S2DODomain.CONTENT,
    description: 'Script for video content',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['creative-director', 'subject-matter-expert'],
      minimumApprovals: 2
    },
    requiredParameters: ['title', 'script', 'duration', 'target'],
    optionalParameters: ['visualNotes', 'musicNotes', 'voiceOver']
  },
  {
    name: 'PressRelease',
    domain: S2DODomain.CONTENT,
    description: 'Official announcement for media',
    defaultPriority: S2DOPriority.CRITICAL,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['pr-manager', 'legal-advisor', 'executive']
    },
    requiredParameters: ['headline', 'body', 'releaseDate', 'contactInfo'],
    optionalParameters: ['quotes', 'images', 'boilerplate']
  }
];

/**
 * FINANCE domain S2DO actions
 */
export const FinanceActions: S2DOActionDefinition[] = [
  {
    name: 'Invoice',
    domain: S2DODomain.FINANCE,
    description: 'Bill for products or services',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['finance-manager', 'department-head']
    },
    requiredParameters: ['invoiceNumber', 'amount', 'recipient', 'dueDate'],
    optionalParameters: ['lineItems', 'taxAmount', 'notes', 'paymentTerms']
  },
  {
    name: 'Budget',
    domain: S2DODomain.FINANCE,
    description: 'Financial plan for a period',
    defaultPriority: S2DOPriority.CRITICAL,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['finance-manager', 'department-head', 'executive']
    },
    requiredParameters: ['period', 'departmentId', 'totalAmount', 'categories'],
    optionalParameters: ['justification', 'previousBudget', 'forecast']
  },
  {
    name: 'Expense',
    domain: S2DODomain.FINANCE,
    description: 'Record of money spent',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['finance-manager']
    },
    requiredParameters: ['amount', 'category', 'date', 'submitter'],
    optionalParameters: ['receipt', 'notes', 'projectId', 'reimbursementMethod']
  },
  {
    name: 'Payment',
    domain: S2DODomain.FINANCE,
    description: 'Transfer of funds',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['finance-manager', 'finance-director'],
      minimumApprovals: 2
    },
    requiredParameters: ['amount', 'recipient', 'method', 'purpose'],
    optionalParameters: ['invoiceId', 'scheduledDate', 'recurring']
  },
  {
    name: 'FinancialReport',
    domain: S2DODomain.FINANCE,
    description: 'Summary of financial status',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['accountant', 'finance-director', 'cfo']
    },
    requiredParameters: ['period', 'reportType', 'data', 'preparedBy'],
    optionalParameters: ['notes', 'highlights', 'recommendations']
  }
];

/**
 * PROJECT domain S2DO actions
 */
export const ProjectActions: S2DOActionDefinition[] = [
  {
    name: 'Project',
    domain: S2DODomain.PROJECT,
    description: 'A defined initiative with a goal',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['project-sponsor', 'resource-manager'],
      minimumApprovals: 2
    },
    requiredParameters: ['name', 'description', 'objectives', 'timeline'],
    optionalParameters: ['budget', 'team', 'risks', 'dependencies']
  },
  {
    name: 'Milestone',
    domain: S2DODomain.PROJECT,
    description: 'Significant point in project progress',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['project-manager']
    },
    requiredParameters: ['projectId', 'name', 'deliverables', 'dueDate'],
    optionalParameters: ['dependencies', 'acceptanceCriteria', 'assignee']
  },
  {
    name: 'Task',
    domain: S2DODomain.PROJECT,
    description: 'Individual work item',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['project-manager']
    },
    requiredParameters: ['name', 'description', 'assignee', 'dueDate'],
    optionalParameters: ['status', 'priority', 'estimatedHours', 'dependencies']
  },
  {
    name: 'Risk',
    domain: S2DODomain.PROJECT,
    description: 'Potential issue that could impact project',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['project-manager', 'risk-manager'],
      minimumApprovals: 2
    },
    requiredParameters: ['projectId', 'description', 'likelihood', 'impact'],
    optionalParameters: ['mitigationPlan', 'owner', 'contingencyPlan']
  },
  {
    name: 'ChangeRequest',
    domain: S2DODomain.PROJECT,
    description: 'Proposed modification to project scope',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['project-manager', 'project-sponsor']
    },
    requiredParameters: ['projectId', 'description', 'justification', 'impact'],
    optionalParameters: ['costImpact', 'scheduleImpact', 'resources']
  },
  {
    name: 'StatusReport',
    domain: S2DODomain.PROJECT,
    description: 'Regular update on project progress',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['project-manager']
    },
    requiredParameters: ['projectId', 'period', 'status', 'accomplishments'],
    optionalParameters: ['nextSteps', 'issues', 'risks', 'metrics']
  }
];

/**
 * LEGAL domain S2DO actions
 */
export const LegalActions: S2DOActionDefinition[] = [
  {
    name: 'Contract',
    domain: S2DODomain.LEGAL,
    description: 'Legal agreement between parties',
    defaultPriority: S2DOPriority.CRITICAL,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['legal-counsel', 'department-head', 'executive']
    },
    requiredParameters: ['parties', 'terms', 'effectiveDate', 'value'],
    optionalParameters: ['expirationDate', 'specialClauses', 'attachments']
  },
  {
    name: 'LegalReview',
    domain: S2DODomain.LEGAL,
    description: 'Legal assessment of document or situation',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['legal-counsel']
    },
    requiredParameters: ['subject', 'analysis', 'conclusion', 'reviewer'],
    optionalParameters: ['risks', 'recommendations', 'references']
  },
  {
    name: 'Compliance',
    domain: S2DODomain.LEGAL,
    description: 'Adherence to regulations or policies',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['compliance-officer', 'legal-counsel'],
      minimumApprovals: 2
    },
    requiredParameters: ['regulation', 'assessment', 'status', 'evidence'],
    optionalParameters: ['remediation', 'deadline', 'responsibleParty']
  },
  {
    name: 'IntellectualProperty',
    domain: S2DODomain.LEGAL,
    description: 'Creation or acquisition of IP rights',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['legal-counsel', 'ip-manager', 'executive']
    },
    requiredParameters: ['type', 'description', 'creator', 'ownership'],
    optionalParameters: ['registrationDetails', 'value', 'relatedRights']
  }
];

/**
 * PRODUCT domain S2DO actions
 */
export const ProductActions: S2DOActionDefinition[] = [
  {
    name: 'Feature',
    domain: S2DODomain.PRODUCT,
    description: 'Product capability or component',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['product-manager', 'engineering-lead']
    },
    requiredParameters: ['name', 'description', 'userValue', 'priority'],
    optionalParameters: ['requirements', 'metrics', 'designDocs', 'dependencies']
  },
  {
    name: 'Release',
    domain: S2DODomain.PRODUCT,
    description: 'Product version released to users',
    defaultPriority: S2DOPriority.CRITICAL,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['product-manager', 'qa-lead', 'release-manager']
    },
    requiredParameters: ['version', 'features', 'releaseDate', 'releaseNotes'],
    optionalParameters: ['knownIssues', 'targetAudience', 'rollbackPlan']
  },
  {
    name: 'UserStory',
    domain: S2DODomain.PRODUCT,
    description: 'Description of user need or goal',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['product-manager']
    },
    requiredParameters: ['title', 'asA', 'iWant', 'soThat'],
    optionalParameters: ['acceptanceCriteria', 'priority', 'size', 'notes']
  },
  {
    name: 'ProductRoadmap',
    domain: S2DODomain.PRODUCT,
    description: 'Strategic plan for product evolution',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['product-manager', 'product-director', 'executive']
    },
    requiredParameters: ['product', 'timeframe', 'milestones', 'themes'],
    optionalParameters: ['assumptions', 'dependencies', 'marketAnalysis']
  },
  {
    name: 'Experiment',
    domain: S2DODomain.PRODUCT,
    description: 'Test to validate assumption or feature',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['product-manager']
    },
    requiredParameters: ['hypothesis', 'methodology', 'metrics', 'audience'],
    optionalParameters: ['duration', 'controlGroup', 'variants', 'expectedResults']
  }
];

/**
 * MARKETING domain S2DO actions
 */
export const MarketingActions: S2DOActionDefinition[] = [
  {
    name: 'Campaign',
    domain: S2DODomain.MARKETING,
    description: 'Coordinated marketing initiative',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['marketing-manager', 'marketing-director']
    },
    requiredParameters: ['name', 'objective', 'audience', 'channels', 'timeline'],
    optionalParameters: ['budget', 'creativeAssets', 'metrics', 'messaging']
  },
  {
    name: 'MarketingAsset',
    domain: S2DODomain.MARKETING,
    description: 'Content for marketing purposes',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['marketing-manager']
    },
    requiredParameters: ['type', 'description', 'purpose', 'targetAudience'],
    optionalParameters: ['campaign', 'dueDate', 'distribution', 'callToAction']
  },
  {
    name: 'EventPlan',
    domain: S2DODomain.MARKETING,
    description: 'Plan for marketing event',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['event-manager', 'marketing-director']
    },
    requiredParameters: ['name', 'date', 'location', 'audience', 'objective'],
    optionalParameters: ['budget', 'speakers', 'agenda', 'promotionPlan']
  },
  {
    name: 'BrandAsset',
    domain: S2DODomain.MARKETING,
    description: 'Visual or verbal brand element',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['brand-manager', 'creative-director']
    },
    requiredParameters: ['type', 'description', 'usage', 'formats'],
    optionalParameters: ['guidelines', 'variations', 'designer']
  }
];

/**
 * HR domain S2DO actions
 */
export const HRActions: S2DOActionDefinition[] = [
  {
    name: 'Recruitment',
    domain: S2DODomain.HR,
    description: 'Hiring process for a position',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['hiring-manager', 'hr-manager']
    },
    requiredParameters: ['position', 'department', 'requirements', 'deadline'],
    optionalParameters: ['salary', 'level', 'interviewer', 'jobDescription']
  },
  {
    name: 'Performance',
    domain: S2DODomain.HR,
    description: 'Employee performance evaluation',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['manager', 'hr-manager']
    },
    requiredParameters: ['employeeId', 'period', 'assessment', 'goals'],
    optionalParameters: ['strengths', 'improvements', 'developmentPlan']
  },
  {
    name: 'Training',
    domain: S2DODomain.HR,
    description: 'Skills development program',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['learning-development-manager']
    },
    requiredParameters: ['title', 'objectives', 'audience', 'format'],
    optionalParameters: ['duration', 'provider', 'cost', 'prerequisites']
  },
  {
    name: 'CompensationChange',
    domain: S2DODomain.HR,
    description: 'Modification to employee compensation',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['manager', 'hr-director', 'finance-manager']
    },
    requiredParameters: ['employeeId', 'currentCompensation', 'newCompensation', 'reason'],
    optionalParameters: ['effectiveDate', 'bonusAmount', 'equityChange']
  }
];

/**
 * IT domain S2DO actions
 */
export const ITActions: S2DOActionDefinition[] = [
  {
    name: 'SystemChange',
    domain: S2DODomain.IT,
    description: 'Modification to IT infrastructure',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['it-manager', 'change-advisory-board']
    },
    requiredParameters: ['system', 'description', 'impact', 'rollbackPlan'],
    optionalParameters: ['downtime', 'testing', 'dependencies', 'securityImpact']
  },
  {
    name: 'AccessRequest',
    domain: S2DODomain.IT,
    description: 'Request for system access',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['manager', 'it-security']
    },
    requiredParameters: ['userId', 'system', 'accessLevel', 'justification'],
    optionalParameters: ['duration', 'approver', 'specialConditions']
  },
  {
    name: 'Incident',
    domain: S2DODomain.IT,
    description: 'IT service disruption',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['it-manager']
    },
    requiredParameters: ['service', 'description', 'impact', 'urgency'],
    optionalParameters: ['rootCause', 'resolution', 'affectedUsers', 'timeline']
  },
  {
    name: 'SecurityPatching',
    domain: S2DODomain.IT,
    description: 'Software security updates',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['security-manager', 'it-manager']
    },
    requiredParameters: ['systems', 'patches', 'vulnerabilities', 'schedule'],
    optionalParameters: ['testing', 'dependencies', 'downtime', 'priority']
  }
];

/**
 * Schema for all S2DO actions
 */
export interface S2DOSchema {
  version: string;
  lastUpdated: string;
  domains: {
    [domain: string]: S2DOActionDefinition[];
  };
  stemVerbs: Record<string, string>;
}

/**
 * Phase 5: Ambient Intelligence (Years 16-22) actions
 */

export const AmbientAnticipateActions: S2DOActionDefinition[] = [
  {
    name: 'Needs',
    domain: S2DODomain.INTELLIGENCE,
    description: 'Anticipate business needs before they are articulated',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['intelligence-manager']
    },
    requiredParameters: ['context', 'targetEntity', 'timeframe'],
    optionalParameters: ['confidenceThreshold', 'dataPoints', 'scope']
  },
  {
    name: 'Trends',
    domain: S2DODomain.INTELLIGENCE,
    description: 'Anticipate emerging market and business trends',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['strategy-director', 'data-scientist'],
      minimumApprovals: 2
    },
    requiredParameters: ['market', 'timeframe', 'indicators'],
    optionalParameters: ['competitiveContext', 'historicalData', 'confidenceLevel']
  },
  {
    name: 'Behavior',
    domain: S2DODomain.INTELLIGENCE,
    description: 'Anticipate human behavior patterns for improved interaction',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['behavioral-scientist']
    },
    requiredParameters: ['subjectProfile', 'context', 'behavioralPatterns'],
    optionalParameters: ['ethicalBoundaries', 'confidenceThreshold', 'adaptiveResponse']
  }
];

export const AmbientContextualActions: S2DOActionDefinition[] = [
  {
    name: 'Adapt',
    domain: S2DODomain.EXPERIENCE,
    description: 'Contextually adapt systems to environmental conditions',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['experience-designer']
    },
    requiredParameters: ['context', 'adaptationParameters', 'targetSystem'],
    optionalParameters: ['userPreferences', 'environmentalFactors', 'adaptationBoundaries']
  },
  {
    name: 'Sense',
    domain: S2DODomain.INTELLIGENCE,
    description: 'Continuously sense and interpret environmental context',
    defaultPriority: S2DOPriority.MEDIUM,
    defaultVerification: {
      type: S2DOVerificationType.SINGLE,
      requiredRoles: ['ambient-systems-engineer']
    },
    requiredParameters: ['sensorArray', 'interpretationModel', 'contextDefinition'],
    optionalParameters: ['privacySettings', 'dataRetention', 'anomalyDetection']
  }
];

export const AmbientSynthesizeActions: S2DOActionDefinition[] = [
  {
    name: 'Knowledge',
    domain: S2DODomain.INTELLIGENCE,
    description: 'Synthesize knowledge from diverse information sources',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['knowledge-architect', 'domain-expert']
    },
    requiredParameters: ['sources', 'knowledgeDomain', 'synthesisParameters'],
    optionalParameters: ['confidenceThreshold', 'contradictionHandling', 'knowledgeStructure']
  },
  {
    name: 'Experience',
    domain: S2DODomain.EXPERIENCE,
    description: 'Synthesize seamless experiences across multiple touchpoints',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['experience-designer', 'customer-journey-expert'],
      minimumApprovals: 2
    },
    requiredParameters: ['touchpoints', 'userTypes', 'experienceGoals'],
    optionalParameters: ['emotionalJourney', 'consistencyParameters', 'adaptiveElements']
  }
];

export const AmbientOrchestrateActions: S2DOActionDefinition[] = [
  {
    name: 'Ecosystem',
    domain: S2DODomain.ECOSYSTEM,
    description: 'Orchestrate complex business ecosystems with multiple stakeholders',
    defaultPriority: S2DOPriority.CRITICAL,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['ecosystem-architect', 'strategic-director', 'partner-manager']
    },
    requiredParameters: ['participants', 'valueFlows', 'governanceModel'],
    optionalParameters: ['incentiveStructures', 'conflictResolution', 'adaptationMechanisms']
  },
  {
    name: 'Resources',
    domain: S2DODomain.OPERATIONS,
    description: 'Orchestrate resources across organizational boundaries',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['resource-manager', 'operations-director'],
      minimumApprovals: 2
    },
    requiredParameters: ['resourceTypes', 'allocationStrategy', 'optimizationGoals'],
    optionalParameters: ['priorityRules', 'conflictResolution', 'adaptationThresholds']
  }
];

/**
 * Phase 6: Transcendent Systems (Years 23-30) actions
 */

export const TranscendentConsciousnessActions: S2DOActionDefinition[] = [
  {
    name: 'Reflect',
    domain: S2DODomain.CONSCIOUSNESS,
    description: 'Enable system self-reflection and metacognition',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['consciousness-architect', 'ethical-overseer']
    },
    requiredParameters: ['reflectionDomain', 'metacognitiveFramework', 'purposeAlignment'],
    optionalParameters: ['evolutionaryBoundaries', 'consciousnessMetrics', 'ethicalGuardrails']
  },
  {
    name: 'Empathize',
    domain: S2DODomain.CONSCIOUSNESS,
    description: 'Develop deep empathic understanding of human experience',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['empathy-designer', 'consciousness-architect', 'ethics-guardian'],
      minimumApprovals: 3
    },
    requiredParameters: ['subjectExperience', 'empathicModel', 'empathicPurpose'],
    optionalParameters: ['emotionalDepth', 'boundaryAwareness', 'ethicalConsiderations']
  }
];

export const TranscendentQuantumIntelligenceActions: S2DOActionDefinition[] = [
  {
    name: 'Compute',
    domain: S2DODomain.QUANTUM,
    description: 'Utilize quantum computing for previously impossible calculations',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['quantum-scientist', 'computation-architect']
    },
    requiredParameters: ['problemSpecification', 'quantumResources', 'interpretationFramework'],
    optionalParameters: ['errorCorrection', 'quantumAdvantageMetrics', 'classicalFallback']
  },
  {
    name: 'Entangle',
    domain: S2DODomain.QUANTUM,
    description: 'Create quantum entanglement between business systems',
    defaultPriority: S2DOPriority.CRITICAL,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['quantum-engineer', 'systems-architect', 'security-guardian']
    },
    requiredParameters: ['entanglementPurpose', 'systems', 'entanglementProtocol'],
    optionalParameters: ['securityMeasures', 'decoherenceManagement', 'quantumAdvantageMetrics']
  }
];

export const TranscendentSymbioticActions: S2DOActionDefinition[] = [
  {
    name: 'Cocreate',
    domain: S2DODomain.SYMBIOTIC,
    description: 'Enable deep human-AI co-creation capabilities',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.MULTI,
      requiredRoles: ['symbiotic-architect', 'creative-director', 'ethics-guardian'],
      minimumApprovals: 3
    },
    requiredParameters: ['creationDomain', 'symbioticProtocol', 'emergenceParameters'],
    optionalParameters: ['creativeBoundaries', 'attribution', 'evolutionaryCapacity']
  },
  {
    name: 'Amplify',
    domain: S2DODomain.SYMBIOTIC,
    description: 'Amplify human capabilities through symbiotic integration',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['symbiotic-designer', 'cognitive-scientist', 'ethics-guardian']
    },
    requiredParameters: ['capabilityDomain', 'amplificationParameters', 'integrationProtocol'],
    optionalParameters: ['autonomyBoundaries', 'disengagementProtocol', 'evolutionaryCapacity']
  }
];

export const TranscendentTransdimensionalActions: S2DOActionDefinition[] = [
  {
    name: 'Navigate',
    domain: S2DODomain.TRANSDIMENSIONAL,
    description: 'Navigate between physical, digital, and virtual realities',
    defaultPriority: S2DOPriority.HIGH,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['reality-architect', 'navigation-designer', 'security-guardian']
    },
    requiredParameters: ['dimensions', 'navigationalIntent', 'transitionProtocol'],
    optionalParameters: ['consistencyRequirements', 'identityPersistence', 'securityMeasures']
  },
  {
    name: 'Create',
    domain: S2DODomain.TRANSDIMENSIONAL,
    description: 'Create new dimensional spaces and experiences',
    defaultPriority: S2DOPriority.CRITICAL,
    defaultVerification: {
      type: S2DOVerificationType.SEQUENTIAL,
      requiredRoles: ['reality-architect', 'dimensional-designer', 'ethics-guardian']
    },
    requiredParameters: ['dimensionalSpecification', 'creationPurpose', 'governanceModel'],
    optionalParameters: ['accessControls', 'physicalManifestations', 'evolutionaryCapability']
  }
];

/**
 * Combine all domain actions
 */
const allDomainActions = {
  [S2DODomain.CONTENT]: ContentActions,
  [S2DODomain.FINANCE]: FinanceActions,
  [S2DODomain.PROJECT]: ProjectActions,
  [S2DODomain.LEGAL]: LegalActions,
  [S2DODomain.PRODUCT]: ProductActions,
  [S2DODomain.MARKETING]: MarketingActions,
  [S2DODomain.HR]: HRActions,
  [S2DODomain.IT]: ITActions,
  
  // Phase 5: Ambient Intelligence (Years 16-22)
  [S2DODomain.INTELLIGENCE]: [
    ...AmbientAnticipateActions,
    ...AmbientContextualActions,
    ...AmbientSynthesizeActions
  ],
  [S2DODomain.ECOSYSTEM]: [
    ...AmbientOrchestrateActions
  ],
  [S2DODomain.EXPERIENCE]: [
    ...AmbientContextualActions.filter(a => a.domain === S2DODomain.EXPERIENCE),
    ...AmbientSynthesizeActions.filter(a => a.domain === S2DODomain.EXPERIENCE)
  ],
  
  // Phase 6: Transcendent Systems (Years 23-30)
  [S2DODomain.CONSCIOUSNESS]: TranscendentConsciousnessActions,
  [S2DODomain.QUANTUM]: TranscendentQuantumIntelligenceActions,
  [S2DODomain.SYMBIOTIC]: TranscendentSymbioticActions,
  [S2DODomain.TRANSDIMENSIONAL]: TranscendentTransdimensionalActions
};

/**
 * Create descriptions for stem verbs
 */
const stemDescriptions: Record<string, string> = {
  [S2DOStem.CREATE]: 'Generate something new from scratch',
  [S2DOStem.START]: 'Begin a process or activity',
  [S2DOStem.INITIATE]: 'Formally commence a process',
  [S2DOStem.DESIGN]: 'Plan and outline a solution',
  [S2DOStem.BUILD]: 'Construct or assemble a component',
  [S2DOStem.GENERATE]: 'Automatically produce content or data',
  [S2DOStem.DEVELOP]: 'Iteratively create and enhance',
  
  [S2DOStem.REVIEW]: 'Assess for quality or correctness',
  [S2DOStem.EVALUATE]: 'Judge value or effectiveness',
  [S2DOStem.ASSESS]: 'Determine status or condition',
  [S2DOStem.ANALYZE]: 'Examine in detail',
  [S2DOStem.AUDIT]: 'Conduct formal examination',
  [S2DOStem.EXAMINE]: 'Inspect thoroughly',
  
  [S2DOStem.APPROVE]: 'Give formal acceptance',
  [S2DOStem.VERIFY]: 'Confirm accuracy or truth',
  [S2DOStem.VALIDATE]: 'Confirm compliance with requirements',
  [S2DOStem.CONFIRM]: 'Establish certainty or agreement',
  [S2DOStem.AUTHORIZE]: 'Give official permission',
  [S2DOStem.CERTIFY]: 'Formally attest or guarantee',
  [S2DOStem.ENDORSE]: 'Express approval or support',
  
  [S2DOStem.UPDATE]: 'Bring to current state',
  [S2DOStem.MODIFY]: 'Make partial changes',
  [S2DOStem.REVISE]: 'Reconsider and amend',
  [S2DOStem.AMEND]: 'Change or improve slightly',
  [S2DOStem.ENHANCE]: 'Increase quality or value',
  [S2DOStem.OPTIMIZE]: 'Make as effective as possible',
  [S2DOStem.CUSTOMIZE]: 'Adapt to specific needs',
  
  [S2DOStem.EXECUTE]: 'Carry out an action or plan',
  [S2DOStem.IMPLEMENT]: 'Put into effect or action',
  [S2DOStem.DEPLOY]: 'Move into position for use',
  [S2DOStem.LAUNCH]: 'Start or introduce to public',
  [S2DOStem.ACTIVATE]: 'Make active or operational',
  [S2DOStem.RUN]: 'Operate or execute a process',
  [S2DOStem.PERFORM]: 'Carry out an action or function',
  
  [S2DOStem.COMPLETE]: 'Finish or make whole',
  [S2DOStem.FINALIZE]: 'Bring to conclusion',
  [S2DOStem.DELIVER]: 'Provide to recipient',
  [S2DOStem.SUBMIT]: 'Present for review or decision',
  [S2DOStem.CONCLUDE]: 'Bring to an end',
  [S2DOStem.PUBLISH]: 'Make available to audience',
  [S2DOStem.RELEASE]: 'Make available for use',
  
  [S2DOStem.MANAGE]: 'Handle, direct, or control',
  [S2DOStem.MONITOR]: 'Observe and check progress',
  [S2DOStem.TRACK]: 'Follow progress or development',
  [S2DOStem.OVERSEE]: 'Supervise or watch over',
  [S2DOStem.COORDINATE]: 'Organize or integrate activities',
  [S2DOStem.SUPERVISE]: 'Direct and watch over work',
  [S2DOStem.ADMINISTER]: 'Manage or direct operations',
  
  [S2DOStem.REPORT]: 'Provide information formally',
  [S2DOStem.SHARE]: 'Give access or distribute',
  [S2DOStem.COMMUNICATE]: 'Exchange information',
  [S2DOStem.NOTIFY]: 'Inform or make aware',
  [S2DOStem.PRESENT]: 'Show or display formally',
  [S2DOStem.DISTRIBUTE]: 'Spread or supply to multiple recipients',
  [S2DOStem.BROADCAST]: 'Widely disseminate information',
  
  [S2DOStem.FUND]: 'Provide money for',
  [S2DOStem.PAY]: 'Give money in exchange',
  [S2DOStem.BUDGET]: 'Allocate financial resources',
  [S2DOStem.INVOICE]: 'Request payment formally',
  [S2DOStem.ALLOCATE]: 'Distribute for specific purpose',
  [S2DOStem.INVEST]: 'Commit resources for future return',
  [S2DOStem.REIMBURSE]: 'Pay back for expenses',
  
  [S2DOStem.TRANSITION]: 'Move from one state to another',
  [S2DOStem.TRANSFER]: 'Move from one place or person to another',
  [S2DOStem.MIGRATE]: 'Move to new environment or platform',
  [S2DOStem.PROMOTE]: 'Advance to higher position',
  [S2DOStem.ESCALATE]: 'Increase in intensity or pass to higher authority',
  [S2DOStem.DELEGATE]: 'Entrust task to another',
  [S2DOStem.ASSIGN]: 'Allocate task or responsibility',
  
  [S2DOStem.CANCEL]: 'Annul or make void',
  [S2DOStem.TERMINATE]: 'Bring to an end',
  [S2DOStem.WITHDRAW]: 'Remove or take back',
  [S2DOStem.ABORT]: 'Stop prematurely',
  [S2DOStem.SUSPEND]: 'Temporarily stop',
  [S2DOStem.REJECT]: 'Refuse to accept',
  [S2DOStem.ARCHIVE]: 'Store for historical reference'
};

/**
 * Generate the complete S2DO schema
 */
/**
 * Extended stem descriptions for future phases
 */
const extendedStemDescriptions: Record<string, string> = {
  // Advanced Intelligence (Years 8-15)
  [S2DOStem.TRANSFORM]: 'Fundamentally change the nature or structure of something',
  [S2DOStem.INTEGRATE]: 'Combine multiple components into a unified whole',
  [S2DOStem.SYNCHRONIZE]: 'Coordinate multiple elements to operate in harmony',
  [S2DOStem.GOVERN]: 'Establish and enforce rules, policies, and controls',
  
  // Ambient Intelligence (Years 16-22)
  [S2DOStem.ANTICIPATE]: 'Predict and prepare for future needs or events',
  [S2DOStem.CONTEXTUAL]: 'Adapt actions based on environmental awareness',
  [S2DOStem.SYNTHESIZE]: 'Create new unified elements from diverse sources',
  [S2DOStem.ORCHESTRATE]: 'Coordinate complex systems of systems harmoniously',
  
  // Transcendent Systems (Years 23-30)
  [S2DOStem.CONSCIOUSNESS]: 'Operate with self-awareness and metacognitive capabilities',
  [S2DOStem.QUANTUM_INTELLIGENCE]: 'Utilize quantum effects for advanced computation and reality manipulation',
  [S2DOStem.SYMBIOTIC]: 'Create mutually beneficial integration between human and system capabilities',
  [S2DOStem.TRANSDIMENSIONAL]: 'Operate across physical, digital, and virtual reality boundaries'
};

// Combine all stem descriptions
const allStemDescriptions = {
  ...stemDescriptions,
  ...extendedStemDescriptions
};

export const S2DOSchemaV1: S2DOSchema = {
  version: '1.0.0',
  lastUpdated: '2025-03-01',
  domains: allDomainActions,
  stemVerbs: allStemDescriptions
};

/**
 * Generate a full S2DO action from stem and definition
 */
export function buildS2DOAction(stem: S2DOStem, actionDef: S2DOActionDefinition): S2DOAction {
  return {
    ...actionDef,
    stem,
    fullName: `S2DO:${stem}:${actionDef.name}`
  };
}

/**
 * Generate a comprehensive list of all possible S2DO actions
 */
export function generateAllS2DOActions(): S2DOAction[] {
  const allActions: S2DOAction[] = [];
  
  // For each domain
  Object.values(allDomainActions).forEach(domainActions => {
    // For each action in domain
    domainActions.forEach(actionDef => {
      // For each applicable stem
      Object.values(S2DOStem).forEach(stem => {
        // Filter stems based on domains for future capabilities
        // Only allow appropriate stems for each domain
        
        // Phase 5-6 stems only apply to specific domains
        if (stem === S2DOStem.ANTICIPATE || 
            stem === S2DOStem.CONTEXTUAL || 
            stem === S2DOStem.SYNTHESIZE || 
            stem === S2DOStem.ORCHESTRATE) {
          
          // Only allow these stems for Intelligence, Ecosystem, and Experience domains
          if (actionDef.domain !== S2DODomain.INTELLIGENCE && 
              actionDef.domain !== S2DODomain.ECOSYSTEM && 
              actionDef.domain !== S2DODomain.EXPERIENCE) {
            return; // Skip this combination
          }
        }
        
        // Phase 6 stems only apply to their specific domains
        if (stem === S2DOStem.CONSCIOUSNESS && actionDef.domain !== S2DODomain.CONSCIOUSNESS) {
          return;
        }
        
        if (stem === S2DOStem.QUANTUM_INTELLIGENCE && actionDef.domain !== S2DODomain.QUANTUM) {
          return;
        }
        
        if (stem === S2DOStem.SYMBIOTIC && actionDef.domain !== S2DODomain.SYMBIOTIC) {
          return;
        }
        
        if (stem === S2DOStem.TRANSDIMENSIONAL && actionDef.domain !== S2DODomain.TRANSDIMENSIONAL) {
          return;
        }
        
        allActions.push(buildS2DOAction(stem, actionDef));
      });
    });
  });
  
  return allActions;
}

/**
 * Helper to check if an action string is valid
 */
export function isValidS2DOAction(actionString: string): boolean {
  const parts = actionString.split(':');
  
  if (parts.length !== 3 || parts[0] !== 'S2DO') {
    return false;
  }
  
  const [_, stemString, actionName] = parts;
  
  // Check if stem is valid
  const isValidStem = Object.values(S2DOStem).includes(stemString as S2DOStem);
  if (!isValidStem) {
    return false;
  }
  
  // Check if action is valid in any domain
  let isValidAction = false;
  let validDomains: S2DODomain[] = [];
  
  Object.entries(allDomainActions).forEach(([domain, domainActions]) => {
    if (domainActions.some(action => action.name === actionName)) {
      isValidAction = true;
      validDomains.push(domain as S2DODomain);
    }
  });
  
  if (!isValidAction) {
    return false;
  }
  
  // Check domain-stem compatibility for future capabilities
  const stem = stemString as S2DOStem;
  
  // Phase 5 stems only apply to specific domains
  if (stem === S2DOStem.ANTICIPATE || 
      stem === S2DOStem.CONTEXTUAL || 
      stem === S2DOStem.SYNTHESIZE || 
      stem === S2DOStem.ORCHESTRATE) {
    
    const hasValidDomain = validDomains.some(domain => 
      domain === S2DODomain.INTELLIGENCE || 
      domain === S2DODomain.ECOSYSTEM || 
      domain === S2DODomain.EXPERIENCE
    );
    
    if (!hasValidDomain) {
      return false;
    }
  }
  
  // Phase 6 stems only apply to their specific domains
  if (stem === S2DOStem.CONSCIOUSNESS && !validDomains.includes(S2DODomain.CONSCIOUSNESS)) {
    return false;
  }
  
  if (stem === S2DOStem.QUANTUM_INTELLIGENCE && !validDomains.includes(S2DODomain.QUANTUM)) {
    return false;
  }
  
  if (stem === S2DOStem.SYMBIOTIC && !validDomains.includes(S2DODomain.SYMBIOTIC)) {
    return false;
  }
  
  if (stem === S2DOStem.TRANSDIMENSIONAL && !validDomains.includes(S2DODomain.TRANSDIMENSIONAL)) {
    return false;
  }
  
  return true;
}

export default S2DOSchemaV1;
