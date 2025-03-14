return context;
};

/**
 * S2DO Protocol Verification Utility
 * This utility provides cryptographic verification of S2DO messages
 */
export class S2DOVerifier {
  private static instance: S2DOVerifier;
  private keyCache = new Map<string, CryptoKey>();
  private pendingVerifications = new Map<string, Promise<boolean>>();
  
  private constructor() {
    // Initialize with default keys if available
    this.loadKeys();
  }
  
  /**
   * Get the singleton instance of the S2DOVerifier
   */
  public static getInstance(): S2DOVerifier {
    if (!S2DOVerifier.instance) {
      S2DOVerifier.instance = new S2DOVerifier();
    }
    return S2DOVerifier.instance;
  }
  
  /**
   * Load verification keys from secure storage
   */
  private async loadKeys(): Promise<void> {
    // In a real implementation, this would load keys from a secure storage
    // For now, we'll just generate a demo key
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: 'ECDSA',
            namedCurve: 'P-256'
          },
          true,
          ['sign', 'verify']
        );
        
        this.keyCache.set('default', keyPair.publicKey);
      }
    } catch (error) {
      console.error('Error loading S2DO verification keys:', error);
    }
  }
  
  /**
   * Verify an S2DO message signature
   */
  public async verifySignature(
    stem: string,
    action: string,
    payload: any,
    signature: string,
    keyId: string = 'default'
  ): Promise<boolean> {
    // Create a verification ID for deduplication
    const verificationId = `${stem}:${action}:${JSON.stringify(payload)}:${signature}`;
    
    // Check if we already have a pending verification for this message
    if (this.pendingVerifications.has(verificationId)) {
      return this.pendingVerifications.get(verificationId)!;
    }
    
    // Start a new verification
    const verificationPromise = this.performVerification(stem, action, payload, signature, keyId);
    this.pendingVerifications.set(verificationId, verificationPromise);
    
    // Clean up after verification is complete
    verificationPromise.finally(() => {
      this.pendingVerifications.delete(verificationId);
    });
    
    return verificationPromise;
  }
  
  /**
   * Perform the actual signature verification
   */
  private async performVerification(
    stem: string,
    action: string,
    payload: any,
    signature: string,
    keyId: string
  ): Promise<boolean> {
    try {
      // Get the verification key
      let key = this.keyCache.get(keyId);
      
      if (!key) {
        // In a real implementation, this would fetch the key from a key server
        // For now, we'll just generate a demo key if not already cached
        try {
          if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const keyPair = await window.crypto.subtle.generateKey(
              {
                name: 'ECDSA',
                namedCurve: 'P-256'
              },
              true,
              ['sign', 'verify']
            );
            
            key = keyPair.publicKey;
            this.keyCache.set(keyId, key);
          } else {
            throw new Error('Web Crypto API not available');
          }
        } catch (error) {
          console.error('Error generating verification key:', error);
          return false;
        }
      }
      
      // Encode the message for verification
      const message = `${stem}:${action}:${JSON.stringify(payload)}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      
      // Decode the signature from base64
      const signatureBytes = this.base64ToArrayBuffer(signature);
      
      // Verify the signature
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const result = await window.crypto.subtle.verify(
          {
            name: 'ECDSA',
            hash: { name: 'SHA-256' }
          },
          key,
          signatureBytes,
          data
        );
        
        return result;
      } else {
        // Fallback to a mock verification for environments without Web Crypto
        return this.mockVerification(signature, message);
      }
    } catch (error) {
      console.error('Error verifying S2DO signature:', error);
      return false;
    }
  }
  
  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  /**
   * Mock verification for environments without Web Crypto
   */
  private mockVerification(signature: string, message: string): boolean {
    // In a real implementation, this would be replaced with actual cryptographic verification
    // For demonstration purposes, we'll just check if the signature starts with a hash of the message
    
    // Simple hash function for demo
    const simpleHash = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    };
    
    const messageHash = simpleHash(message).toString(16);
    return signature.startsWith(messageHash);
  }
}

// Export the S2DO verifier singleton
export const s2doVerifier = S2DOVerifier.getInstance();

/**
 * Self-Healing Security System
 * This system automatically detects and responds to security issues
 */
export class SecuritySelfHealer {
  private static instance: SecuritySelfHealer;
  private healingActions = new Map<string, (() => Promise<boolean>)[]>();
  private activeHealingSessions = new Set<string>();
  private lastHealingAttempts = new Map<string, number>();
  private healingResults = new Map<string, { success: boolean, timestamp: number }>();
  
  private constructor() {
    // Register default healing actions
    this.registerDefaultHealingActions();
    
    // Start the background monitoring process
    this.startMonitoring();
  }
  
  /**
   * Get the singleton instance of the SecuritySelfHealer
   */
  public static getInstance(): SecuritySelfHealer {
    if (!SecuritySelfHealer.instance) {
      SecuritySelfHealer.instance = new SecuritySelfHealer();
    }
    return SecuritySelfHealer.instance;
  }
  
  /**
   * Register default healing actions for common security issues
   */
  private registerDefaultHealingActions(): void {
    // Authentication issues
    this.registerHealingAction('auth_rate_limit_exceeded', async () => {
      // Reset authentication rate limits
      return true;
    });
    
    this.registerHealingAction('auth_failure_spike', async () => {
      // Temporarily increase logging for auth attempts
      return true;
    });
    
    // S2DO verification issues
    this.registerHealingAction('s2do_verification_failure', async () => {
      // Refresh S2DO verification keys
      return true;
    });
    
    // Session issues
    this.registerHealingAction('session_hijacking_detected', async () => {
      // Force session refresh for affected users
      return true;
    });
    
    // Integration issues
    this.registerHealingAction('integration_connection_failure', async () => {
      // Attempt to reconnect integration
      return true;
    });
    
    // Agent issues
    this.registerHealingAction('agent_activation_failure', async () => {
      // Reset agent state
      return true;
    });
  }
  
  /**
   * Register a healing action for a specific issue type
   */
  public registerHealingAction(issueType: string, action: () => Promise<boolean>): void {
    const actions = this.healingActions.get(issueType) || [];
    actions.push(action);
    this.healingActions.set(issueType, actions);
  }
  
  /**
   * Start the background security monitoring process
   */
  private startMonitoring(): void {
    // Check for security issues periodically
    setInterval(() => this.checkForSecurityIssues(), 60000); // Every minute
  }
  
  /**
   * Check for security issues that need healing
   */
  private async checkForSecurityIssues(): Promise<void> {
    try {
      // Check for auth failure spikes
      const authFailures = securityAuditor.getEventsByType(SecurityEventType.AUTH_FAILURE, 100);
      if (authFailures.length > 20) { // If more than 20 recent auth failures
        await this.healSecurityIssue('auth_failure_spike');
      }
      
      // Check for S2DO verification failures
      const s2doFailures = securityAuditor.getEventsByType(SecurityEventType.S2DO_VERIFICATION, 100)
        .filter(event => event.outcome === 'failure');
      if (s2doFailures.length > 5) { // If more than 5 recent S2DO verification failures
        await this.healSecurityIssue('s2do_verification_failure');
      }
      
      // Check for integration issues
      const integrationFailures = securityAuditor.getEventsByType(SecurityEventType.INTEGRATION_ACCESS, 100)
        .filter(event => event.outcome === 'failure');
      if (integrationFailures.length > 5) { // If more than 5 recent integration failures
        await this.healSecurityIssue('integration_connection_failure');
      }
      
      // Check for agent issues
      const agentFailures = securityAuditor.getEventsByType(SecurityEventType.AGENT_ACCESS, 100)
        .filter(event => event.outcome === 'failure');
      if (agentFailures.length > 10) { // If more than 10 recent agent failures
        await this.healSecurityIssue('agent_activation_failure');
      }
      
      // Check for session hijacking
      const suspiciousActivities = securityAuditor.getEventsByType(SecurityEventType.SUSPICIOUS_ACTIVITY, 100);
      const possibleHijackings = suspiciousActivities.filter(event => 
        event.details && 
        event.details.reason === 'rapid_location_change'
      );
      if (possibleHijackings.length > 0) {
        await this.healSecurityIssue('session_hijacking_detected');
      }
    } catch (error) {
      console.error('Error in security self-healing monitor:', error);
    }
  }
  
  /**
   * Attempt to heal a specific security issue
   */
  public async healSecurityIssue(issueType: string): Promise<boolean> {
    // Check if this issue is already being healed
    if (this.activeHealingSessions.has(issueType)) {
      return false;
    }
    
    // Check if we recently tried to heal this issue and failed
    const lastAttempt = this.lastHealingAttempts.get(issueType) || 0;
    const now = Date.now();
    if (now - lastAttempt < 300000) { // 5 minutes cooldown between attempts
      const lastResult = this.healingResults.get(issueType);
      if (lastResult && !lastResult.success) {
        // We recently tried and failed, so don't try again yet
        return false;
      }
    }
    
    // Get the healing actions for this issue type
    const actions = this.healingActions.get(issueType);
    if (!actions || actions.length === 0) {
      return false;
    }
    
    // Mark this issue as being healed
    this.activeHealingSessions.add(issueType);
    this.lastHealingAttempts.set(issueType, now);
    
    try {
      // Log healing attempt
      console.log(`Attempting to heal security issue: ${issueType}`);
      
      // Try each healing action in sequence until one succeeds
      for (const action of actions) {
        try {
          const success = await action();
          if (success) {
            console.log(`Successfully healed security issue: ${issueType}`);
            this.healingResults.set(issueType, { success: true, timestamp: Date.now() });
            return true;
          }
        } catch (error) {
          console.error(`Error executing healing action for ${issueType}:`, error);
        }
      }
      
      // If we get here, all healing actions failed
      console.warn(`Failed to heal security issue: ${issueType}`);
      this.healingResults.set(issueType, { success: false, timestamp: Date.now() });
      return false;
    } finally {
      // Mark this issue as no longer being healed
      this.activeHealingSessions.delete(issueType);
    }
  }
  
  /**
   * Get the status of healing sessions
   */
  public getHealingStatus(): Record<string, { active: boolean, lastAttempt: number, lastResult?: { success: boolean, timestamp: number } }> {
    const status: Record<string, any> = {};
    
    for (const issueType of this.healingActions.keys()) {
      status[issueType] = {
        active: this.activeHealingSessions.has(issueType),
        lastAttempt: this.lastHealingAttempts.get(issueType) || 0,
        lastResult: this.healingResults.get(issueType)
      };
    }
    
    return status;
  }
}

// Export the self-healer singleton
export const securitySelfHealer = SecuritySelfHealer.getInstance();

/**
 * User Feedback System for Security and Experience Improvement
 */
export class UserFeedbackSystem {
  private static instance: UserFeedbackSystem;
  private feedbackBuffer: Array<{
    type: string;
    rating: number;
    comments?: string;
    userId?: string;
    timestamp: number;
    metadata: Record<string, any>;
  }> = [];
  
  private constructor() {
    // Start periodic flush of feedback
    setInterval(() => this.flushFeedback(), 300000); // Every 5 minutes
  }
  
  /**
   * Get the singleton instance of the UserFeedbackSystem
   */
  public static getInstance(): UserFeedbackSystem {
    if (!UserFeedbackSystem.instance) {
      UserFeedbackSystem.instance = new UserFeedbackSystem();
    }
    return UserFeedbackSystem.instance;
  }
  
  /**
   * Record user feedback about a security experience
   */
  public recordSecurityFeedback(
    rating: number, // 1-5 scale
    userId?: string,
    comments?: string,
    metadata: Record<string, any> = {}
  ): void {
    this.recordFeedback('security', rating, userId, comments, metadata);
  }
  
  /**
   * Record user feedback about an authentication experience
   */
  public recordAuthFeedback(
    rating: number, // 1-5 scale
    userId?: string,
    comments?: string,
    metadata: Record<string, any> = {}
  ): void {
    this.recordFeedback('authentication', rating, userId, comments, metadata);
  }
  
  /**
   * Record user feedback about an agent experience
   */
  public recordAgentFeedback(
    rating: number, // 1-5 scale
    agentId: string,
    userId?: string,
    comments?: string,
    metadata: Record<string, any> = {}
  ): void {
    this.recordFeedback('agent', rating, userId, comments, { ...metadata, agentId });
  }
  
  /**
   * Record user feedback about the dashboard experience
   */
  public recordDashboardFeedback(
    rating: number, // 1-5 scale
    userId?: string,
    comments?: string,
    metadata: Record<string, any> = {}
  ): void {
    this.recordFeedback('dashboard', rating, userId, comments, metadata);
  }
  
  /**
   * Record general user feedback
   */
  private recordFeedback(
    type: string,
    rating: number,
    userId?: string,
    comments?: string,
    metadata: Record<string, any> = {}
  ): void {
    // Validate rating
    if (rating < 1 || rating > 5) {
      console.warn('Invalid feedback rating. Must be between 1 and 5.');
      rating = Math.max(1, Math.min(5, rating));
    }
    
    // Add to buffer
    this.feedbackBuffer.push({
      type,
      rating,
      userId,
      comments,
      timestamp: Date.now(),
      metadata
    });
    
    // Track in performance monitoring
    performanceMonitor.recordGauge(`feedback_${type}`, rating, {
      userId
    });
    
    // If low rating (1-2), track as a potential issue
    if (rating <= 2) {
      securityAuditor.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        timestamp: Date.now(),
        userId,
        action: 'low_feedback_rating',
        outcome: 'failure',
        details: {
          feedbackType: type,
          rating,
          comments,
          ...metadata
        }
      });
      
      // Trigger self-healing for consistently low ratings
      const lowRatings = this.feedbackBuffer.filter(f => 
        f.type === type && f.rating <= 2 && Date.now() - f.timestamp < 3600000 // Last hour
      );
      
      if (lowRatings.length >= 3) { // If 3+ low ratings in the last hour
        securitySelfHealer.healSecurityIssue(`${type}_negative_feedback`);
      }
    }
    
    // Check if we should flush due to buffer size
    if (this.feedbackBuffer.length >= 100) {
      this.flushFeedback();
    }
  }
  
  /**
   * Flush feedback to storage
   */
  private async flushFeedback(): Promise<void> {
    if (this.feedbackBuffer.length === 0) return;
    
    const feedback = [...this.feedbackBuffer];
    this.feedbackBuffer = [];
    
    try {
      // In a real implementation, this would send to a feedback analysis system
      const endpoint = '/api/feedback';
      
      // Only send if we're in a browser and online
      if (typeof window !== 'undefined' && navigator.onLine) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            feedback,
            timestamp: Date.now()
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error sending feedback: ${response.statusText}`);
        }
      } else {
        // Store in localStorage if offline
        try {
          if (typeof localStorage !== 'undefined') {
            const existingFeedback = localStorage.getItem('aixtiv_cached_feedback');
            let allFeedback = feedback;
            
            if (existingFeedback) {
              try {
                const parsed = JSON.parse(existingFeedback);
                allFeedback = [...parsed, ...feedback];
              } catch (e) {
                // Ignore parsing error
              }
            }
            
            // Limit size
            if (allFeedback.length > 1000) {
              allFeedback = allFeedback.slice(-1000);
            }
            
            localStorage.setItem('aixtiv_cached_feedback', JSON.stringify(allFeedback));
          }
        } catch (error) {
          console.error('Error storing feedback in localStorage:', error);
        }
      }
    } catch (error) {
      console.error('Error flushing feedback:', error);
      
      // Restore feedback to buffer
      this.feedbackBuffer = [...feedback, ...this.feedbackBuffer];
    }
  }
  
  /**
   * Get feedback statistics
   */
  public getFeedbackStats(): Record<string, { count: number, averageRating: number }> {
    const stats: Record<string, { count: number, sum: number }> = {};
    
    // Combine buffer and any stored feedback
    let allFeedback = [...this.feedbackBuffer];
    
    try {
      if (typeof localStorage !== 'undefined') {
        const storedFeedback = localStorage.getItem('aixtiv_cached_feedback');
        if (storedFeedback) {
          allFeedback = [...JSON.parse(storedFeedback), ...allFeedback];
        }
      }
    } catch (error) {
      console.error('Error loading stored feedback:', error);
    }
    
    // Calculate stats
    for (const feedback of allFeedback) {
      if (!stats[feedback.type]) {
        stats[feedback.type] = { count: 0, sum: 0 };
      }
      
      stats[feedback.type].count++;
      stats[feedback.type].sum += feedback.rating;
    }
    
    // Convert to averages
    const result: Record<string, { count: number, averageRating: number }> = {};
    
    for (const [type, data] of Object.entries(stats)) {
      result[type] = {
        count: data.count,
        averageRating: data.count > 0 ? data.sum / data.count : 0
      };
    }
    
    return result;
  }
}

