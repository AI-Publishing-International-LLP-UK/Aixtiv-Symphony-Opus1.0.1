# Firestore Database Integration for S2DO Governance

## Overview

The S2DO Governance system uses Firebase Firestore as its primary database for storing action records, user profiles, verification states, and governance rules. This document details the integration architecture, data models, and implementation patterns used to ensure seamless operation between the S2DO system and Firestore.

## Data Architecture

### Collection Structure

The Firestore database is organized into the following collections:

```
firestore/
├── users/                     # User profiles and metadata
├── actions/                   # S2DO action records
├── verifications/             # Verification records
├── governance/                # Governance rules and policies
│   ├── user-types/            # User type-specific governance rules  
│   └── domain-rules/          # Domain-specific governance rules
├── audit-logs/                # Complete audit trail
└── system-config/             # System configuration
```

### User Types and Governance

A key component of the S2DO system is the differentiated governance based on user types. The following user types are defined in Firestore:

| User Type | Description | Governance Level |
|-----------|-------------|-----------------|
| Individual | Personal users | Standard |
| Professional | Professional practitioners | Enhanced |
| Student | Educational users | Moderated |
| Enterprise | Business entities | Custom |
| Research | Research institutions | Advanced |
| Government | Government agencies | Strict |

Each user type has specific governance rules applied to their S2DO actions, stored in the `governance/user-types/{userType}` documents.

## Data Models

### User Model

```typescript
// src/firestore/models/user-model.ts

export interface UserProfile {
  id: string;                    // Unique user identifier
  displayName: string;           // User's display name
  email: string;                 // User's email address
  userType: UserType;            // User type (Individual, Professional, etc.)
  walletAddress?: string;        // Blockchain wallet address
  governanceLevel: GovernanceLevel; // Level of governance applied
  verificationTier: VerificationTier; // Required verification level
  createdAt: Timestamp;          // Account creation timestamp
  updatedAt: Timestamp;          // Last update timestamp
  settings: {                    // User settings
    defaultVerificationMethod: VerificationMethod;
    notificationPreferences: NotificationPreferences;
    privacySettings: PrivacySettings;
  };
  metadata: Record<string, any>; // Additional metadata
}

export enum UserType {
  INDIVIDUAL = 'individual',
  PROFESSIONAL = 'professional',
  STUDENT = 'student',
  ENTERPRISE = 'enterprise',
  RESEARCH = 'research',
  GOVERNMENT = 'government'
}

export enum GovernanceLevel {
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  MODERATED = 'moderated',
  CUSTOM = 'custom',
  ADVANCED = 'advanced',
  STRICT = 'strict'
}

export enum VerificationTier {
  BASIC = 'basic',           // Single-factor verification
  STANDARD = 'standard',     // Two-factor verification
  ENHANCED = 'enhanced',     // Multi-factor verification
  STRICT = 'strict'          // Strict multi-factor with approval chains
}
```

### Action Model

```typescript
// src/firestore/models/action-model.ts

export interface S2DOAction {
  id: string;                    // Unique action identifier
  actionType: string;            // S2DO action type (e.g., "S2DO:Create:Document")
  userId: string;                // User who initiated the action
  userType: UserType;            // Type of the user
  timestamp: Timestamp;          // When the action was initiated
  status: ActionStatus;          // Current status of the action
  stem: StemVerb;                // Stem verb component
  domain: S2DODomain;            // Domain of the action
  parameters: Record<string, any>; // Action-specific parameters
  metadata: {                    // Action metadata
    priority: S2DOPriority;      // Priority level
    tags: string[];              // Categorization tags
    sourceIp: string;            // Source IP address
    userAgent: string;           // User agent information
    deviceId?: string;           // Device identifier if available
  };
  verification: {                // Verification requirements
    type: S2DOVerificationType;  // Type of verification required
    requiredRoles?: string[];    // Roles required for verification
    minimumApprovals?: number;   // Minimum number of approvals needed
  };
  blockchain?: {                 // Blockchain record (if verified)
    transactionHash?: string;    // Blockchain transaction hash
    timestamp?: number;          // Blockchain timestamp
    blockNumber?: number;        // Block number where transaction was recorded
  };
}

export enum ActionStatus {
  PENDING = 'pending',         // Awaiting verification
  VERIFIED = 'verified',       // Successfully verified
  REJECTED = 'rejected',       // Verification rejected
  CANCELLED = 'cancelled',     // Action cancelled
  EXPIRED = 'expired'          // Verification time expired
}
```

### Governance Rule Model

