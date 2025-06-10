"use strict";
/**
 * Domain Context Protocol (DCP) Implementation
 * Module for managing domains through the Model Context Protocol (MCP)
 * Version: 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDomainProtocol = exports.DomainContextProtocol = exports.DomainManagementError = void 0;
const axios_1 = require("axios");
const uuid_1 = require("uuid");
const model_context_protocol_1 = require("./model-context-protocol");
/**
 * Domain Management Error
 */
class DomainManagementError extends model_context_protocol_1.MCPError {
    constructor(message, details = {}) {
        super({
            message,
            type: 'DOMAIN_MANAGEMENT_ERROR',
            retryable: details.retryable || false,
            details,
        });
        this.name = 'DomainManagementError';
    }
}
exports.DomainManagementError = DomainManagementError;
/**
 * Domain Context Protocol Implementation
 */
class DomainContextProtocol {
    /**
     * Create a new Domain Management instance
     */
    constructor(config) {
        this.config = {
            endpoints: Object.assign({ firebaseHosting: 'https://firebasehosting.googleapis.com/v1beta1', godaddy: 'https://api.godaddy.com', verification: 'https://verification.api.aixtiv.io' }, config.endpoints),
            auth: Object.assign({ firebaseProjectId: 'api-for-warp-drive' }, config.auth),
            domainFamilies: Object.assign({}, config.domainFamilies),
            humanOversight: Object.assign({ requiredFor: ['delete'], approvalTimeoutHours: 24 }, config.humanOversight),
            debug: config.debug || false,
        };
        // Initialize Firebase client
        this.firebaseClient = axios_1.default.create({
            baseURL: this.config.endpoints.firebaseHosting,
            timeout: 30000,
        });
        // Initialize GoDaddy client
        this.godaddyClient = axios_1.default.create({
            baseURL: this.config.endpoints.godaddy,
            timeout: 30000,
            headers: this.getGoDaddyHeaders(),
        });
        this.pendingOperations = new Map();
        this.domainMappings = new Map();
        this.familyMappings = new Map();
        // Initialize domain mappings
        this.initializeDomainMappings();
    }
    /**
     * Initialize domain mappings from configuration
     */
    initializeDomainMappings() {
        // Process domain families into mappings
        Object.entries(this.config.domainFamilies).forEach(([familyId, family]) => {
            // Store domain patterns for each family
            this.familyMappings.set(familyId, family.domainPatterns);
            // Create direct domain mappings for exact domain matches
            family.domainPatterns.forEach(pattern => {
                if (!pattern.includes('*')) {
                    this.domainMappings.set(pattern, family.primarySiteId);
                }
            });
        });
    }
    /**
     * Get GoDaddy headers for API calls
     */
    getGoDaddyHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.config.auth.godaddyApiKey && this.config.auth.godaddyApiSecret) {
            headers['Authorization'] = `sso-key ${this.config.auth.godaddyApiKey}:${this.config.auth.godaddyApiSecret}`;
        }
        return headers;
    }
    /**
     * Get site ID for a domain
     */
    getSiteIdForDomain(domain) {
        // Check for direct mapping
        if (this.domainMappings.has(domain)) {
            return this.domainMappings.get(domain);
        }
        // Check pattern matching
        for (const [familyId, patterns] of this.familyMappings.entries()) {
            for (const pattern of patterns) {
                if (this.matchesDomainPattern(domain, pattern)) {
                    return this.config.domainFamilies[familyId].primarySiteId;
                }
            }
        }
        // Fall back to default site
        return this.config.auth.firebaseProjectId;
    }
    /**
     * Check if a domain matches a pattern
     */
    matchesDomainPattern(domain, pattern) {
        if (pattern === domain) {
            return true;
        }
        if (pattern.startsWith('*.')) {
            const patternBase = pattern.substring(2);
            return domain.endsWith(patternBase) && domain.length > patternBase.length;
        }
        return false;
    }
    /**
     * Check if an operation requires human oversight
     */
    requiresHumanOversight(operationType) {
        return this.config.humanOversight.requiredFor.includes(operationType);
    }
    /**
     * Log operation for human oversight
     */
    async logOperationForOversight(operationType, domain, details) {
        const trackingId = (0, uuid_1.v4)();
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + (this.config.humanOversight.approvalTimeoutHours || 24));
        const oversightData = {
            trackingId,
            operationType,
            domain,
            details,
            status: 'PENDING_APPROVAL',
            requiredApprovals: 1,
            receivedApprovals: 0,
            approvalDeadline: deadline.toISOString(),
            requestedAt: new Date().toISOString(),
            requestedBy: 'system',
        };
        // In a real implementation, this would store the oversight data in a database
        // and notify the approval authorities via email or other channels
        this.pendingOperations.set(trackingId, oversightData);
        if (this.config.debug) {
            console.log('Operation logged for oversight:', oversightData);
        }
        return trackingId;
    }
    /**
     * Get Firebase access token
     */
    async getFirebaseAccessToken() {
        // In a real implementation, this would use the Firebase Admin SDK
        // or a service account to obtain an access token
        // For now, we'll simulate it with a placeholder
        return 'firebase-access-token';
    }
    /**
     * Add a domain to Firebase Hosting
     */
    async addDomain(request) {
        var _a;
        try {
            const trackingId = (0, uuid_1.v4)();
            const timestamp = new Date().toISOString();
            // Determine site ID if not provided
            const siteId = request.siteId || (request.familyId && ((_a = this.config.domainFamilies[request.familyId]) === null || _a === void 0 ? void 0 : _a.primarySiteId)) || this.getSiteIdForDomain(request.domain);
            // Check if operation requires human oversight
            if (this.requiresHumanOversight('add')) {
                const oversightTrackingId = await this.logOperationForOversight('add', request.domain, {
                    siteId,
                    configureDns: request.configureDns,
                    customDnsRecords: request.customDnsRecords,
                });
                return {
                    success: true,
                    status: 'REQUIRES_APPROVAL',
                    trackingId: oversightTrackingId,
                    timestamp,
                    oversight: {
                        requiredApprovals: 1,
                        receivedApprovals: 0,
                        approvalDeadline: new Date(Date.now() + (this.config.humanOversight.approvalTimeoutHours || 24) * 60 * 60 * 1000).toISOString(),
                        requestedBy: 'system',
                    },
                };
            }
            // Get Firebase access token
            const token = await this.getFirebaseAccessToken();
            // Add domain to Firebase Hosting
            const url = `${this.config.endpoints.firebaseHosting}/sites/${siteId}/domains`;
            const payload = {
                domainName: request.domain,
                type: 'USER_OWNED',
                site: `sites/${siteId}`,
            };
            const response = await this.firebaseClient.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const dnsRecords = response.data.dnsRecords || [];
            // Configure DNS if requested
            if (request.configureDns && dnsRecords.length > 0) {
                await this.updateDnsThroughGoDaddy(request.domain, dnsRecords);
            }
            // Add custom DNS records if provided
            if (request.customDnsRecords && request.customDnsRecords.length > 0) {
                await this.updateDnsThroughGoDaddy(request.domain, request.customDnsRecords);
            }
            // Return success result
            return {
                success: true,
                status: 'COMPLETED',
                data: {
                    domain: request.domain,
                    verificationStatus: 'PENDING',
                    configStatus: 'PENDING',
                    dnsRecords,
                    updatedAt: timestamp,
                    siteId,
                },
                trackingId,
                timestamp,
            };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to add domain';
            if (this.config.debug) {
                console.error('Add domain error:', error);
            }
            throw new DomainManagementError(errorMessage, {
                operation: 'addDomain',
                domain: request.domain,
                siteId: request.siteId,
                retryable: true,
            });
        }
    }
    /**
     * Verify a domain in Firebase Hosting
     */
    async verifyDomain(request) {
        try {
            const trackingId = (0, uuid_1.v4)();
            const timestamp = new Date().toISOString();
            // Check if operation requires human oversight
            if (this.requiresHumanOversight('verify')) {
                const oversightTrackingId = await this.logOperationForOversight('verify', request.domain, {
                    siteId: request.siteId,
                    force: request.force,
                });
                return {
                    success: true,
                    status: 'REQUIRES_APPROVAL',
                    trackingId: oversightTrackingId,
                    timestamp,
                    oversight: {
                        requiredApprovals: 1,
                        receivedApprovals: 0,
                        approvalDeadline: new Date(Date.now() + (this.config.humanOversight.approvalTimeoutHours || 24) * 60 * 60 * 1000).toISOString(),
                        requestedBy: 'system',
                    },
                };
            }
            // Get Firebase access token
            const token = await this.getFirebaseAccessToken();
            // Verify domain in Firebase Hosting
            const url = `${this.config.endpoints.firebaseHosting}/sites/${request.siteId}/domains/${request.domain}:verifyDomain`;
            const payload = request.force ? { forceSslVerification: true } : {};
            const response = await this.firebaseClient.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            // Return success result
            return {
                success: true,
                status: 'COMPLETED',
                data: {
                    domain: request.domain,
                    verificationStatus: response.data.status || 'VERIFIED',
                    configStatus: 'ACTIVE',
                    dnsRecords: response.data.dnsRecords || [],
                    updatedAt: timestamp,
                    siteId: request.siteId,
                },
                trackingId,
                timestamp,
            };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to verify domain';
            if (this.config.debug) {
                console.error('Verify domain error:', error);
            }
            throw new DomainManagementError(errorMessage, {
                operation: 'verifyDomain',
                domain: request.domain,
                siteId: request.siteId,
                retryable: true,
            });
        }
    }
    /**
     * Update DNS records for a domain through GoDaddy
     */
    async updateDnsThroughGoDaddy(domain, records) {
        try {
            // Format records for GoDaddy API
            const formattedRecords = records.map(record => ({
                type: record.type,
                name: record.name,
                data: record.data,
                ttl: record.ttl,
                priority: record.priority,
            }));
            // Update DNS records
            const url = `${this.config.endpoints.godaddy}/v1/domains/${domain}/records`;
            await this.godaddyClient.put(url, formattedRecords);
            return true;
        }
        catch (error) {
            if (this.config.debug) {
                console.error('Update DNS error:', error);
            }
            throw new DomainManagementError(`Failed to update DNS records for ${domain}: ${error.message}`, {
                operation: 'updateDnsThroughGoDaddy',
                domain,
                retryable: true,
            });
        }
    }
    /**
     * Update DNS records for a domain
     */
    async updateDomainDns(request) {
        try {
            const trackingId = (0, uuid_1.v4)();
            const timestamp = new Date().toISOString();
            // Check if operation requires human oversight
            if (this.requiresHumanOversight('update')) {
                const oversightTrackingId = await this.logOperationForOversight('update', request.domain, {
                    dnsRecords: request.dnsRecords,
                    overwrite: request.overwrite,
                });
                return {
                    success: true,
                    status: 'REQUIRES_APPROVAL',
                    trackingId: oversightTrackingId,
                    timestamp,
                    oversight: {
                        requiredApprovals: 1,
                        receivedApprovals: 0,
                        approvalDeadline: new Date(Date.now() + (this.config.humanOversight.approvalTimeoutHours || 24) * 60 * 60 * 1000).toISOString(),
                        requestedBy: 'system',
                    },
                };
            }
            // Update DNS records
            await this.updateDnsThroughGoDaddy(request.domain, request.dnsRecords);
            // Return success result
            return {
                success: true,
                status: 'COMPLETED',
                data: true,
                trackingId,
                timestamp,
            };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to update DNS records';
            if (this.config.debug) {
                console.error('Update DNS error:', error);
            }
            throw new DomainManagementError(errorMessage, {
                operation: 'updateDomainDns',
                domain: request.domain,
                retryable: true,
            });
        }
    }
    /**
     * Get domain status
     */
    async getDomainStatus(domain, siteId) {
        var _a, _b, _c;
        try {
            const trackingId = (0, uuid_1.v4)();
            const timestamp = new Date().toISOString();
            // Determine site ID if not provided
            const actualSiteId = siteId || this.getSiteIdForDomain(domain);
            // Get Firebase access token
            const token = await this.getFirebaseAccessToken();
            // Get domain status from Firebase Hosting
            const url = `${this.config.endpoints.firebaseHosting}/sites/${actualSiteId}/domains/${domain}`;
            const response = await this.firebaseClient.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            // Return success result
            return {
                success: true,
                status: 'COMPLETED',
                data: {
                    domain,
                    verificationStatus: response.data.status || 'UNKNOWN',
                    configStatus: ((_a = response.data.provisioning) === null || _a === void 0 ? void 0 : _a.status) || 'UNKNOWN',
                    provisioningStatus: (_b = response.data.provisioning) === null || _b === void 0 ? void 0 : _b.status,
                    dnsRecords: response.data.dnsRecords || [],
                    errorMessage: (_c = response.data.error) === null || _c === void 0 ? void 0 : _c.message,
                    updatedAt: response.data.updateTime || timestamp,
                    siteId: actualSiteId,
                },
                trackingId,
                timestamp,
            };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to get domain status';
            if (this.config.debug) {
                console.error('Get domain status error:', error);
            }
            throw new DomainManagementError(errorMessage, {
                operation: 'getDomainStatus',
                domain,
                siteId,
                retryable: true,
            });
        }
    }
    /**
     * Delete a domain from Firebase Hosting
     */
    async deleteDomain(domain, siteId) {
        try {
            const trackingId = (0, uuid_1.v4)();
            const timestamp = new Date().toISOString();
            // Determine site ID if not provided
            const actualSiteId = siteId || this.getSiteIdForDomain(domain);
            // Check if operation requires human oversight
            if (this.requiresHumanOversight('delete')) {
                const oversightTrackingId = await this.logOperationForOversight('delete', domain, {
                    siteId: actualSiteId,
                });
                return {
                    success: true,
                    status: 'REQUIRES_APPROVAL',
                    trackingId: oversightTrackingId,
                    timestamp,
                    oversight: {
                        requiredApprovals: 1,
                        receivedApprovals: 0,
                        approvalDeadline: new Date(Date.now() + (this.config.humanOversight.approvalTimeoutHours || 24) * 60 * 60 * 1000).toISOString(),
                        requestedBy: 'system',
                    },
                };
            }
            // Get Firebase access token
            const token = await this.getFirebaseAccessToken();
            // Delete domain from Firebase Hosting
            const url = `${this.config.endpoints.firebaseHosting}/sites/${actualSiteId}/domains/${domain}`;
            await this.firebaseClient.delete(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            // Return success result
            return {
                success: true,
                status: 'COMPLETED',
                data: true,
                trackingId,
                timestamp,
            };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to delete domain';
            if (this.config.debug) {
                console.error('Delete domain error:', error);
            }
            throw new DomainManagementError(errorMessage, {
                operation: 'deleteDomain',
                domain,
                siteId,
                retryable: false,
            });
        }
    }
    /**
     * Get all domains for a site
     */
    async getSiteDomains(siteId) {
        try {
            const trackingId = (0, uuid_1.v4)();
            const timestamp = new Date().toISOString();
            // Get Firebase access token
            const token = await this.getFirebaseAccessToken();
            // Get domains from Firebase Hosting
            const url = `${this.config.endpoints.firebaseHosting}/sites/${siteId}/domains`;
            const response = await this.firebaseClient.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const domains = (response.data.domains || []).map((domain) => domain.domainName);
            // Return success result
            return {
                success: true,
                status: 'COMPLETED',
                data: domains,
                trackingId,
                timestamp,
            };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to get site domains';
            if (this.config.debug) {
                console.error('Get site domains error:', error);
            }
            throw new DomainManagementError(errorMessage, {
                operation: 'getSiteDomains',
                siteId,
                retryable: true,
            });
        }
    }
    /**
     * Check operation approval status
     */
    async checkOperationApprovalStatus(trackingId) {
        try {
            const timestamp = new Date().toISOString();
            // Get operation data from pendingOperations
            const operation = this.pendingOperations.get(trackingId);
            if (!operation) {
                throw new DomainManagementError(`Operation with tracking ID ${trackingId} not found`, {
                    operation: 'checkOperationApprovalStatus',
                    trackingId,
                    retryable: false,
                });
            }
            // Return operation status
            return {
                success: true,
                status: operation.status === 'APPROVED' ? 'COMPLETED' : 'PENDING',
                data: operation,
                trackingId,
                timestamp,
                oversight: {
                    requiredApprovals: operation.requiredApprovals,
                    receivedApprovals: operation.receivedApprovals,
                    approvalDeadline: operation.approvalDeadline,
                    requestedBy: operation.requestedBy,
                },
            };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to check operation approval status';
            if (this.config.debug) {
                console.error('Check operation approval status error:', error);
            }
            throw new DomainManagementError(errorMessage, {
                operation: 'checkOperationApprovalStatus',
                trackingId,
                retryable: true,
            });
        }
    }
    /**
     * Approve an operation
     */
    async approveOperation(trackingId, approverUserId) {
        try {
            const timestamp = new Date().toISOString();
            // Get operation data from pendingOperations
            const operation = this.pendingOperations.get(trackingId);
            if (!operation) {
                throw new DomainManagementError(`Operation with tracking ID ${trackingId} not found`, {
                    operation: 'approveOperation',
                    trackingId,
                    retryable: false,
                });
            }
            // Check if operation can be approved
            if (operation.status !== 'PENDING_APPROVAL') {
                throw new DomainManagementError(`Operation with tracking ID ${trackingId} is not pending approval`, {
                    operation: 'approveOperation',
                    trackingId,
                    status: operation.status,
                    retryable: false,
                });
            }
            // Update operation status
            operation.receivedApprovals += 1;
            if (operation.receivedApprovals >= operation.requiredApprovals) {
                operation.status = 'APPROVED';
            }
            // Add approval record
            if (!operation.approvals) {
                operation.approvals = [];
            }
            operation.approvals.push({
                approverUserId,
                timestamp,
            });
            // Update operation in pendingOperations
            this.pendingOperations.set(trackingId, operation);
            // Execute operation if approved (in a real implementation, this would be done by a background job)
            if (operation.status === 'APPROVED') {
                // Implementation details depend on the operation type
            }
            // Return success result
            return {
                success: true,
                status: operation.status === 'APPROVED' ? 'COMPLETED' : 'PENDING',
                data: operation,
                trackingId,
                timestamp,
                oversight: {
                    requiredApprovals: operation.requiredApprovals,
                    receivedApprovals: operation.receivedApprovals,
                    approvalDeadline: operation.approvalDeadline,
                    requestedBy: operation.requestedBy,
                },
            };
        }
        catch (error) {
            const errorMessage = error.message || 'Failed to approve operation';
            if (this.config.debug) {
                console.error('Approve operation error:', error);
            }
            throw new DomainManagementError(errorMessage, {
                operation: 'approveOperation',
                trackingId,
                retryable: false,
            });
        }
    }
}
exports.DomainContextProtocol = DomainContextProtocol;
// Export singleton instance creator
const createDomainProtocol = (config) => {
    return new DomainContextProtocol(config);
};
exports.createDomainProtocol = createDomainProtocol;
exports.default = exports.createDomainProtocol;
//# sourceMappingURL=domain-context-protocol.js.map