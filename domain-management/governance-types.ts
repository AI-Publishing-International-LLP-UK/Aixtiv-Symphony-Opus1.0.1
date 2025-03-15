export enum VerificationType {
    DOMAIN = 'DOMAIN',
    FIREBASE = 'FIREBASE',
    DNS = 'DNS',
    SECURITY = 'SECURITY',
    CULTURAL = 'CULTURAL'
}

export interface ValidationRule {
    type: VerificationType;
    isRequired: boolean;
    validator: (value: any) => Promise<boolean>;
    errorMessage?: string;
}

export interface CulturalContextRule extends ValidationRule {
    type: VerificationType.CULTURAL;
    locale: string;
    sensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
    categories: string[];
}

export interface VerificationRequirement {
    id: string;
    rules: ValidationRule[];
    culturalRules?: CulturalContextRule[];
    asyncValidation?: boolean;
    timeout?: number;
}

export interface VerificationResult {
    success: boolean;
    errors: string[];
    culturalIssues?: {
        locale: string;
        issues: string[];
    }[];
}

