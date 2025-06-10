"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jiraService = exports.JiraService = void 0;
const axios_1 = require("axios");
const jira_config_1 = require("./jira-config");
const firebase_1 = require("../../services/firebase");
const firestore_1 = require("firebase/firestore");
const gcp_secrets_client_1 = require("../../services/common/gcp-secrets-client");
// Get secrets manager instance
const secretsManager = (0, gcp_secrets_client_1.getSecretsManager)();
/**
 * Jira Service provides methods for interacting with Jira Cloud API
 * This service enables full integration with the Coaching 2100 Jira license system
 */
class JiraService {
    constructor() {
        this.apiToken = null;
        this.baseUrl = jira_config_1.JIRA_CONFIG.baseUrl;
        this.adminUser = jira_config_1.JIRA_CONFIG.adminUser;
    }
    /**
     * Initialize the Jira service by retrieving the API token
     */
    async initialize() {
        if (!this.apiToken) {
            this.apiToken = await this.getApiToken();
        }
    }
    /**
     * Get the API token from Secret Manager
     */
    async getApiToken() {
        try {
            // Ensure secrets manager is initialized
            if (!secretsManager.initialized) {
                await secretsManager.initialize();
            }
            // Extract secret name from the full path
            const secretPath = jira_config_1.JIRA_CONFIG.secretPaths.apiToken;
            const secretName = secretPath.split('/').pop();
            // Get the secret using the GCPSecretsManager
            return await secretsManager.getSecret(secretName);
        }
        catch (error) {
            console.error('Error retrieving Jira API token:', error);
            throw new Error('Failed to retrieve Jira API token');
        }
    }
    /**
     * Get headers for Jira API requests
     */
    async getHeaders() {
        await this.initialize();
        return {
            'Authorization': `Basic ${Buffer.from(`${this.adminUser}:${this.apiToken}`).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }
    /**
     * Create a new Jira project workspace
     */
    async createProjectWorkspace(projectId, projectName, projectKey) {
        try {
            const headers = await this.getHeaders();
            // Create the project in Jira
            const response = await axios_1.default.post(`${this.baseUrl}/rest/api/3/project`, {
                key: projectKey.toUpperCase(),
                name: projectName,
                projectTypeKey: jira_config_1.JIRA_CONFIG.projectTemplate.type,
                projectTemplateKey: jira_config_1.JIRA_CONFIG.projectTemplate.template,
                leadAccountId: this.adminUser,
                description: {
                    version: 1,
                    type: 'doc',
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: `Project workspace for ${projectName} (ID: ${projectId})`
                                }
                            ]
                        }
                    ]
                }
            }, { headers });
            const workspaceData = {
                workspaceId: response.data.id,
                workspaceKey: response.data.key,
                workspaceUrl: `${this.baseUrl}/jira/software/projects/${response.data.key}`,
            };
            // Store the workspace data in Firestore
            await this.saveWorkspaceToFirestore(projectId, workspaceData);
            return workspaceData;
        }
        catch (error) {
            console.error('Error creating Jira project workspace:', error);
            throw new Error('Failed to create Jira project workspace');
        }
    }
    /**
     * Save workspace data to Firestore
     */
    async saveWorkspaceToFirestore(projectId, workspaceData) {
        try {
            const workspaceRef = (0, firestore_1.doc)((0, firestore_1.collection)(firebase_1.db, 'jiraWorkspaces'));
            await (0, firestore_1.setDoc)(workspaceRef, Object.assign(Object.assign({ projectId }, workspaceData), { createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now(), invitedUsers: [], status: 'active' }));
            // Update the license status to active
            const licensesRef = (0, firestore_1.collection)(firebase_1.db, 'projectLicenses');
            const q = (0, firestore_1.query)(licensesRef, (0, firestore_1.where)('projectId', '==', projectId), (0, firestore_1.where)('licenseType', '==', 'jira'));
            const querySnapshot = await (0, firestore_1.getDocs)(q);
            if (!querySnapshot.empty) {
                const licenseDoc = querySnapshot.docs[0];
                await (0, firestore_1.updateDoc)(licenseDoc.ref, {
                    status: 'active',
                    updatedAt: firestore_1.Timestamp.now()
                });
            }
        }
        catch (error) {
            console.error('Error saving workspace to Firestore:', error);
            throw new Error('Failed to save workspace data');
        }
    }
    /**
     * Invite a user to a Jira workspace
     */
    async inviteUserToWorkspace(workspaceId, userEmail, role = 'viewer') {
        try {
            const headers = await this.getHeaders();
            // Check if the user exists in Jira
            const userId = await this.getUserIdByEmail(userEmail);
            // If user doesn't exist, create them
            const userAccountId = userId || await this.createJiraUser(userEmail);
            // Get the role ID
            const roleId = jira_config_1.JIRA_CONFIG.roleMapping[role] ||
                jira_config_1.JIRA_CONFIG.roleMapping.viewer;
            // Add user to the project role
            await axios_1.default.post(`${this.baseUrl}/rest/api/3/project/${workspaceId}/role/${roleId}`, {
                user: [userAccountId]
            }, { headers });
            // Update Firestore
            const workspaceRef = (0, firestore_1.doc)((0, firestore_1.collection)(firebase_1.db, 'jiraWorkspaces'), workspaceId);
            const workspaceDoc = await (0, firestore_1.getDoc)(workspaceRef);
            if (workspaceDoc.exists()) {
                const workspace = workspaceDoc.data();
                const invitedUsers = workspace.invitedUsers || [];
                if (!invitedUsers.includes(userEmail)) {
                    await (0, firestore_1.updateDoc)(workspaceRef, {
                        invitedUsers: [...invitedUsers, userEmail],
                        updatedAt: firestore_1.Timestamp.now()
                    });
                }
            }
            return true;
        }
        catch (error) {
            console.error('Error inviting user to Jira workspace:', error);
            throw new Error('Failed to invite user to Jira workspace');
        }
    }
    /**
     * Get user ID by email
     */
    async getUserIdByEmail(email) {
        try {
            const headers = await this.getHeaders();
            const response = await axios_1.default.get(`${this.baseUrl}/rest/api/3/user/search?query=${encodeURIComponent(email)}`, { headers });
            if (response.data && response.data.length > 0) {
                return response.data[0].accountId;
            }
            return null;
        }
        catch (error) {
            console.error('Error getting user ID by email:', error);
            return null;
        }
    }
    /**
     * Create a new Jira user
     */
    async createJiraUser(email) {
        try {
            const headers = await this.getHeaders();
            const response = await axios_1.default.post(`${this.baseUrl}/rest/api/3/user`, {
                emailAddress: email,
                displayName: email.split('@')[0]
            }, { headers });
            return response.data.accountId;
        }
        catch (error) {
            console.error('Error creating Jira user:', error);
            throw new Error('Failed to create Jira user');
        }
    }
    /**
     * Create a Jira issue
     */
    async createIssue(projectKey, summary, description, issueType = 'Task') {
        try {
            const headers = await this.getHeaders();
            const response = await axios_1.default.post(`${this.baseUrl}/rest/api/3/issue`, {
                fields: {
                    project: {
                        key: projectKey
                    },
                    summary,
                    description: {
                        type: 'doc',
                        version: 1,
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    {
                                        type: 'text',
                                        text: description
                                    }
                                ]
                            }
                        ]
                    },
                    issuetype: {
                        name: issueType
                    }
                }
            }, { headers });
            return {
                issueId: response.data.id,
                issueKey: response.data.key,
                issueUrl: `${this.baseUrl}/browse/${response.data.key}`
            };
        }
        catch (error) {
            console.error('Error creating Jira issue:', error);
            throw new Error('Failed to create Jira issue');
        }
    }
    /**
     * Get all issues for a project
     */
    async getProjectIssues(projectKey, maxResults = 50) {
        try {
            const headers = await this.getHeaders();
            const response = await axios_1.default.get(`${this.baseUrl}/rest/api/3/search?jql=project=${projectKey}&maxResults=${maxResults}`, { headers });
            return response.data.issues || [];
        }
        catch (error) {
            console.error('Error getting project issues:', error);
            throw new Error('Failed to get project issues');
        }
    }
}
exports.JiraService = JiraService;
// Export an instance of the service
exports.jiraService = new JiraService();
// Export default for easy importing
exports.default = exports.jiraService;
//# sourceMappingURL=jira-service.js.map