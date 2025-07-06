"use strict";
// IMPLEMENTATION 1: WEBAUTHN + PASSKEYS INTEGRATION
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@simplewebauthn/server");
class PasskeyAuthenticationService {
    constructor(rpID, rpName, userRepository, challengeRepository) {
        this.rpID = rpID;
        this.rpName = rpName;
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
    }
    initiateRegistration(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Generate a cryptographically secure random challenge
            const challenge = crypto.randomBytes(32).toString('base64url');
            // Store the challenge for verification later
            yield this.challengeRepository.saveChallenge(userId, challenge);
            const options = {
                rpID: this.rpID,
                rpName: this.rpName,
                userID: userId,
                userName: user.email,
                userDisplayName: user.displayName,
                timeout: 60000,
                attestationType: 'none',
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                    residentKey: 'required',
                },
                supportedAlgorithmIDs: [-7, -257], // ES256, RS256
                challenge,
            };
            return options;
        });
    }
    completeRegistration(userId, response) {
        return __awaiter(this, void 0, void 0, function* () {
            // Retrieve the challenge
            const expectedChallenge = yield this.challengeRepository.getChallenge(userId);
            if (!expectedChallenge) {
                throw new Error('Challenge not found');
            }
            // Verify the registration response
            const verification = yield (0, server_1.verifyRegistrationResponse)({
                response,
                expectedChallenge,
                expectedOrigin: `https://${this.rpID}`,
                expectedRPID: this.rpID,
            });
            if (verification.verified) {
                // Store the credential
                const { credentialID, credentialPublicKey } = verification.registrationInfo;
                yield this.userRepository.addCredential(userId, {
                    id: credentialID,
                    publicKey: credentialPublicKey,
                    createdAt: new Date(),
                });
                // Clean up the challenge
                yield this.challengeRepository.removeChallenge(userId);
                return {
                    success: true,
                    credentialID: credentialID.toString('base64url'),
                };
            }
            else {
                throw new Error('Registration verification failed');
            }
        });
    }
    initiateAuthentication(username) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findByEmail(username);
            if (!user) {
                throw new Error('User not found');
            }
            // Generate a cryptographically secure random challenge
            const challenge = crypto.randomBytes(32).toString('base64url');
            // Store the challenge for verification later
            yield this.challengeRepository.saveChallenge(user.id, challenge);
            // Get user's registered credentials
            const credentials = yield this.userRepository.getCredentials(user.id);
            const options = {
                rpID: this.rpID,
                timeout: 60000,
                userVerification: 'required',
                allowCredentials: credentials.map(cred => ({
                    id: cred.id,
                    type: 'public-key',
                    transports: ['internal', 'ble', 'nfc', 'usb'],
                })),
                challenge,
            };
            return options;
        });
    }
    completeAuthentication(username, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findByEmail(username);
            if (!user) {
                throw new Error('User not found');
            }
            // Retrieve the challenge
            const expectedChallenge = yield this.challengeRepository.getChallenge(user.id);
            if (!expectedChallenge) {
                throw new Error('Challenge not found');
            }
            // Find the credential
            const credential = yield this.userRepository.findCredentialById(response.id);
            if (!credential) {
                throw new Error('Credential not found');
            }
            // Verify the authentication response
            const verification = yield (0, server_1.verifyAuthenticationResponse)({
                response,
                expectedChallenge,
                expectedOrigin: `https://${this.rpID}`,
                expectedRPID: this.rpID,
                authenticator: {
                    credentialID: credential.id,
                    credentialPublicKey: credential.publicKey,
                    counter: credential.counter,
                },
            });
            if (verification.verified) {
                // Update the credential counter
                yield this.userRepository.updateCredentialCounter(credential.id, verification.authenticationInfo.newCounter);
                // Clean up the challenge
                yield this.challengeRepository.removeChallenge(user.id);
                return {
                    success: true,
                    userId: user.id,
                };
            }
            else {
                throw new Error('Authentication verification failed');
            }
        });
    }
}
// IMPLEMENTATION 2: SECURE CO-PILOT DELEGATION API
class CoPilotAPI {
    constructor(delegationFramework) {
        this.delegationFramework = delegationFramework;
    }
    requestAccess(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customerId, scope, duration, justification } = req.body;
                const coPilotId = req.user.id;
                // Create delegation request with strict constraints
                const delegationRequest = {
                    scope,
                    expiration: new Date(Date.now() + duration),
                    constraints: {
                        allowedOperations: this.determineAllowedOperations(scope),
                        networkRestrictions: {
                            allowedIPs: [req.ip],
                            allowedRegions: [this.getRegionFromIP(req.ip)],
                        },
                        timeRestrictions: {
                            maxSessionDuration: duration,
                            allowedTimeWindows: this.getBusinessHours(),
                        },
                        approvalRequirements: {
                            requiresCustomerApproval: this.requiresApproval(scope),
                            notificationRecipients: this.getNotificationRecipients(customerId),
                        },
                    },
                    justification,
                };
                // Create notification for customer if approval required
                if (delegationRequest.constraints.approvalRequirements.requiresCustomerApproval) {
                    yield this.sendApprovalRequest(customerId, coPilotId, delegationRequest);
                    res.status(202).json({
                        status: 'APPROVAL_PENDING',
                        requestId: crypto.randomUUID(),
                        message: 'Access request sent to customer for approval',
                    });
                    return;
                }
                // For pre-approved scopes, grant immediate access
                const ownerContext = yield this.getCustomerContext(customerId);
                const coPilotIdentity = yield this.getCoPilotIdentity(coPilotId);
                const delegationResult = yield this.delegationFramework.createDelegatedSession(ownerContext, coPilotIdentity, delegationRequest);
                res.status(200).json({
                    status: 'ACCESS_GRANTED',
                    delegationToken: delegationResult.delegationToken,
                    expiresAt: delegationResult.expiresAt,
                    monitoringUrl: `/monitoring/sessions/${delegationResult.monitoringSessionId}`,
                });
            }
            catch (error) {
                logger.error('Error in co-pilot access request', error);
                res.status(500).json({
                    status: 'ERROR',
                    message: 'Failed to process access request',
                });
            }
        });
    }
    approveAccess(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // Handle customer approval of delegation request
        });
    }
    revokeAccess(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // Handle immediate revocation of delegation
        });
    }
    monitorActivity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            // Set up SSE connection for real-time activity monitoring
            const sessionId = req.params.sessionId;
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            const activityStream = yield this.delegationFramework.monitorDelegatedSession(sessionId);
            activityStream.on('activity', (activity) => {
                res.write(`data: ${JSON.stringify(activity)}\n\n`);
            });
            activityStream.on('end', () => {
                res.end();
            });
            req.on('close', () => {
                activityStream.close();
            });
        });
    }
}
// IMPLEMENTATION 3: SECURE SECRETS TRANSFER USING VAULT NEGOTIATION PROTOCOL
class SecureSecretsTransferProtocol {
    constructor(vault, cryptoService) {
        this.vault = vault;
        this.cryptoService = cryptoService;
    }
    initiateTransfer(senderIdentity, recipientIdentity, secretReference, transferPolicy) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Generate a one-time transfer key
            const transferKey = yield this.cryptoService.generateTransferKey();
            // 2. Create a secure transfer session
            const sessionId = crypto.randomUUID();
            const sessionKey = yield this.cryptoService.deriveSessionKey(sessionId, transferKey);
            // 3. Set up transfer policy with strict controls
            const transferSession = {
                id: sessionId,
                senderIdentity,
                recipientIdentity,
                secretReference,
                policy: transferPolicy,
                status: TransferStatus.INITIATED,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
                transferKey: yield this.cryptoService.encryptAsymmetric(transferKey, recipientIdentity.publicKey),
            };
            // 4. Store transfer session securely
            yield this.storeTransferSession(transferSession);
            // 5. Return session information to sender
            return {
                id: sessionId,
                recipientId: recipientIdentity.id,
                secretId: secretReference.id,
                expiresAt: transferSession.expiresAt,
                status: TransferStatus.INITIATED,
            };
        });
    }
    acceptTransfer(sessionId, recipientIdentity, transferKeyEncrypted) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Retrieve transfer session
            const session = yield this.retrieveTransferSession(sessionId);
            if (!session || session.status !== TransferStatus.INITIATED) {
                throw new Error('Invalid transfer session');
            }
            // 2. Verify recipient identity
            if (session.recipientIdentity.id !== recipientIdentity.id) {
                throw new Error('Unauthorized recipient');
            }
            // 3. Decrypt transfer key
            const transferKey = yield this.cryptoService.decryptAsymmetric(transferKeyEncrypted, recipientIdentity.privateKey);
            // 4. Access the secret from vault with transfer context
            const accessContext = {
                purpose: AccessPurpose.SECURE_TRANSFER,
                sessionId,
                transferKey,
            };
            const secret = yield this.vault.accessSecret(session.secretReference, recipientIdentity, AccessPurpose.SECURE_TRANSFER, accessContext);
            // 5. Update session status
            yield this.updateTransferSessionStatus(sessionId, TransferStatus.COMPLETED);
            return secret;
        });
    }
    cancelTransfer(sessionId, identity) {
        return __awaiter(this, void 0, void 0, function* () {
            // Cancel an in-progress transfer
            const session = yield this.retrieveTransferSession(sessionId);
            if (!session) {
                throw new Error('Transfer session not found');
            }
            // Verify the identity is the sender
            if (session.senderIdentity.id !== identity.id) {
                throw new Error('Unauthorized cancellation attempt');
            }
            // Update session status
            yield this.updateTransferSessionStatus(sessionId, TransferStatus.CANCELLED);
        });
    }
}
