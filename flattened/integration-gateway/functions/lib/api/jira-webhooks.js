"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIssueCreated = handleIssueCreated;
exports.handleIssueUpdated = handleIssueUpdated;
exports.handleCommentAdded = handleCommentAdded;
const crypto = require("crypto");
const jira_config_1 = require("../integrations/jira/jira-config");
const firebase_1 = require("../services/firebase");
const firestore_1 = require("firebase/firestore");
const gcp_secrets_client_1 = require("../services/common/gcp-secrets-client");
// Get secrets manager instance
const secretsManager = (0, gcp_secrets_client_1.getSecretsManager)();
/**
 * Get the webhook secret from Secret Manager
 */
async function getWebhookSecret() {
    try {
        // Ensure secrets manager is initialized
        if (!secretsManager.initialized) {
            await secretsManager.initialize();
        }
        // Extract secret name from the full path
        const secretPath = jira_config_1.JIRA_CONFIG.secretPaths.webhookSecret;
        const secretName = secretPath.split('/').pop();
        // Get the secret using the GCPSecretsManager
        return await secretsManager.getSecret(secretName);
    }
    catch (error) {
        console.error('Error retrieving Jira webhook secret:', error);
        throw new Error('Failed to retrieve Jira webhook secret');
    }
}
/**
 * Verify the webhook signature
 */
async function verifyWebhookSignature(req) {
    try {
        const secret = await getWebhookSecret();
        const signature = req.headers['x-jira-signature'];
        if (!signature) {
            return false;
        }
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(req.body));
        const calculatedSignature = hmac.digest('base64');
        return calculatedSignature === signature;
    }
    catch (error) {
        console.error('Error verifying webhook signature:', error);
        return false;
    }
}
/**
 * Handle issue created webhook
 */
async function handleIssueCreated(req, res) {
    var _a, _b;
    try {
        // Verify the webhook signature
        const isValid = await verifyWebhookSignature(req);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid webhook signature' });
            return;
        }
        const { issue, project } = req.body;
        if (!issue || !project) {
            res.status(400).json({ error: 'Invalid webhook payload' });
            return;
        }
        // Log the issue creation event
        await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'jiraEvents'), {
            type: 'issue_created',
            issueId: issue.id,
            issueKey: issue.key,
            projectId: project.id,
            projectKey: project.key,
            summary: ((_a = issue.fields) === null || _a === void 0 ? void 0 : _a.summary) || '',
            timestamp: firestore_1.Timestamp.now(),
            payload: req.body
        });
        // Find associated project in Firestore
        const workspacesRef = (0, firestore_1.collection)(firebase_1.db, 'jiraWorkspaces');
        const q = (0, firestore_1.query)(workspacesRef, (0, firestore_1.where)('workspaceKey', '==', project.key));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        if (!querySnapshot.empty) {
            const workspaceDoc = querySnapshot.docs[0];
            const projectId = workspaceDoc.data().projectId;
            // Create task notification
            await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'projectNotifications'), {
                projectId,
                title: 'New Jira Issue Created',
                message: `A new issue "${(_b = issue.fields) === null || _b === void 0 ? void 0 : _b.summary}" has been created in your Jira workspace.`,
                type: 'jira_issue',
                issueKey: issue.key,
                issueId: issue.id,
                createdAt: firestore_1.Timestamp.now(),
                read: false
            });
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error handling issue created webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Handle issue updated webhook
 */
async function handleIssueUpdated(req, res) {
    var _a, _b;
    try {
        // Verify the webhook signature
        const isValid = await verifyWebhookSignature(req);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid webhook signature' });
            return;
        }
        const { issue, project, changelog } = req.body;
        if (!issue || !project || !changelog) {
            res.status(400).json({ error: 'Invalid webhook payload' });
            return;
        }
        // Log the issue update event
        await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'jiraEvents'), {
            type: 'issue_updated',
            issueId: issue.id,
            issueKey: issue.key,
            projectId: project.id,
            projectKey: project.key,
            summary: ((_a = issue.fields) === null || _a === void 0 ? void 0 : _a.summary) || '',
            changelog: changelog,
            timestamp: firestore_1.Timestamp.now(),
            payload: req.body
        });
        // Check for status changes
        const statusChange = changelog.items.find((item) => item.field === 'status');
        if (statusChange) {
            // Find associated project in Firestore
            const workspacesRef = (0, firestore_1.collection)(firebase_1.db, 'jiraWorkspaces');
            const q = (0, firestore_1.query)(workspacesRef, (0, firestore_1.where)('workspaceKey', '==', project.key));
            const querySnapshot = await (0, firestore_1.getDocs)(q);
            if (!querySnapshot.empty) {
                const workspaceDoc = querySnapshot.docs[0];
                const projectId = workspaceDoc.data().projectId;
                // Create status change notification
                await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'projectNotifications'), {
                    projectId,
                    title: 'Jira Issue Status Updated',
                    message: `Issue "${(_b = issue.fields) === null || _b === void 0 ? void 0 : _b.summary}" status changed from "${statusChange.fromString}" to "${statusChange.toString}".`,
                    type: 'jira_status_change',
                    issueKey: issue.key,
                    issueId: issue.id,
                    oldStatus: statusChange.fromString,
                    newStatus: statusChange.toString,
                    createdAt: firestore_1.Timestamp.now(),
                    read: false
                });
            }
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error handling issue updated webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Handle comment added webhook
 */
async function handleCommentAdded(req, res) {
    var _a, _b, _c, _d;
    try {
        // Verify the webhook signature
        const isValid = await verifyWebhookSignature(req);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid webhook signature' });
            return;
        }
        const { issue, project, comment } = req.body;
        if (!issue || !project || !comment) {
            res.status(400).json({ error: 'Invalid webhook payload' });
            return;
        }
        // Log the comment event
        await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'jiraEvents'), {
            type: 'comment_added',
            issueId: issue.id,
            issueKey: issue.key,
            projectId: project.id,
            projectKey: project.key,
            commentId: comment.id,
            commenter: ((_a = comment.author) === null || _a === void 0 ? void 0 : _a.displayName) || 'Unknown',
            timestamp: firestore_1.Timestamp.now(),
            payload: req.body
        });
        // Find associated project in Firestore
        const workspacesRef = (0, firestore_1.collection)(firebase_1.db, 'jiraWorkspaces');
        const q = (0, firestore_1.query)(workspacesRef, (0, firestore_1.where)('workspaceKey', '==', project.key));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        if (!querySnapshot.empty) {
            const workspaceDoc = querySnapshot.docs[0];
            const projectId = workspaceDoc.data().projectId;
            // Create comment notification
            await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'projectNotifications'), {
                projectId,
                title: 'New Comment on Jira Issue',
                message: `${((_b = comment.author) === null || _b === void 0 ? void 0 : _b.displayName) || 'Someone'} commented on "${(_c = issue.fields) === null || _c === void 0 ? void 0 : _c.summary}".`,
                type: 'jira_comment',
                issueKey: issue.key,
                issueId: issue.id,
                commentId: comment.id,
                commenter: ((_d = comment.author) === null || _d === void 0 ? void 0 : _d.displayName) || 'Unknown',
                createdAt: firestore_1.Timestamp.now(),
                read: false
            });
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Error handling comment added webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
// Export the webhook handlers
exports.default = {
    handleIssueCreated,
    handleIssueUpdated,
    handleCommentAdded
};
//# sourceMappingURL=jira-webhooks.js.map