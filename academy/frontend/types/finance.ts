export interface TaxManagementSystem {
    taxYear: number;
    taxRules: {
        category: string;
        rate: number;
        applicableRegions: string[];
    }[];
    filingDeadlines: {
        type: string;
        date: string;
    }[];
    exemptions: string[];
}

export interface BusinessExpenseTracker {
    categories: string[];
    approvalLevels: {
        threshold: number;
        approvers: string[];
    }[];
    reportingFrequency: 'daily' | 'weekly' | 'monthly';
    auditRequirements: {
        frequency: string;
        reviewer: string;
        documentation: string[];
    };
}

export interface InvestmentMonitor {
    portfolios: {
        name: string;
        type: 'equity' | 'debt' | 'mixed';
        risk: 'low' | 'medium' | 'high';
        allocation: number;
    }[];
    thresholds: {
        minReturn: number;
        maxLoss: number;
        rebalancePoint: number;
    };
    reviewSchedule: {
        type: string;
        frequency: string;
        stakeholders: string[];
    }[];
}