```typescript
// src/firestore/models/governance-model.ts

export interface GovernanceRule {
  id: string;                    // Rule identifier
  name: string;                  // Human-readable name
  description: string;           // Rule description
  appliesTo: {                   // What the rule applies to
    userTypes: UserType[];       // User types subject to this rule
    actions: string[];           // Action patterns this rule applies to
    domains: S2DODomain[];       // Domains this rule applies to
  };
  conditions: RuleCondition[];   // Conditions that trigger the rule
  effects: RuleEffect[];         // Effects of the rule when triggered
  priority: number;              // Rule priority (higher numbers = higher priority)
  isActive: boolean;             // Whether the rule is active
  createdAt: Timestamp;          // Rule creation timestamp
  updatedAt: Timestamp;          // Rule update timestamp
}

export interface RuleCondition {
  field: string;                 // Field to evaluate
  operator: ConditionOperator;   // Comparison operator
  value: any;                    // Value to compare against
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

export interface RuleEffect {
  type: EffectType;              // Type of effect
  parameters: Record<string, any>; // Effect parameters
}

export enum EffectType {
  REQUIRE_APPROVAL = 'require_approval',
  REQUIRE_VERIFICATION = 'require_verification',
  BLOCK_ACTION = 'block_action',
  MODIFY_PARAMETERS = 'modify_parameters',
  TRIGGER_NOTIFICATION = 'trigger_notification',
  ESCALATE_TO_ROLE = 'escalate_to_role'
}
```

## User Type-Specific Governance Implementation

Each user type has specific governance rules and verification requirements. The following table outlines the key differences:

| User Type | Verification Requirements | Approval Chain | Action Limitations | Audit Level |
|-----------|---------------------------|---------------|-------------------|------------|
| Individual | Self-verification | None | Limited to personal actions | Basic |
| Professional | Identity verification | Manager approval for critical actions | Domain-specific limitations | Enhanced |
| Student | Institution verification | Instructor approval for submissions | Educational context only | Moderated |
| Enterprise | Multi-factor auth | Role-based approval chains | Based on enterprise policy | Comprehensive |
| Research | Institutional verification | Ethics committee for sensitive data | Research protocols | Advanced |
| Government | Strict identity verification | Multi-level approval chain | Compliance with regulations | Full |

### Implementation Example

Here's how user type governance is implemented in the Firestore integration:

```typescript
// src/firestore/services/governance-service.ts

export class GovernanceService {
  constructor(private db: FirebaseFirestore.Firestore) {}
  
  /**
   * Apply governance rules based on user type and action
   */
  async applyGovernanceRules(
    userId: string, 
    action: S2DOAction
  ): Promise<GovernanceResult> {
    // 1. Get user profile to determine user type
    const userSnapshot = await this.db.collection('users').doc(userId).get();
    if (!userSnapshot.exists) {
      throw new Error(`User ${userId} not found`);
    }
    
    const user = userSnapshot.data() as UserProfile;
    
    // 2. Get governance rules for this user type
    const userTypeRulesSnapshot = await this.db
      .collection('governance')
      .doc('user-types')
      .collection(user.userType)
      .where('isActive', '==', true)
      .get();
      
    const userTypeRules = userTypeRulesSnapshot.docs.map(
      doc => doc.data() as GovernanceRule
    );
    
    // 3. Get domain-specific rules
    const domainRulesSnapshot = await this.db
      .collection('governance')
      .doc('domain-rules')
      .collection(action.domain)
      .where('isActive', '==', true)
      .get();
      
    const domainRules = domainRulesSnapshot.docs.map(
      doc => doc.data() as GovernanceRule
    );
    
    // 4. Combine and apply rules
    const allRules = [...userTypeRules, ...domainRules]
      .sort((a, b) => b.priority - a.priority);
    
    const governanceEffects: RuleEffect[] = [];
    
    for (const rule of allRules) {
      if (this.ruleApplies(rule, user, action)) {
        governanceEffects.push(...rule.effects);
      }
    }
    
    // 5. Record governance decision
    await this.recordGovernanceDecision(userId, action.id, governanceEffects);
    
    return {
      actionId: action.id,
      userId,
      effects: governanceEffects,
      timestamp: Date.now()
    };
  }
  
  // Helper methods...
}
```

## Firestore Indexing Strategy

To ensure optimal performance, the following compound indexes are required:

```
actions (collection)
  - userId ASC, status ASC, timestamp DESC
  - domain ASC, status ASC, timestamp DESC
  - userType ASC, domain ASC, status ASC

verifications (collection)
  - actionId ASC, timestamp ASC
  - verifierId ASC, timestamp DESC

governance/user-types/{userType} (collection)
  - isActive ASC, priority DESC
  - domains ASC, isActive ASC, priority DESC
```

## Query Patterns

Common query patterns implemented in the Firestore service:

```typescript
// src/firestore/services/firestore-service.ts

export class FirestoreService {
  constructor(private db: FirebaseFirestore.Firestore) {}
  
  /**
   * Get pending actions for verification by a specific user
   */
  async getPendingActionsForVerifier(userId: string): Promise<S2DOAction[]> {
    const userSnapshot = await this.db.collection('users').doc(userId).get();
    const user = userSnapshot.data() as UserProfile;
    
    const actionsQuery = this.db.collection('actions')
      .where('status', '==', ActionStatus.PENDING)
      .where('verification.requiredRoles', 'array-contains-any', user.roles || [])
      .orderBy('metadata.priority', 'desc')
      .orderBy('timestamp', 'asc')
      .limit(100);
      
    const actionsSnapshot = await actionsQuery.get();
    
    return actionsSnapshot.docs.map(doc => doc.data() as S2DOAction);
  }
  
  /**
   * Get actions by user with pagination
   */
  async getUserActions(
    userId: string, 
    status?: ActionStatus,
    lastTimestamp?: Timestamp,
    limit: number = 50
  ): Promise<S2DOAction[]> {
    let query = this.db.collection('actions')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc');
      
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (lastTimestamp) {
      query = query.startAfter(lastTimestamp);
    }
    
    query = query.limit(limit);
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as S2DOAction);
  }
  
  // Additional query methods...
}
```

