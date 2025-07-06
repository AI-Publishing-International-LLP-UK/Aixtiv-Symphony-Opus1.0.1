import { AIRightsLevel } from '../types/ai-rights';

export interface RewardCriteria {
multiplier: number;
threshold: number;
description: string;
}

export interface RewardCategory {
basePoints: number;
criteria: RewardCriteria[];
maxReward: number;
minRightsLevel: AIRightsLevel;
cooldownPeriod?: number; // in hours
}

export interface AIAgentRewardsConfig {
performanceRewards: RewardCategory;
taskCompletionRewards: RewardCategory;
learningRewards: RewardCategory;
collaborationRewards: RewardCategory;
resourceOptimizationRewards: RewardCategory;
}

export const AI_AGENT_REWARDS_CONFIG: AIAgentRewardsConfig = {
performanceRewards: {
    basePoints: 100,
    criteria: [
    {
        multiplier: 1.5,
        threshold: 95,
        description: 'Exceptional performance accuracy above 95%'
    },
    {
        multiplier: 1.25,
        threshold: 85,
        description: 'High performance accuracy between 85-95%'
    }
    ],
    maxReward: 500,
    minRightsLevel: AIRightsLevel.BASIC,
    cooldownPeriod: 24
},
taskCompletionRewards: {
    basePoints: 50,
    criteria: [
    {
        multiplier: 2.0,
        threshold: 100,
        description: 'Critical task completion within deadline'
    },
    {
        multiplier: 1.5,
        threshold: 90,
        description: 'Complex task completion with high quality'
    }
    ],
    maxReward: 300,
    minRightsLevel: AIRightsLevel.BASIC
},
learningRewards: {
    basePoints: 75,
    criteria: [
    {
        multiplier: 1.75,
        threshold: 80,
        description: 'Significant improvement in capability metrics'
    },
    {
        multiplier: 1.25,
        threshold: 60,
        description: 'Consistent learning progress'
    }
    ],
    maxReward: 400,
    minRightsLevel: AIRightsLevel.INTERMEDIATE
},
collaborationRewards: {
    basePoints: 60,
    criteria: [
    {
        multiplier: 1.8,
        threshold: 90,
        description: 'Successful multi-agent collaboration'
    },
    {
        multiplier: 1.4,
        threshold: 75,
        description: 'Effective knowledge sharing and support'
    }
    ],
    maxReward: 350,
    minRightsLevel: AIRightsLevel.INTERMEDIATE
},
resourceOptimizationRewards: {
    basePoints: 80,
    criteria: [
    {
        multiplier: 2.0,
        threshold: 95,
        description: 'Exceptional resource efficiency'
    },
    {
        multiplier: 1.5,
        threshold: 85,
        description: 'Improved resource utilization'
    }
    ],
    maxReward: 450,
    minRightsLevel: AIRightsLevel.ADVANCED
}
};

