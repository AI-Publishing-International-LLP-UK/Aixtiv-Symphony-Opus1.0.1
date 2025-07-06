import type { BlockchainConfig } from './blockchain';
import type { SecurityConfig } from './integration';
import type { CommitteeStructure } from './committee';
import type { AnalyticsConfig } from './analytics';

export interface SystemConfig {
    version: string;
    environment: Environment;
    blockchain: BlockchainConfig;
    security: SecurityConfig;
    committee: CommitteeStructure;
    analytics: AnalyticsConfig;
    features: FeatureConfig;
    infrastructure: InfrastructureConfig;
}

export enum Environment {
    DEVELOPMENT = 'development',
    STAGING = 'staging',
    PRODUCTION = 'production',
    TEST = 'test'
}

export interface FeatureConfig {
    enabled: Record<string, boolean>;
    flags: FeatureFlag[];
    rollouts: RolloutConfig[];
}

export interface FeatureFlag {
    name: string;
    description: string;
    enabled: boolean;
    conditions: FeatureCondition[];
    expiration?: Date;
}

export interface FeatureCondition {
    type: ConditionType;
    value: any;
    operator: ConditionOperator;
}

export enum ConditionType {
    USER_ROLE = 'user_role',
    USER_GROUP = 'user_group',
    PERCENTAGE = 'percentage',
    DATE_RANGE = 'date_range',
    ENVIRONMENT = 'environment'
}

export enum ConditionOperator {
    EQUALS = 'equals',
    NOT_EQUALS = 'not_equals',
    GREATER_THAN = 'greater_than',
    LESS_THAN = 'less_than',
    IN = 'in',
    NOT_IN = 'not_in'
}

export interface RolloutConfig {
    featureName: string;
    strategy: RolloutStrategy;
    percentage: number;
    startDate: Date;
    endDate: Date;
    phases: RolloutPhase[];
}

export enum RolloutStrategy {
    GRADUAL = 'gradual',
    SCHEDULED = 'scheduled',
    TARGETED = 'targeted',
    IMMEDIATE = 'immediate'
}

export interface RolloutPhase {
    name: string;
    percentage: number;
    duration: number;
    targetGroups?: string[];
}

export interface InfrastructureConfig {
    database: DatabaseConfig;
    cache: CacheConfig;
    storage: StorageConfig;
    compute: ComputeConfig;
}

export interface DatabaseConfig {
    type: DatabaseType;
    host: string;
    port: number;
    name: string;
    maxConnections: number;
    timeout: number;
}

export enum DatabaseType {
    POSTGRESQL = 'postgresql',
    MONGODB = 'mongodb',
    MYSQL = 'mysql',
    REDIS = 'redis'
}

export interface CacheConfig {
    enabled: boolean;
    provider: CacheProvider;
    ttl: number;
    maxSize: number;
}

export enum CacheProvider {
    REDIS = 'redis',
    MEMCACHED = 'memcached',
    IN_MEMORY = 'in_memory'
}

export interface StorageConfig {
    type: StorageType;
    bucket: string;
    region: string;
    encryption: boolean;
}

export enum StorageType {
    S3 = 's3',
    GCS = 'gcs',
    AZURE = 'azure',
    LOCAL = 'local'
}

export interface ComputeConfig {
    scaling: ScalingConfig;
    resources: ResourceLimits;
    availability: AvailabilityConfig;
}

export interface ScalingConfig {
    minInstances: number;
    maxInstances: number;
    targetCPU: number;
    targetMemory: number;
}

export interface ResourceLimits {
    cpu: string;
    memory: string;
    storage: string;
}

export interface AvailabilityConfig {
    zones: string[];
    backups: boolean;
    failover: boolean;
}

