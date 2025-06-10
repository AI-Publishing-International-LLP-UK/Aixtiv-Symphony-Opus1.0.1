export enum SecurityLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export interface AccessControl {
    permissions: {
        read: boolean;
        write: boolean;
        execute: boolean;
        delete: boolean;
    };
    roles: string[];
    restrictions: {
        timeBasedAccess?: {
            startTime: string;
            endTime: string;
            timezone: string;
        };
        ipRestrictions?: string[];
        deviceRestrictions?: string[];
    };
}

export interface EncryptionLayer {
    algorithm: string;
    keySize: number;
    mode: string;
    iv?: string;
    salt?: string;
    iterations?: number;
}

export enum ResponseType {
    SUCCESS = 'success',
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info'
}

export enum SecurityZone {
    PUBLIC = 'public',
    PRIVATE = 'private',
    RESTRICTED = 'restricted',
    CLASSIFIED = 'classified'
}

export interface ProtectionLevel {
    level: SecurityLevel;
    description: string;
    requirements: string[];
    auditing: {
        enabled: boolean;
        frequency: string;
        retention: string;
    };
}
