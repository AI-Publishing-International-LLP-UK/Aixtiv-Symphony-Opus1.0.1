export interface FeatureFlags {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    conditions?: {
        userRoles?: string[];
        environments?: string[];
        startDate?: string;
        endDate?: string;
    };
    metadata?: {
        createdAt: string;
        updatedAt: string;
        createdBy: string;
        version: string;
    };
    rolloutStrategy?: {
        type: 'all' | 'percentage' | 'gradual';
        percentage?: number;
        stages?: {
            percentage: number;
            date: string;
        }[];
    };
    dependencies?: string[];
    monitoring?: {
        metrics: string[];
        alerts: {
            condition: string;
            threshold: number;
            action: string;
        }[];
    };
}

export interface DashboardConfig {
    layout: 'grid' | 'list' | 'custom';
    components: {
        id: string;
        type: string;
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        settings: Record<string, unknown>;
    }[];
    themes: {
        light: Record<string, string>;
        dark: Record<string, string>;
    };
    preferences: {
        refreshRate: number;
        defaultView: string;
        notifications: boolean;
    };
}

