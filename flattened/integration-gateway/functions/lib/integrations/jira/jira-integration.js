"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JiraIntegration = void 0;
const axios_1 = require("axios");
const uuid_1 = require("uuid");
class JiraIntegration {
    constructor(apiUrl = process.env.JIRA_BASE_URL || 'https://coaching2100.atlassian.net', email = process.env.JIRA_EMAIL || '', apiKey = process.env.JIRA_API_KEY || '', cloudId = process.env.JIRA_CLOUD_ID || '') {
        this.apiUrl = apiUrl;
        this.email = email;
        this.apiKey = apiKey;
        this.cloudId = cloudId;
    }
    get authHeader() {
        const auth = Buffer.from(`${this.email}:${this.apiKey}`).toString('base64');
        return {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
    }
    /**
     * Create a new Jira workspace (project)
     */
    async createWorkspace(projectKey, projectName) {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/rest/api/3/project`, {
                key: projectKey.toUpperCase(),
                name: projectName,
                projectTypeKey: 'software',
                projectTemplateKey: 'com.pyxis.greenhopper.jira:basic-software-development-template',
                leadAccountId: this.getAdminAccountId(),
            }, { headers: this.authHeader });
            return {
                workspaceId: response.data.id,
                workspaceKey: response.data.key,
                workspaceUrl: `${this.apiUrl}/jira/software/projects/${response.data.key}`,
            };
        }
        catch (error) {
            console.error('Error creating Jira workspace:', error);
            throw new Error('Failed to create Jira workspace');
        }
    }
    /**
     * Invite a user to a Jira workspace
     */
    async inviteUser(workspaceId, email, role = 'viewer') {
        try {
            // First check if user exists, if not create an account
            const userId = await this.getUserIdByEmail(email) || await this.createUser(email);
            // Map role string to Jira role ID
            const roleId = this.getRoleId(role);
            // Add user to project role
            await axios_1.default.post(`${this.apiUrl}/rest/api/3/project/${workspaceId}/role/${roleId}`, {
                user: [userId],
            }, { headers: this.authHeader });
            return true;
        }
        catch (error) {
            console.error('Error inviting user to Jira workspace:', error);
            throw new Error('Failed to invite user to Jira workspace');
        }
    }
    /**
     * Create a new Jira board
     */
    async createBoard(workspaceId, boardName) {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/rest/agile/1.0/board`, {
                name: boardName,
                type: 'scrum',
                filterId: await this.createBoardFilter(workspaceId),
                location: {
                    projectId: workspaceId,
                },
            }, { headers: this.authHeader });
            return {
                boardId: response.data.id,
                boardUrl: `${this.apiUrl}/jira/software/projects/${workspaceId}/boards/${response.data.id}`,
            };
        }
        catch (error) {
            console.error('Error creating Jira board:', error);
            throw new Error('Failed to create Jira board');
        }
    }
    /**
     * Create a new Jira issue
     */
    async createIssue(projectKey, summary, description, issueType = 'Task') {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/rest/api/3/issue`, {
                fields: {
                    project: {
                        key: projectKey,
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
                                        text: description,
                                    },
                                ],
                            },
                        ],
                    },
                    issuetype: {
                        name: issueType,
                    },
                },
            }, { headers: this.authHeader });
            return {
                issueId: response.data.id,
                issueKey: response.data.key,
                issueUrl: `${this.apiUrl}/browse/${response.data.key}`,
            };
        }
        catch (error) {
            console.error('Error creating Jira issue:', error);
            throw new Error('Failed to create Jira issue');
        }
    }
    /**
     * Internal methods
     */
    async getUserIdByEmail(email) {
        try {
            const response = await axios_1.default.get(`${this.apiUrl}/rest/api/3/user/search?query=${email}`, { headers: this.authHeader });
            if (response.data && response.data.length > 0) {
                return response.data[0].accountId;
            }
            return null;
        }
        catch (error) {
            console.error('Error finding Jira user:', error);
            return null;
        }
    }
    async createUser(email) {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/rest/api/3/user`, {
                emailAddress: email,
                displayName: email.split('@')[0],
            }, { headers: this.authHeader });
            return response.data.accountId;
        }
        catch (error) {
            console.error('Error creating Jira user:', error);
            throw new Error('Failed to create Jira user');
        }
    }
    async createBoardFilter(projectId) {
        try {
            const response = await axios_1.default.post(`${this.apiUrl}/rest/api/3/filter`, {
                name: `Board Filter ${(0, uuid_1.v4)().substring(0, 8)}`,
                jql: `project = ${projectId}`,
                sharePermissions: [
                    {
                        type: 'global',
                    },
                ],
            }, { headers: this.authHeader });
            return response.data.id;
        }
        catch (error) {
            console.error('Error creating board filter:', error);
            throw new Error('Failed to create board filter');
        }
    }
    getAdminAccountId() {
        // This should be fetched from environment or configuration
        return process.env.JIRA_ADMIN_ACCOUNT_ID || '';
    }
    getRoleId(role) {
        // Map role strings to Jira role IDs
        // These IDs would be configured for your Jira instance
        const roleMap = {
            viewer: '10001', // Viewers
            editor: '10002', // Editors
            admin: '10000', // Administrators
        };
        return roleMap[role] || roleMap.viewer;
    }
}
exports.JiraIntegration = JiraIntegration;
// Export the integration
exports.default = JiraIntegration;
//# sourceMappingURL=jira-integration.js.map