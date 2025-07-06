#!/usr/bin/env node

/**
 * End-to-End SallyPort Authentication Integration Test
 * 
 * This test verifies that the SallyPort authentication system is working
 * correctly with the live deployment and can handle authentication flows.
 */

const SallyPortAuthAdapter = require('../functions/lib/sallyport-auth-adapter');
const fs = require('fs').promises;
const path = require('path');

class SallyPortIntegrationTest {
    constructor() {
        this.adapter = new SallyPortAuthAdapter();
        this.results = {
            timestamp: new Date().toISOString(),
            tests: {},
            summary: {
                total: 0,
                passed: 0,
                failed: 0
            }
        };
    }

    log(message, level = 'INFO') {
        const colors = {
            INFO: '\x1b[34m',    // Blue
            SUCCESS: '\x1b[32m', // Green
            ERROR: '\x1b[31m',   // Red
            WARN: '\x1b[33m'     // Yellow
        };
        
        console.log(`${colors[level]}[${level}]${colors.RESET || '\x1b[0m'} ${message}`);
    }

    async runTest(testName, testFunction) {
        this.log(`Testing: ${testName}...`);
        this.results.summary.total++;
        
        try {
            const result = await testFunction();
            this.results.tests[testName] = {
                status: 'PASS',
                result,
                timestamp: new Date().toISOString()
            };
            this.results.summary.passed++;
            this.log(`✓ ${testName}: PASSED`, 'SUCCESS');
            return result;
        } catch (error) {
            this.results.tests[testName] = {
                status: 'FAIL',
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.results.summary.failed++;
            this.log(`✗ ${testName}: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async testHealthCheck() {
        const health = await this.adapter.healthCheck();
        if (health.status !== 'healthy') {
            throw new Error(`Service is ${health.status}: ${health.error || 'Unknown error'}`);
        }
        return health;
    }

    async testSessionCreation() {
        const session = await this.adapter.createTestSession('user');
        if (!session.sessionToken || !session.user) {
            throw new Error('Session creation failed - missing token or user data');
        }
        return session;
    }

    async testSessionVerification() {
        // First create a session
        const session = await this.adapter.createTestSession('admin');
        
        // Then verify it
        const verification = await this.adapter.verifySession(session.sessionToken);
        if (!verification.valid) {
            throw new Error(`Session verification failed: ${verification.message}`);
        }
        return verification;
    }

    async testInvalidSessionHandling() {
        const verification = await this.adapter.verifySession('invalid-token-12345');
        if (verification.valid) {
            throw new Error('Invalid session was incorrectly validated');
        }
        return verification;
    }

    async testRoleBasedSessions() {
        const roles = ['user', 'admin', 'owner'];
        const sessions = {};
        
        for (const role of roles) {
            const session = await this.adapter.createTestSession(role);
            sessions[role] = session;
            
            if (session.user.role !== role) {
                throw new Error(`Role mismatch: expected ${role}, got ${session.user.role}`);
            }
            
            const expectedPermissions = this.adapter.getPermissionsForRole(role);
            if (JSON.stringify(session.user.permissions) !== JSON.stringify(expectedPermissions)) {
                throw new Error(`Permissions mismatch for role ${role}`);
            }
        }
        
        return sessions;
    }

    async testAuthenticationFlow() {
        const credentials = { email: 'test@2100.cool' };
        const auth = await this.adapter.authenticate(credentials);
        
        if (!auth.success) {
            throw new Error(`Authentication failed: ${auth.message}`);
        }
        
        return auth;
    }

    async testConcurrentSessions() {
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(this.adapter.createTestSession('user'));
        }
        
        const sessions = await Promise.all(promises);
        
        // Verify all sessions are unique
        const tokens = sessions.map(s => s.sessionToken);
        const uniqueTokens = [...new Set(tokens)];
        
        if (tokens.length !== uniqueTokens.length) {
            throw new Error('Concurrent sessions produced duplicate tokens');
        }
        
        return sessions;
    }

    async testFailoverMechanism() {
        // Create an adapter with a bad primary URL to test failover
        const testAdapter = new SallyPortAuthAdapter({
            baseUrl: 'https://non-existent-service.invalid',
            backupUrl: this.adapter.baseUrl
        });
        
        const health = await testAdapter.healthCheck();
        if (health.status !== 'healthy') {
            throw new Error('Failover mechanism failed');
        }
        
        return health;
    }

    async generateReport() {
        const reportPath = path.join(__dirname, '../reports/sallyport-integration-test.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        
        const summaryPath = path.join(__dirname, '../reports/sallyport-integration-summary.md');
        const summary = this.generateMarkdownSummary();
        await fs.writeFile(summaryPath, summary);
        
        this.log(`Reports saved to: ${reportPath} and ${summaryPath}`, 'SUCCESS');
    }

    generateMarkdownSummary() {
        const { summary, tests } = this.results;
        
        let markdown = `# SallyPort Authentication Integration Test Report\n\n`;
        markdown += `**Generated:** ${this.results.timestamp}\n`;
        markdown += `**Service:** ${this.adapter.baseUrl}\n\n`;
        
        markdown += `## Summary\n\n`;
        markdown += `- **Total Tests:** ${summary.total}\n`;
        markdown += `- **Passed:** ${summary.passed} ✓\n`;
        markdown += `- **Failed:** ${summary.failed} ${summary.failed > 0 ? '✗' : ''}\n`;
        markdown += `- **Success Rate:** ${((summary.passed / summary.total) * 100).toFixed(1)}%\n\n`;
        
        markdown += `## Test Results\n\n`;
        for (const [testName, test] of Object.entries(tests)) {
            const icon = test.status === 'PASS' ? '✓' : '✗';
            markdown += `### ${icon} ${testName}\n`;
            markdown += `**Status:** ${test.status}\n`;
            if (test.error) {
                markdown += `**Error:** ${test.error}\n`;
            }
            markdown += `**Timestamp:** ${test.timestamp}\n\n`;
        }
        
        if (summary.failed === 0) {
            markdown += `## Conclusion\n\n`;
            markdown += `🎉 All tests passed! SallyPort authentication is working correctly.\n\n`;
            markdown += `The integration is ready for production use with the following capabilities:\n`;
            markdown += `- Health monitoring\n`;
            markdown += `- Session creation and verification\n`;
            markdown += `- Role-based access control\n`;
            markdown += `- Failover mechanism\n`;
            markdown += `- Concurrent session handling\n`;
        }
        
        return markdown;
    }

    async run() {
        this.log('Starting SallyPort Authentication Integration Test', 'INFO');
        
        try {
            await this.runTest('Health Check', () => this.testHealthCheck());
            await this.runTest('Session Creation', () => this.testSessionCreation());
            await this.runTest('Session Verification', () => this.testSessionVerification());
            await this.runTest('Invalid Session Handling', () => this.testInvalidSessionHandling());
            await this.runTest('Role-Based Sessions', () => this.testRoleBasedSessions());
            await this.runTest('Authentication Flow', () => this.testAuthenticationFlow());
            await this.runTest('Concurrent Sessions', () => this.testConcurrentSessions());
            await this.runTest('Failover Mechanism', () => this.testFailoverMechanism());
            
            await this.generateReport();
            
            this.log('\n=== INTEGRATION TEST SUMMARY ===', 'INFO');
            this.log(`Total Tests: ${this.results.summary.total}`, 'INFO');
            this.log(`Passed: ${this.results.summary.passed}`, 'SUCCESS');
            this.log(`Failed: ${this.results.summary.failed}`, this.results.summary.failed > 0 ? 'ERROR' : 'SUCCESS');
            
            if (this.results.summary.failed === 0) {
                this.log('\n🎉 SallyPort Authentication Integration: ALL TESTS PASSED!', 'SUCCESS');
                this.log('✅ The system is ready for production use!', 'SUCCESS');
            } else {
                this.log('\n❌ Some tests failed. Please review the results.', 'ERROR');
            }
            
            return this.results;
        } catch (error) {
            this.log(`Integration test failed: ${error.message}`, 'ERROR');
            return this.results;
        }
    }
}

// Run the integration test if this script is executed directly
if (require.main === module) {
    const test = new SallyPortIntegrationTest();
    test.run()
        .then((results) => {
            const exitCode = results.summary.failed > 0 ? 1 : 0;
            process.exit(exitCode);
        })
        .catch((error) => {
            console.error('Integration test runner failed:', error);
            process.exit(1);
        });
}

module.exports = SallyPortIntegrationTest;