## Batch Operations

For high-throughput scenarios, batch operations are used:

```typescript
// src/firestore/utils/batch-operations.ts

export async function batchCreateActions(
  db: FirebaseFirestore.Firestore,
  actions: S2DOAction[]
): Promise<void> {
  const batches: FirebaseFirestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let operationCount = 0;
  
  for (const action of actions) {
    const docRef = db.collection('actions').doc(action.id);
    currentBatch.set(docRef, action);
    operationCount++;
    
    // Firestore allows max 500 operations per batch
    if (operationCount >= 499) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      operationCount = 0;
    }
  }
  
  if (operationCount > 0) {
    batches.push(currentBatch);
  }
  
  // Execute all batches in parallel
  await Promise.all(batches.map(batch => batch.commit()));
}
```

## Security Rules

Firestore security rules enforce access controls:

```
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles - users can read their own profile, admins can read all
    match /users/{userId} {
      allow read: if request.auth.uid == userId || 
                    hasRole('admin');
      allow write: if request.auth.uid == userId && 
                     unchangedFields(['userType', 'governanceLevel']) || 
                     hasRole('admin');
    }
    
    // Actions - users can read their own actions, verifiers can read pending actions
    match /actions/{actionId} {
      allow read: if request.auth.uid == resource.data.userId || 
                    canVerifyAction(actionId) ||
                    hasRole('admin');
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update: if canVerifyAction(actionId) || hasRole('admin');
    }
    
    // Verifications - only authorized verifiers can create
    match /verifications/{verificationId} {
      allow read: if isRelatedToAction(verificationId) || hasRole('admin');
      allow create: if canVerifyRelatedAction(verificationId);
    }
    
    // Governance rules - only admins can modify
    match /governance/{document=**} {
      allow read: if true;
      allow write: if hasRole('admin');
    }
    
    // Helper functions
    function hasRole(role) {
      return request.auth.token.roles[role] == true;
    }
    
    function canVerifyAction(actionId) {
      let action = get(/databases/$(database)/documents/actions/$(actionId)).data;
      return action.verification.requiredRoles.hasAny(request.auth.token.roles);
    }
    
    function isRelatedToAction(verificationId) {
      let verification = get(/databases/$(database)/documents/verifications/$(verificationId)).data;
      let action = get(/databases/$(database)/documents/actions/$(verification.actionId)).data;
      return request.auth.uid == action.userId;
    }
    
    function canVerifyRelatedAction(verificationId) {
      let verification = get(/databases/$(database)/documents/verifications/$(verificationId)).data;
      return canVerifyAction(verification.actionId);
    }
  }
}
```

## Performance Optimizations

The Firestore integration includes several performance optimizations:

1. **Data Denormalization**: Critical fields are denormalized to reduce query count
2. **Compound Queries**: Carefully designed to leverage Firestore indexes
3. **Document Size Limits**: Large data is split to respect Firestore's 1MB document limit
4. **Batch Operations**: Batch writes for high-throughput scenarios
5. **Query Limiting**: All queries include appropriate limits
6. **Caching Strategy**: Aggressive client-side caching for frequent access patterns

## Backup and Disaster Recovery

The S2DO system includes a comprehensive backup strategy for Firestore data:

1. **Scheduled Exports**: Daily exports to Google Cloud Storage
2. **Point-in-Time Recovery**: Ability to restore to specific timestamps
3. **Cross-region Redundancy**: Data replicated across multiple regions
4. **Change Tracking**: All changes recorded in audit logs with the ability to reconstruct state

## Setup and Configuration

See the [Firestore Setup Guide](firestore-setup.md) for detailed instructions on:

1. Creating and configuring the Firestore database
2. Setting up security rules
3. Creating necessary indexes
4. Configuring backup and disaster recovery

## Monitoring and Maintenance

The S2DO system includes comprehensive monitoring for the Firestore integration:

1. **Usage Metrics**: Tracking read/write operations and storage usage
2. **Performance Monitoring**: Tracking query latency and throughput
3. **Quota Alerts**: Notifications when approaching Firestore quotas
4. **Error Tracking**: Logging and alerting for Firestore errors

## Troubleshooting

Common Firestore integration issues and their solutions:

1. **Index Errors**: Ensure all compound indexes are created as specified
2. **Permission Errors**: Check security rules and user authentication
3. **Quota Limits**: Monitor usage and consider upgrading your Firebase plan
4. **Query Performance**: Review query patterns and indexes
