"use strict";
// SD20 Supporting Services
// Implementations for QR code generation and notifications
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.SD20ServiceFactory = exports.SD20NotificationService = exports.PushNotificationProvider = exports.EmailNotificationProvider = exports.SD20QRCodeService = void 0;
const crypto = __importStar(require("crypto"));
/**
 * Implementation of the QR code service for SD20
 */
class SD20QRCodeService {
    constructor(secretKey) {
        this.secretKey = secretKey;
    }
    /**
     * Generate a secure QR code for an action
     */
    generateQRCode(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Add timestamp to prevent replay attacks
                const payload = Object.assign(Object.assign({}, data), { exp: Date.now() + 1000 * 60 * 60 });
                // Sign the payload
                const signature = this.signPayload(payload);
                // Combine payload and signature
                const qrData = {
                    payload,
                    signature
                };
                // In a real implementation, this would generate an actual QR code
                // For this example, we'll return the data that would be encoded
                return Buffer.from(JSON.stringify(qrData)).toString('base64');
            }
            catch (error) {
                console.error('Error generating QR code:', error);
                throw new Error('Failed to generate QR code');
            }
        });
    }
    /**
     * Verify a QR code is valid
     */
    verifyQRCode(qrCodeData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Decode the QR code data
                const qrData = JSON.parse(Buffer.from(qrCodeData, 'base64').toString());
                const { payload, signature } = qrData;
                // Verify signature
                const isValid = this.verifySignature(payload, signature);
                if (!isValid) {
                    throw new Error('Invalid signature');
                }
                // Check expiration
                if (payload.exp < Date.now()) {
                    throw new Error('QR code has expired');
                }
                return payload;
            }
            catch (error) {
                console.error('Error verifying QR code:', error);
                throw new Error('Failed to verify QR code');
            }
        });
    }
    /**
     * Sign a payload with HMAC
     */
    signPayload(payload) {
        const hmac = crypto.createHmac('sha256', this.secretKey);
        hmac.update(JSON.stringify(payload));
        return hmac.digest('hex');
    }
    /**
     * Verify a signature
     */
    verifySignature(payload, signature) {
        const expectedSignature = this.signPayload(payload);
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
}
exports.SD20QRCodeService = SD20QRCodeService;
/**
 * Email notification provider
 */
class EmailNotificationProvider {
    constructor(apiKey, fromEmail) {
        this.apiKey = apiKey;
        this.fromEmail = fromEmail;
    }
    sendEmail(to, subject, body) {
        return __awaiter(this, void 0, void 0, function* () {
            // In a real implementation, this would use an email service API
            console.log(`Sending email to ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body: ${body}`);
        });
    }
}
exports.EmailNotificationProvider = EmailNotificationProvider;
/**
 * Push notification provider
 */
class PushNotificationProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    sendPush(deviceToken, title, body, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // In a real implementation, this would use a push notification service
            console.log(`Sending push notification to device ${deviceToken}`);
            console.log(`Title: ${title}`);
            console.log(`Body: ${body}`);
            console.log(`Data:`, data);
        });
    }
}
exports.PushNotificationProvider = PushNotificationProvider;
/**
 * Implementation of the notification service for SD20
 */
class SD20NotificationService {
    constructor(emailProvider, pushProvider) {
        this.participantContacts = new Map();
        this.emailProvider = emailProvider;
        this.pushProvider = pushProvider;
    }
    /**
     * Register contact information for a participant
     */
    registerParticipantContact(participantId, contactInfo) {
        this.participantContacts.set(participantId, contactInfo);
    }
    /**
     * Send a notification about an action
     */
    sendActionNotification(participant, action, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const contactInfo = this.participantContacts.get(participant.id);
                if (!contactInfo) {
                    console.warn(`No contact info for participant ${participant.id}`);
                    return;
                }
                const promises = [];
                // Send email if enabled and available
                if (contactInfo.notificationPreferences.email && contactInfo.email) {
                    const emailPromise = this.emailProvider.sendEmail(contactInfo.email, `Action Required: ${action.action}`, this.generateActionEmailBody(participant, action, message));
                    promises.push(emailPromise);
                }
                // Send push notification if enabled and available
                if (contactInfo.notificationPreferences.push && contactInfo.deviceToken) {
                    const pushPromise = this.pushProvider.sendPush(contactInfo.deviceToken, `Action Required: ${this.formatActionForNotification(action.action)}`, message, {
                        actionId: action.id,
                        type: 'action_verification',
                        url: `app://sd20/verify/${action.id}`
                    });
                    promises.push(pushPromise);
                }
                // Wait for all notifications to be sent
                yield Promise.all(promises);
            }
            catch (error) {
                console.error('Error sending notification:', error);
                throw new Error('Failed to send notification');
            }
        });
    }
    /**
     * Generate the email body for an action notification
     */
    generateActionEmailBody(participant, action, message) {
        return `
Hello ${participant.name},

${message}

Action Details:
- Type: ${this.formatActionForNotification(action.action)}
- Description: ${action.description}
- Initiated by: ${action.initiator.name}
- Created at: ${new Date(action.metadata.createdAt).toLocaleString()}
${action.metadata.expiresAt ? `- Expires at: ${new Date(action.metadata.expiresAt).toLocaleString()}` : ''}

To verify this action, please click the link below or scan the QR code in the attachment:
https://sd20.ai/verify/${action.id}

Thank you,
SD20 System
`;
    }
    /**
     * Format an action for display in notifications
     */
    formatActionForNotification(action) {
        // Convert S2DO:Approve:Invoice to "Approve Invoice"
        return action.replace('S2DO:', '').replace(':', ' ');
    }
}
exports.SD20NotificationService = SD20NotificationService;
/**
 * Factory to create all necessary SD20 services
 */
class SD20ServiceFactory {
    static createQRCodeService(secretKey) {
        return new SD20QRCodeService(secretKey);
    }
    static createNotificationService(emailApiKey, fromEmail, pushApiKey) {
        const emailProvider = new EmailNotificationProvider(emailApiKey, fromEmail);
        const pushProvider = new PushNotificationProvider(pushApiKey);
        return new SD20NotificationService(emailProvider, pushProvider);
    }
}
exports.SD20ServiceFactory = SD20ServiceFactory;
