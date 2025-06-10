"use strict";
/**
 * Jira Integration Configuration
 * This file contains the configuration for the Jira integration with Coaching 2100
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JIRA_CONFIG = void 0;
exports.JIRA_CONFIG = {
    // Base URL for Jira Cloud API
    baseUrl: 'https://coaching2100.atlassian.net',
    // Admin user credentials
    adminUser: 'C2100-PCR',
    // Google Cloud project ID
    gcpProjectId: 'api-for-warp-drive',
    // Webhook configuration for bidirectional integration
    webhooks: {
        issueCreated: '/api/jira-webhooks/issue-created',
        issueUpdated: '/api/jira-webhooks/issue-updated',
        commentAdded: '/api/jira-webhooks/comment-added'
    },
    // Default project template settings
    projectTemplate: {
        key: 'SOFTWARE',
        type: 'software',
        template: 'com.pyxis.greenhopper.jira:basic-software-development-template'
    },
    // OAuth scopes required for the integration
    requiredScopes: [
        'read:jira-work',
        'write:jira-work',
        'read:jira-user',
        'manage:jira-project',
        'manage:jira-config'
    ],
    // User role mapping
    roleMapping: {
        viewer: '10001', // Viewers
        editor: '10002', // Editors
        admin: '10000', // Administrators
    },
    // License pricing
    pricing: {
        monthlyFeePerUser: 5,
        billingCurrency: 'USD',
        trialDays: 30
    },
    // API rate limits
    rateLimits: {
        requestsPerHour: 1000,
        maxConcurrentRequests: 10
    },
    // Secret paths in Google Secret Manager
    secretPaths: {
        apiToken: 'projects/api-for-warp-drive/secrets/jira-api-token/versions/latest',
        webhookSecret: 'projects/api-for-warp-drive/secrets/jira-webhook-secret/versions/latest'
    }
};
// Export default for easy importing
exports.default = exports.JIRA_CONFIG;
//# sourceMappingURL=jira-config.js.map