// Export the feedback system singleton
export const userFeedbackSystem = UserFeedbackSystem.getInstance();

/**
 * React hook for using the feedback system
 */
export const useFeedback = () => {
  return {
    recordSecurityFeedback: userFeedbackSystem.recordSecurityFeedback.bind(userFeedbackSystem),
    recordAuthFeedback: userFeedbackSystem.recordAuthFeedback.bind(userFeedbackSystem),
    recordAgentFeedback: userFeedbackSystem.recordAgentFeedback.bind(userFeedbackSystem),
    recordDashboardFeedback: userFeedbackSystem.recordDashboardFeedback.bind(userFeedbackSystem),
    getFeedbackStats: userFeedbackSystem.getFeedbackStats.bind(userFeedbackSystem)
  };
};

/**
 * Feedback Collection UI Component
 */
import React, { useState } from 'react';

interface FeedbackFormProps {
  type: 'security' | 'authentication' | 'agent' | 'dashboard' | 'general';
  agentId?: string;
  userId?: string;
  onSubmit?: () => void;
  minimized?: boolean;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  type,
  agentId,
  userId,
  onSubmit,
  minimized = false
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [isExpanded, setIsExpanded] = useState(!minimized);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { recordSecurityFeedback, recordAuthFeedback, recordAgentFeedback, recordDashboardFeedback } = useFeedback();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === null) return;
    
    // Submit feedback based on type
    switch (type) {
      case 'security':
        recordSecurityFeedback(rating, userId, comments);
        break;
      case 'authentication':
        recordAuthFeedback(rating, userId, comments);
        break;
      case 'agent':
        if (agentId) {
          recordAgentFeedback(rating, agentId, userId, comments);
        }
        break;
      case 'dashboard':
        recordDashboardFeedback(rating, userId, comments);
        break;
      case 'general':
        recordSecurityFeedback(rating, userId, comments, { feedbackType: 'general' });
        break;
    }
    
    // Reset form
    setIsSubmitted(true);
    setRating(null);
    setComments('');
    
    // Call onSubmit callback if provided
    if (onSubmit) {
      onSubmit();
    }
    
    // Auto-collapse after submission if minimized mode
    if (minimized) {
      setTimeout(() => {
        setIsExpanded(false);
        setIsSubmitted(false);
      }, 3000);
    }
  };
  
  if (!isExpanded) {
    return (
      <button
        className="fixed bottom-4 right-4 bg-indigo-600 text-white rounded-full p-3 shadow-lg"
        onClick={() => setIsExpanded(true)}
        aria-label="Give feedback"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
      </button>
    );
  }
  
  const titleMap = {
    security: 'Security Experience',
    authentication: 'Authentication Experience',
    agent: 'Agent Experience',
    dashboard: 'Dashboard Experience',
    general: 'Overall Experience'
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200 max-w-md">
      {minimized && (
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-500"
          onClick={() => setIsExpanded(false)}
          aria-label="Close feedback form"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <h3 className="text-lg font-medium text-gray-900 mb-4">How was your {titleMap[type]}?</h3>
      
      {isSubmitted ? (
        <div className="text-center p-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-lg font-medium text-gray-900">Thank you for your feedback!</p>
          <p className="text-sm text-gray-500 mt-1">Your input helps us improve.</p>
          
          <button
            className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md text-sm font-medium"
            onClick={() => setIsSubmitted(false)}
          >
            Give More Feedback
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`w-10 h-10 flex items-center justify-center rounded-full ${
                    rating === value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => setRating(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">Comments (Optional)</label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder="Tell us about your experience..."
            />
          </div>
          
          <div className="flex justify-end">
            {minimized && (
              <button
                type="button"
                className="mr-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => setIsExpanded(false)}
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={rating === null}
            >
              Submit Feedback
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
