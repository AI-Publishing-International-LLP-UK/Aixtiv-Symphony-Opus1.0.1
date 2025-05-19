return context;
};

/**
 * S2DO Protocol Verification Utility
 * This utility provides cryptographic verification of S2DO messages
 */
export class S2DOVerifier {
  static instance;
  keyCache = new Map();
  pendingVerifications = new Map>();
  
  constructor() {
    // Initialize with default keys if available
    this.loadKeys();
  }
  
  /**
   * Get the singleton instance of the S2DOVerifier
   */
  static getInstance(){
    if (!S2DOVerifier.instance) {
      S2DOVerifier.instance = new S2DOVerifier();
    }
    return S2DOVerifier.instance;
  }
  
  /**
   * Load verification keys from secure storage
   */
  async loadKeys(){
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
  async verifySignature(
    stem,
    action,
    payload,
    signature,
    keyId= 'default'
  ){
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
  async performVerification(
    stem,
    action,
    payload,
    signature,
    keyId){
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
  base64ToArrayBuffer(base64){
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i  {
      let hash = 0;
      for (let i = 0; i  Promise)[]>();
  activeHealingSessions = new Set();
  lastHealingAttempts = new Map();
  healingResults = new Map();
  
  constructor() {
    // Register default healing actions
    this.registerDefaultHealingActions();
    
    // Start the background monitoring process
    this.startMonitoring();
  }
  
  /**
   * Get the singleton instance of the SecuritySelfHealer
   */
  static getInstance(){
    if (!SecuritySelfHealer.instance) {
      SecuritySelfHealer.instance = new SecuritySelfHealer();
    }
    return SecuritySelfHealer.instance;
  }
  
  /**
   * Register default healing actions for common security issues
   */
  registerDefaultHealingActions(){
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
  registerHealingAction(issueType, action=> Promise){
    const actions = this.healingActions.get(issueType) || [];
    actions.push(action);
    this.healingActions.set(issueType, actions);
  }
  
  /**
   * Start the background security monitoring process
   */
  startMonitoring(){
    // Check for security issues periodically
    setInterval(() => this.checkForSecurityIssues(), 60000); // Every minute
  }
  
  /**
   * Check for security issues that need healing
   */
  async checkForSecurityIssues(){
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
  async healSecurityIssue(issueType){
    // Check if this issue is already being healed
    if (this.activeHealingSessions.has(issueType)) {
      return false;
    }
    
    // Check if we recently tried to heal this issue and failed
    const lastAttempt = this.lastHealingAttempts.get(issueType) || 0;
    const now = Date.now();
    if (now - lastAttempt  {
    const status= {};
    
    for (const issueType of this.healingActions.keys()) {
      status[issueType] = {
        active,
        lastAttempt,
        lastResult)
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
  static instance;
  feedbackBuffer: Array = [];
  
  constructor() {
    // Start periodic flush of feedback
    setInterval(() => this.flushFeedback(), 300000); // Every 5 minutes
  }
  
  /**
   * Get the singleton instance of the UserFeedbackSystem
   */
  static getInstance(){
    if (!UserFeedbackSystem.instance) {
      UserFeedbackSystem.instance = new UserFeedbackSystem();
    }
    return UserFeedbackSystem.instance;
  }
  
  /**
   * Record user feedback about a security experience
   */
  recordSecurityFeedback(
    rating, // 1-5 scale
    userId?,
    comments?,
    metadata= {}
  ){
    this.recordFeedback('security', rating, userId, comments, metadata);
  }
  
  /**
   * Record user feedback about an authentication experience
   */
  recordAuthFeedback(
    rating, // 1-5 scale
    userId?,
    comments?,
    metadata= {}
  ){
    this.recordFeedback('authentication', rating, userId, comments, metadata);
  }
  
  /**
   * Record user feedback about an agent experience
   */
  recordAgentFeedback(
    rating, // 1-5 scale
    agentId,
    userId?,
    comments?,
    metadata= {}
  ){
    this.recordFeedback('agent', rating, userId, comments, { ...metadata, agentId });
  }
  
  /**
   * Record user feedback about the dashboard experience
   */
  recordDashboardFeedback(
    rating, // 1-5 scale
    userId?,
    comments?,
    metadata= {}
  ){
    this.recordFeedback('dashboard', rating, userId, comments, metadata);
  }
  
  /**
   * Record general user feedback
   */
  recordFeedback(
    type,
    rating,
    userId?,
    comments?,
    metadata= {}
  ){
    // Validate rating
    if (rating  5) {
      console.warn('Invalid feedback rating. Must be between 1 and 5.');
      rating = Math.max(1, Math.min(5, rating));
    }
    
    // Add to buffer
    this.feedbackBuffer.push({
      type,
      rating,
      userId,
      comments,
      timestamp,
      metadata
    });
    
    // Track in performance monitoring
    performanceMonitor.recordGauge(`feedback_${type}`, rating, {
      userId
    });
    
    // If low rating (1-2), track potential issue
    if (rating  
        f.type === type && f.rating = 3) { // If 3+ low ratings in the last hour
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
  async flushFeedback(){
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
            timestamp)
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
  getFeedbackStats(), { count, averageRating: number }> {
    const stats, { count, sum: number }> = {};
    
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
        stats[feedback.type] = { count, sum: 0 };
      }
      
      stats[feedback.type].count++;
      stats[feedback.type].sum += feedback.rating;
    }
    
    // Convert to averages
    const result, { count, averageRating: number }> = {};
    
    for (const [type, data] of Object.entries(stats)) {
      result[type] = {
        count,
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
    recordSecurityFeedback,
    recordAuthFeedback,
    recordAgentFeedback,
    recordDashboardFeedback,
    getFeedbackStats)
  };
};

/**
 * Feedback Collection UI Component
 */
import React, { useState } from 'react';



export const FeedbackForm= ({
  type,
  agentId,
  userId,
  onSubmit,
  minimized = false
}) => {
  const [rating, setRating] = useState(null);
  const [comments, setComments] = useState('');
  const [isExpanded, setIsExpanded] = useState(!minimized);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { recordSecurityFeedback, recordAuthFeedback, recordAgentFeedback, recordDashboardFeedback } = useFeedback();
  
  const handleSubmit = (e=> {
    e.preventDefault();
    
    if (rating === null) return;
    
    // Submit feedback based on type
    switch (type) {
      case 'security';
        break;
      case 'authentication';
        break;
      case 'agent') {
          recordAgentFeedback(rating, agentId, userId, comments);
        }
        break;
      case 'dashboard';
        break;
      case 'general', { feedbackType: 'general' });
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
       setIsExpanded(true)}
        aria-label="Give feedback"
      >
        
          
        
      
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
    
      {minimized && (
         setIsExpanded(false)}
          aria-label="Close feedback form"
        >
          
            
          
        
      )}
      
      How was your {titleMap[type]}?
      
      {isSubmitted ? (
        
          
            
          
          Thank you for your feedback!
          Your input helps us improve.
          
           setIsSubmitted(false)}
          >
            Give More Feedback
          
        
      ) ={handleSubmit}>
          
            Your Rating
            
              {[1, 2, 3, 4, 5].map((value) => (
                 setRating(value)}
                >
                  {value}
                
              ))}
            
          
          
          
            Comments (Optional)
             setComments(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder="Tell us about your experience..."
            />
          
          
          
            {minimized && (
               setIsExpanded(false)}
              >
                Cancel
              
            )}
            
            
              Submit Feedback
            
          
        
      )}
    
  );
};
