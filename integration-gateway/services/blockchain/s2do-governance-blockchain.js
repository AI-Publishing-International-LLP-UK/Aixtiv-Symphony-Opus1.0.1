"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var ComplianceStatus;
(function (ComplianceStatus) {
    ComplianceStatus["PLANNED"] = "PLANNED";
    ComplianceStatus["IMPLEMENTING"] = "IMPLEMENTING";
    ComplianceStatus["IMPLEMENTED"] = "IMPLEMENTED";
    ComplianceStatus["OPERATING"] = "OPERATING";
    ComplianceStatus["DECOMMISSIONED"] = "DECOMMISSIONED";
    ComplianceStatus["EXCEPTION"] = "EXCEPTION";
})(ComplianceStatus || (ComplianceStatus = {}));
class S2DOGovernanceEngine {
    constructor(complianceRepository, blockchainService, workflowEngine, evidenceCollector) {
        this.complianceRepository = complianceRepository;
        this.blockchainService = blockchainService;
        this.workflowEngine = workflowEngine;
        this.evidenceCollector = evidenceCollector;
    }
    evaluateSecurityPosture(integrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Retrieve all S2DO controls applicable to this integration
            const applicableControls = yield this.complianceRepository.getApplicableControls(integrationId);
            // 2. Evaluate implementation status for each control
            const controlAssessments = yield Promise.all(applicableControls.map((control) => __awaiter(this, void 0, void 0, function* () {
                const complianceRecord = yield this.complianceRepository.getComplianceRecord(integrationId, control.id);
                const evidence = yield this.evidenceCollector.collectEvidence(integrationId, control.id);
                return {
                    controlId: control.id,
                    controlName: control.name,
                    category: control.category,
                    implementationStatus: (complianceRecord === null || complianceRecord === void 0 ? void 0 : complianceRecord.implementationStatus) || ComplianceStatus.PLANNED,
                    evidence,
                    riskLevel: this.calculateRiskLevel(control, complianceRecord, evidence)
                };
            })));
            // 3. Calculate overall security posture
            const securityScore = this.calculateSecurityScore(controlAssessments);
            return {
                integrationId,
                assessmentTimestamp: new Date(),
                overallSecurityScore: securityScore,
                controlAssessments,
                remediationRecommendations: this.generateRecommendations(controlAssessments)
            };
        });
    }
    createS2DOAttestationWorkflow(integrationId, controlIds, approvers) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create a governance workflow requiring multiple attestations
            const workflowDefinition = {
                workflowType: 'S2DO_ATTESTATION',
                steps: [
                    {
                        type: 'EVIDENCE_COLLECTION',
                        controlIds,
                        automaticCollection: true
                    },
                    {
                        type: 'CONTROL_IMPLEMENTATION_VERIFICATION',
                        verifiers: approvers.filter(a => a.roles.includes('SECURITY_REVIEWER')),
                        requiredApprovals: Math.ceil(approvers.length * 0.5)
                    },
                    {
                        type: 'EXECUTIVE_APPROVAL',
                        approvers: approvers.filter(a => a.roles.includes('EXECUTIVE')),
                        requiredApprovals: 1
                    },
                    {
                        type: 'BLOCKCHAIN_RECORD_CREATION',
                        recordType: 'S2DO_ATTESTATION'
                    }
                ],
                completionActions: [
                    {
                        type: 'UPDATE_COMPLIANCE_STATUS',
                        newStatus: ComplianceStatus.IMPLEMENTED
                    },
                    {
                        type: 'NOTIFICATION',
                        recipients: approvers,
                        template: 'S2DO_COMPLIANCE_COMPLETE'
                    }
                ]
            };
            return this.workflowEngine.createWorkflow(workflowDefinition, {
                integrationId,
                controlIds
            });
        });
    }
    recordBlockchainCompliance(complianceRecord) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Prepare compliance record for blockchain
            const blockchainRecord = {
                assetId: complianceRecord.assetId,
                assetType: complianceRecord.assetType,
                controlId: complianceRecord.controlId,
                controlVersion: complianceRecord.controlVersion,
                implementationStatus: complianceRecord.implementationStatus,
                approverIds: complianceRecord.approvedBy.map(a => a.id),
                timestamp: complianceRecord.approvalTimestamp.toISOString(),
                evidenceHashes: complianceRecord.evidenceReferences.map(ref => this.computeEvidenceHash(ref)),
                attestationHashes: complianceRecord.attestations.map(att => this.computeAttestationHash(att))
            };
            // 2. Create immutable blockchain record
            const transactionId = yield this.blockchainService.recordComplianceAttestation(blockchainRecord);
            // 3. Update compliance record with blockchain reference
            yield this.complianceRepository.updateComplianceRecord(Object.assign(Object.assign({}, complianceRecord), { blockchainRecordId: transactionId }));
            return transactionId;
        });
    }
    // Helper methods
    calculateRiskLevel(control, complianceRecord, evidence) {
        // Implementation of risk calculation logic
        return RiskLevel.LOW;
    }
    calculateSecurityScore(controlAssessments) {
        // Implementation of security score calculation
        return 85;
    }
    generateRecommendations(controlAssessments) {
        // Implementation of recommendation generation
        return [];
    }
    computeEvidenceHash(evidenceReference) {
        // Implementation of evidence hashing
        return "hash-placeholder";
    }
    computeAttestationHash(attestation) {
        // Implementation of attestation hashing
        return "hash-placeholder";
    }
}
var ApprovalType;
(function (ApprovalType) {
    ApprovalType["INTEGRATION_DEPLOYMENT"] = "INTEGRATION_DEPLOYMENT";
    ApprovalType["SECRET_ACCESS"] = "SECRET_ACCESS";
    ApprovalType["COPILOT_DELEGATION"] = "COPILOT_DELEGATION";
    ApprovalType["CONFIGURATION_CHANGE"] = "CONFIGURATION_CHANGE";
    ApprovalType["COMPLIANCE_ATTESTATION"] = "COMPLIANCE_ATTESTATION";
})(ApprovalType || (ApprovalType = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
    ApprovalStatus["EXPIRED"] = "EXPIRED";
})(ApprovalStatus || (ApprovalStatus = {}));
class BlockchainApprovalService {
    constructor(blockchainAdapter, cryptoService, networkConfig) {
        this.blockchainAdapter = blockchainAdapter;
        this.cryptoService = cryptoService;
        this.networkConfig = networkConfig;
    }
    createApprovalRequest(approvalType, assetId, approvalData, requiredApprovers) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Generate unique request ID
            const requestId = crypto.randomUUID();
            // 2. Create approval smart contract transaction
            const approvalRequest = {
                requestId,
                type: approvalType,
                assetId,
                data: approvalData,
                requiredApprovers: requiredApprovers.map(a => a.id),
                minApprovals: this.calculateMinimumApprovals(approvalType, requiredApprovers),
                expirationTime: this.calculateExpirationTime(approvalType),
                metadata: {
                    requestor: approvalData.requestorId,
                    timestamp: new Date().toISOString(),
                    purpose: approvalData.purpose || 'Not specified'
                }
            };
            // 3. Submit to blockchain
            const txResult = yield this.blockchainAdapter.submitTransaction(this.networkConfig.contractId, 'createApprovalRequest', [JSON.stringify(approvalRequest)]);
            // 4. Store reference and return approval record
            return {
                transactionId: txResult.transactionId,
                blockHeight: txResult.blockHeight,
                timestamp: new Date(txResult.timestamp),
                approvalType,
                assetId,
                approvers: requiredApprovers.map(a => a.id),
                approvalData,
                status: ApprovalStatus.PENDING,
                verificationUrl: this.generateVerificationUrl(txResult.transactionId)
            };
        });
    }
    submitApproval(transactionId, approverId, decision, justification) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Create approval signature
            const signature = yield this.cryptoService.signMessage(`${transactionId}:${approverId}:${decision}:${Date.now()}`, approverId);
            // 2. Submit approval to blockchain
            const approvalData = {
                transactionId,
                approverId,
                decision,
                justification,
                timestamp: new Date().toISOString(),
                signature
            };
            const txResult = yield this.blockchainAdapter.submitTransaction(this.networkConfig.contractId, 'submitApproval', [JSON.stringify(approvalData)]);
            // 3. Check if this approval changes overall status
            const updatedRequest = yield this.getApprovalRequest(transactionId);
            return {
                transactionId: txResult.transactionId,
                originalRequestId: transactionId,
                approvalStatus: updatedRequest.status,
                timestamp: new Date(txResult.timestamp),
                approvalIndex: updatedRequest.approvals.length
            };
        });
    }
    verifyApprovalStatus(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Query blockchain for approval status
            const approvalRequest = yield this.getApprovalRequest(transactionId);
            // 2. Verify all approval signatures
            const validSignatures = yield Promise.all(approvalRequest.approvals.map((approval) => __awaiter(this, void 0, void 0, function* () {
                return this.cryptoService.verifySignature(`${transactionId}:${approval.approverId}:${approval.decision}:${approval.timestamp}`, approval.signature, approval.approverId);
            })));
            // 3. Determine overall verification status
            const allSignaturesValid = validSignatures.every(valid => valid);
            return {
                transactionId,
                verified: allSignaturesValid,
                approvalStatus: approvalRequest.status,
                approvals: approvalRequest.approvals.length,
                requiredApprovals: approvalRequest.minApprovals,
                timestamp: new Date(),
                blockchainReference: {
                    chainId: this.networkConfig.chainId,
                    blockHeight: approvalRequest.blockHeight,
                    verificationUrl: this.generateVerificationUrl(transactionId)
                }
            };
        });
    }
    recordComplianceAttestation(attestationData) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Prepare attestation for blockchain recording
            const attestationRecord = {
                type: 'COMPLIANCE_ATTESTATION',
                data: attestationData,
                timestamp: new Date().toISOString(),
                hash: this.cryptoService.hashObject(attestationData)
            };
            // 2. Submit to blockchain
            const txResult = yield this.blockchainAdapter.submitTransaction(this.networkConfig.contractId, 'recordAttestation', [JSON.stringify(attestationRecord)]);
            return txResult.transactionId;
        });
    }
    // Helper methods
    getApprovalRequest(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.blockchainAdapter.queryContract(this.networkConfig.contractId, 'getApprovalRequest', [transactionId]);
            return JSON.parse(result);
        });
    }
    calculateMinimumApprovals(approvalType, approvers) {
        // Implementation of approval threshold calculation based on type and approvers
        switch (approvalType) {
            case ApprovalType.INTEGRATION_DEPLOYMENT:
                return Math.ceil(approvers.length * 0.5);
            case ApprovalType.SECRET_ACCESS:
                return approvers.length; // Require unanimous consent
            default:
                return Math.ceil(approvers.length * 0.5);
        }
    }
    calculateExpirationTime(approvalType) {
        // Implementation of expiration time calculation
        const now = new Date();
        switch (approvalType) {
            case ApprovalType.SECRET_ACCESS:
                return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
            default:
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }
    }
    generateVerificationUrl(transactionId) {
        return `${this.networkConfig.explorerUrl}/tx/${transactionId}`;
    }
}
// INTEGRATION WITH CORE SYSTEMS
class EnhancedIntegrationGateway {
    constructor(authenticator, delegationFramework, secretsVault, s2doGovernance, blockchainApproval) {
        this.authenticator = authenticator;
        this.delegationFramework = delegationFramework;
        this.secretsVault = secretsVault;
        this.s2doGovernance = s2doGovernance;
        this.blockchainApproval = blockchainApproval;
    }
    secureIntegrationDeployment(context, integrationConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Evaluate security posture
            const securityPosture = yield this.s2doGovernance.evaluateSecurityPosture(integrationConfig.id);
            // 2. If security posture meets threshold, proceed with deployment
            if (securityPosture.overallSecurityScore >= this.getSecurityThreshold(integrationConfig.criticality)) {
                // 3. Create blockchain approval request
                const approvers = yield this.identifyRequiredApprovers(integrationConfig.id, securityPosture);
                const approvalRecord = yield this.blockchainApproval.createApprovalRequest(ApprovalType.INTEGRATION_DEPLOYMENT, integrationConfig.id, {
                    requestorId: context.userIdentity.id,
                    integrationName: integrationConfig.name,
                    securityScore: securityPosture.overallSecurityScore,
                    purpose: integrationConfig.purpose
                }, approvers);
                // 4. Return pending status
                return {
                    status: DeploymentStatus.APPROVAL_PENDING,
                    approvalId: approvalRecord.transactionId,
                    requiredApprovers: approvers.map(a => a.id),
                    securityPosture,
                    verificationUrl: approvalRecord.verificationUrl
                };
            }
            else {
                // 5. Return rejected status with recommendations
                return {
                    status: DeploymentStatus.SECURITY_REVIEW_REQUIRED,
                    securityPosture,
                    remediationRequired: true,
                    recommendations: securityPosture.remediationRecommendations
                };
            }
        });
    }
    // Helper methods
    getSecurityThreshold(criticality) {
        // Implementation of threshold calculation
        switch (criticality) {
            case IntegrationCriticality.HIGH:
                return 90;
            case IntegrationCriticality.MEDIUM:
                return 80;
            case IntegrationCriticality.LOW:
                return 70;
            default:
                return 80;
        }
    }
    identifyRequiredApprovers(integrationId, securityPosture) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementation of approver identification logic
            return [];
        });
    }
}
