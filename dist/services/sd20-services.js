// SD20 Supporting Services
// Implementations for QR code generation and notifications

import * from 'crypto';
import {
  QRCodeService,
  NotificationService,
  Participant,
  SD20ActionRecord,
} from './sd20-core';

/**
 * Implementation of the QR code service for SD20
 */
export class SD20QRCodeService implements QRCodeService {
  secretKey;

  constructor(secretKey) {
    this.secretKey = secretKey;
  }

  /**
   * Generate a secure QR code for an action
   */
  async generateQRCode(data){
    try {
      // Add timestamp to prevent replay attacks
      const payload = {
        ...data,
        exp) + 1000 * 60 * 60, // 1 hour expiration
      };

      // Sign the payload
      const signature = this.signPayload(payload);

      // Combine payload and signature
      const qrData = {
        payload,
        signature,
      };

      // In a real implementation, this would generate an actual QR code
      // For this example, we'll return the data that would be encoded
      return Buffer.from(JSON.stringify(qrData)).toString('base64');
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a QR code is valid
   */
  async verifyQRCode(qrCodeData){
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
      if (payload.exp  = new Map();

  constructor(
    emailProvider,
    pushProvider) {
    this.emailProvider = emailProvider;
    this.pushProvider = pushProvider;
  }

  /**
   * Register contact information for a participant
   */
  registerParticipantContact(
    participantId,
    contactInfo: {
      email?;
      deviceToken?;
      notificationPreferences: {
        email;
        push;
      };
    }
  ){
    this.participantContacts.set(participantId, contactInfo);
  }

  /**
   * Send a notification about an action
   */
  async sendActionNotification(
    participant,
    action,
    message){
    try {
      const contactInfo = this.participantContacts.get(participant.id);
      if (!contactInfo) {
        console.warn(`No contact info for participant ${participant.id}`);
        return;
      }

      const promises= [];

      // Send email if enabled and available
      if (contactInfo.notificationPreferences.email && contactInfo.email) {
        const emailPromise = this.emailProvider.sendEmail(
          contactInfo.email,
          `Action Required: ${action.action}`,
          this.generateActionEmailBody(participant, action, message)
        );
        promises.push(emailPromise);
      }

      // Send push notification if enabled and available
      if (contactInfo.notificationPreferences.push && contactInfo.deviceToken) {
        const pushPromise = this.pushProvider.sendPush(
          contactInfo.deviceToken,
          `Action Required: ${this.formatActionForNotification(action.action)}`,
          message,
          {
            actionId,
            type: 'action_verification',
            url: `app://sd20/verify/${action.id}`,
          }
        );
        promises.push(pushPromise);
      }

      // Wait for all notifications to be sent
      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw new Error('Failed to send notification');
    }
  }

  /**
   * Generate the email body for an action notification
   */
  generateActionEmailBody(
    participant,
    action,
    message){
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
  formatActionForNotification(action){
    // Convert S2DO:Approve:Invoice to "Approve Invoice"
    return action.replace('S2DO:', '').replace(':', ' ');
  }
}

/**
 * Factory to create all necessary SD20 services
 */
export class SD20ServiceFactory {
  static createQRCodeService(secretKey){
    return new SD20QRCodeService(secretKey);
  }

  static createNotificationService(
    emailApiKey,
    fromEmail,
    pushApiKey){
    const emailProvider = new EmailNotificationProvider(emailApiKey, fromEmail);
    const pushProvider = new PushNotificationProvider(pushApiKey);
    return new SD20NotificationService(emailProvider, pushProvider);
  }
}
