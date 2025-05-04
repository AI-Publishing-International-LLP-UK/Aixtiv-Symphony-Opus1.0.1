// SD20 Supporting Services
// Implementations for QR code generation and notifications

import * as crypto from 'crypto';
import { QRCodeService, NotificationService, Participant, SD20ActionRecord } from './sd20-core';

/**
 * Implementation of the QR code service for SD20
 */
export class SD20QRCodeService implements QRCodeService {
  private secretKey: string;
  
  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }
  
  /**
   * Generate a secure QR code for an action
   */
  async generateQRCode(data: any): Promise<string> {
    try {
      // Add timestamp to prevent replay attacks
      const payload = {
        ...data,
        exp: Date.now() + 1000 * 60 * 60, // 1 hour expiration
      };
      
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
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }
  
  /**
   * Verify a QR code is valid
   */
  async verifyQRCode(qrCodeData: string): Promise<any> {
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
    } catch (error) {
      console.error('Error verifying QR code:', error);
      throw new Error('Failed to verify QR code');
    }
  }
  
  /**
   * Sign a payload with HMAC
   */
  private signPayload(payload: any): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
  
  /**
   * Verify a signature
   */
  private verifySignature(payload: any, signature: string): boolean {
    const expectedSignature = this.signPayload(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

/**
 * Email notification provider
 */
export class EmailNotificationProvider {
  private apiKey: string;
  private fromEmail: string;
  
  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }
  
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // In a real implementation, this would use an email service API
    console.log(`Sending email to ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
  }
}

/**
 * Push notification provider
 */
export class PushNotificationProvider {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async sendPush(deviceToken: string, title: string, body: string, data?: any): Promise<void> {
    // In a real implementation, this would use a push notification service
    console.log(`Sending push notification to device ${deviceToken}`);
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);
    console.log(`Data:`, data);
  }
}

/**
 * Implementation of the notification service for SD20
 */
export class SD20NotificationService implements NotificationService {
  private emailProvider: EmailNotificationProvider;
  private pushProvider: PushNotificationProvider;
  private participantContacts: Map<string, {
    email?: string;
    deviceToken?: string;
    notificationPreferences: {
      email: boolean;
      push: boolean;
    }
  }> = new Map();
  
  constructor(
    emailProvider: EmailNotificationProvider,
    pushProvider: PushNotificationProvider
  ) {
    this.emailProvider = emailProvider;
    this.pushProvider = pushProvider;
  }
  
  /**
   * Register contact information for a participant
   */
  registerParticipantContact(
    participantId: string,
    contactInfo: {
      email?: string;
      deviceToken?: string;
      notificationPreferences: {
        email: boolean;
        push: boolean;
      }
    }
  ): void {
    this.participantContacts.set(participantId, contactInfo);
  }
  
  /**
   * Send a notification about an action
   */
  async sendActionNotification(
    participant: Participant,
    action: SD20ActionRecord,
    message: string
  ): Promise<void> {
    try {
      const contactInfo = this.participantContacts.get(participant.id);
      if (!contactInfo) {
        console.warn(`No contact info for participant ${participant.id}`);
        return;
      }
      
      const promises: Promise<void>[] = [];
      
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
            actionId: action.id,
            type: 'action_verification',
            url: `app://sd20/verify/${action.id}`
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
  private generateActionEmailBody(
    participant: Participant,
    action: SD20ActionRecord,
    message: string
  ): string {
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
  private formatActionForNotification(action: string): string {
    // Convert S2DO:Approve:Invoice to "Approve Invoice"
    return action.replace('S2DO:', '').replace(':', ' ');
  }
}

/**
 * Factory to create all necessary SD20 services
 */
export class SD20ServiceFactory {
  static createQRCodeService(secretKey: string): SD20QRCodeService {
    return new SD20QRCodeService(secretKey);
  }
  
  static createNotificationService(
    emailApiKey: string,
    fromEmail: string,
    pushApiKey: string
  ): SD20NotificationService {
    const emailProvider = new EmailNotificationProvider(emailApiKey, fromEmail);
    const pushProvider = new PushNotificationProvider(pushApiKey);
    return new SD20NotificationService(emailProvider, pushProvider);
  }
}
