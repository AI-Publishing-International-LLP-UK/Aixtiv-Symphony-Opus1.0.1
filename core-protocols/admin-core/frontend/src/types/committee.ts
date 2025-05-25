import type { SecurityLevel } from './security';

export interface CommitteeStructure {
    id: string;
    name: string;
    type: CommitteeType;
    members: CommitteeMember[];
    roles: CommitteeRole[];
    permissions: CommitteePermission[];
    votingRules: VotingRules;
    securityLevel: SecurityLevel;
}

export interface CommitteeMember {
    id: string;
    name: string;
    role: CommitteeRole;
    joinedAt: Date;
    status: MembershipStatus;
    votingPower: number;
}

export enum CommitteeType {
    EXECUTIVE = 'executive',
    ADVISORY = 'advisory',
    TECHNICAL = 'technical',
    GOVERNANCE = 'governance',
    AUDIT = 'audit'
}

export interface CommitteeRole {
    id: string;
    name: string;
    permissions: CommitteePermission[];
    votingWeight: number;
    description: string;
}

export enum CommitteePermission {
    VIEW = 'view',
    PROPOSE = 'propose',
    VOTE = 'vote',
    EXECUTE = 'execute',
    MANAGE_MEMBERS = 'manage_members',
    MANAGE_ROLES = 'manage_roles',
    MANAGE_RULES = 'manage_rules'
}

export enum MembershipStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    SUSPENDED = 'suspended',
    PENDING = 'pending'
}

export interface VotingRules {
    quorum: number;
    threshold: number;
    votingPeriod: number;
    votingDelay: number;
    executionDelay: number;
    vetoThreshold?: number;
}

export interface CommitteeProposal {
    id: string;
    title: string;
    description: string;
    proposer: CommitteeMember;
    status: ProposalStatus;
    votes: Vote[];
    createdAt: Date;
    expiresAt: Date;
    executedAt?: Date;
}

export enum ProposalStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    PASSED = 'passed',
    REJECTED = 'rejected',
    EXECUTED = 'executed',
    EXPIRED = 'expired',
    VETOED = 'vetoed'
}

export interface Vote {
    memberId: string;
    decision: VoteDecision;
    weight: number;
    timestamp: Date;
    reason?: string;
}

export enum VoteDecision {
    YES = 'yes',
    NO = 'no',
    ABSTAIN = 'abstain',
    VETO = 'veto'
}

export interface CommitteeConfig {
    name: string;
    members: string[];
    roles: {
        chair: string;
        viceChair?: string;
        secretary?: string;
        members: string[];
    };
    meetingFrequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
}

export interface GovernanceFramework {
    policies: string[];
    procedures: string[];
    guidelines: string[];
    decisionMakingProcess: string;
    votingRules: {
        quorum: number;
        majorityRequired: number;
    };
}

export interface RightsPrivilegesFocus {
    scope: string[];
    responsibilities: string[];
    authorities: string[];
    limitations: string[];
}

export interface OperationalProcedures {
    meetingProtocols: string[];
    documentationRequirements: string[];
    reportingStructure: string[];
    escalationPaths: string[];
    reviewCycles: {
        type: string;
        frequency: string;
        participants: string[];
    }[];
}
