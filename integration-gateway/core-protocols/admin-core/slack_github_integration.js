const { WebClient } = require('@slack/web-api');
const { createEventAdapter } = require('@slack/events-api');
const { createHmac } = require('crypto');

class SlackGitHubIntegration {
    constructor(config) {
        this.slackClient = new WebClient(config.slackToken);
        this.slackEvents = createEventAdapter(config.slackSigningSecret);
        this.githubSecret = config.githubWebhookSecret;
        this.defaultChannel = config.defaultChannel;
        
        // Integration with Dr Lucy's automation
        this.lucyAutomation = {
            securityScanner: null,
            repositoryMonitor: null,
            automationTasks: new Map()
        };
    }

    // Verify GitHub webhook signatures
    verifyGithubWebhook(signature, payload) {
        const hmac = createHmac('sha256', this.githubSecret);
        const digest = 'sha256=' + hmac.update(payload).digest('hex');
        return signature === digest;
    }

    // Format and send security alerts
    async sendSecurityAlert(alert) {
        const message = {
            channel: this.defaultChannel,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🚨 *Security Alert*\n${alert.title}`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Severity:* ${alert.severity}\n*Details:* ${alert.description}`
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "View Details"
                            },
                            url: alert.url
                        }
                    ]
                }
            ]
        };
        
        await this.slackClient.chat.postMessage(message);
    }

    // Handle different GitHub events
    async handleGithubEvent(event, payload) {
        switch(event) {
            case 'push':
                await this.handlePushEvent(payload);
                break;
            case 'security_advisory':
                await this.handleSecurityAdvisory(payload);
                break;
            case 'repository_vulnerability_alert':
                await this.handleVulnerabilityAlert(payload);
                break;
        }
    }

    // Process repository commands from Slack
    async processSlackCommand(command, params) {
        switch(command) {
            case 'scan':
                return this.initiateSecurityScan(params.repository);
            case 'lock':
                return this.lockRepository(params.repository);
            case 'audit':
                return this.auditRepositoryAccess(params.repository);
        }
    }

    // Initialize Dr Lucy's security monitoring
    async initializeLucyMonitoring() {
        this.lucyAutomation.securityScanner = await this.createSecurityScanner();
        this.lucyAutomation.repositoryMonitor = await this.createRepositoryMonitor();
        
        // Set up automated security checks
        setInterval(() => this.runAutomatedSecurityChecks(), 3600000);
    }

    // Run automated security checks
    async runAutomatedSecurityChecks() {
        const securityReport = await this.lucyAutomation.securityScanner.scan();
        if (securityReport.threats.length > 0) {
            await this.sendSecurityAlert({
                title: "Automated Security Scan Results",
                severity: securityReport.maxSeverity,
                description: securityReport.summary,
                url: securityReport.detailsUrl
            });
        }
    }

    // Monitor repository activities
    async monitorRepositoryActivity(repository) {
        const monitor = this.lucyAutomation.repositoryMonitor;
        monitor.on('suspicious_activity', async (activity) => {
            await this.sendSecurityAlert({
                title: "Suspicious Repository Activity Detected",
                severity: "HIGH",
                description: activity.description,
                url: activity.contextUrl
            });
        });
    }
}

module.exports = SlackGitHubIntegration;

