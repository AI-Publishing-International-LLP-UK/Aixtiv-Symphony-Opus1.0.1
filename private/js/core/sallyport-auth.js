// sallyport-auth.js - Core authentication system

/**
 * SallyPort Authentication System
 * Secure authentication module for ASOOS Developer Interface
 * Manages authentication state, token verification, and session management
 */
const SallyPortAuth = (() => {
  // Private module state
  let authState = {
    isAuthenticated: false,
    isLoading: true,
    error: null,
    user: null
  };
  
  // List of callbacks to notify when auth state changes
  const authStateListeners = [];
  
  /**
   * Initialize authentication on page load
   * Checks for existing tokens and validates them
   */
  const initialize = async () => {
    try {
      console.log("Initializing SallyPort authentication...");
      authState.isLoading = true;
      notifyListeners();
      
      // Check if we have a valid token in localStorage
      const token = localStorage.getItem('sallyport_token');
      
      if (token) {
        // Verify the token with the integration-gateway
        await verifyToken(token);
      } else {
        // No existing token found
        authState.isAuthenticated = false;
        authState.isLoading = false;
        authState.error = null;
      }
    } catch (error) {
      console.error("Authentication initialization error:", error);
      authState.isAuthenticated = false;
      authState.isLoading = false;
      authState.error = error.message || "Authentication failed";
    }
    
    notifyListeners();
  };
  
  /**
   * Authenticate user with SallyPort system
   * @param {Object} credentials - Optional credentials if needed
   * @returns {Promise<boolean>} - Whether authentication was successful
   */
  const authenticate = async (credentials = {}) => {
    try {
      console.log("Authenticating with SallyPort...");
      authState.isLoading = true;
      notifyListeners();
      
      // In a real implementation, call the integration-gateway
      // For demo purposes, simulate a network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, this would validate credentials with the backend
      // and receive a token upon successful authentication
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMDAwMDEiLCJuYW1lIjoiTXIuIFBoaWxsaXAgQ29yZXkgUm9hcmsiLCJyb2xlIjoiQ0VPIC8gUHJpbmNpcGFsIn0";
      
      // Store token securely
      localStorage.setItem('sallyport_token', token);
      
      // Update auth state
      authState.isAuthenticated = true;
      authState.isLoading = false;
      authState.error = null;
      authState.user = {
        uuid: "00001",
        name: "Mr. Phillip Corey Roark",
        role: "CEO / Principal"
      };
      
      notifyListeners();
      
      // Log authentication success for security audit
      console.log("SallyPort authentication successful");
      
      return true;
    } catch (error) {
      console.error("Authentication error:", error);
      authState.isAuthenticated = false;
      authState.isLoading = false;
      authState.error = error.message || "Authentication failed";
      
      notifyListeners();
      
      // Log failed authentication attempt for security
      console.error(`Authentication failure: ${error.message}`);
      
      return false;
    }
  };
  
  /**
   * Verify an existing authentication token
   * @param {string} token - The token to verify
   * @returns {Promise<boolean>} - Whether the token is valid
   */
  const verifyToken = async (token) => {
    try {
      console.log("Verifying SallyPort token...");
      
      // In a real implementation, validate the token with your integration-gateway
      // For demo purposes, simulate a network request
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For demonstration, accept the token as valid
      // In production, this would check with the backend
      authState.isAuthenticated = true;
      authState.isLoading = false;
      authState.error = null;
      authState.user = {
        uuid: "00001",
        name: "Mr. Phillip Corey Roark",
        role: "CEO / Principal"
      };
      
      return true;
    } catch (error) {
      console.error("Token verification error:", error);
      authState.isAuthenticated = false;
      authState.isLoading = false;
      authState.error = error.message || "Token verification failed";
      
      // Clear the invalid token
      localStorage.removeItem('sallyport_token');
      
      return false;
    }
  };
  
  /**
   * Log out the current user
   */
  const logout = () => {
    console.log("Logging out from SallyPort...");
    
    // Clear authentication token
    localStorage.removeItem('sallyport_token');
    
    // Update auth state
    authState.isAuthenticated = false;
    authState.isLoading = false;
    authState.error = null;
    authState.user = null;
    
    notifyListeners();
    
    console.log("Logout successful");
  };
  
  /**
   * Subscribe to authentication state changes
   * @param {Function} callback - Function to call when auth state changes
   */
  const subscribe = (callback) => {
    if (typeof callback === 'function') {
      authStateListeners.push(callback);
      
      // Call immediately with current state
      callback(authState);
    }
  };
  
  /**
   * Unsubscribe from authentication state changes
   * @param {Function} callback - Function to remove from listeners
   */
  const unsubscribe = (callback) => {
    const index = authStateListeners.indexOf(callback);
    if (index !== -1) {
      authStateListeners.splice(index, 1);
    }
  };
  
  /**
   * Notify all listeners of auth state changes
   */
  const notifyListeners = () => {
    authStateListeners.forEach(listener => listener(authState));
  };
  
  /**
   * Get the current authentication state
   * @returns {Object} - Current auth state
   */
  const getAuthState = () => {
    return { ...authState };
  };
  
  // Security monitoring for potential breaches
  // Add a listener for security events
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes("SDK compromised") || 
      event.message.includes("security violation") ||
      event.message.includes("unauthorized access")
    )) {
      console.error("Security alert detected:", event.message);
      // Log security incident
      console.warn("SECURITY ALERT: Potential security breach detected");
      
      // Execute security protocol
      logout();
      
      // Notify application of security breach
      document.dispatchEvent(new CustomEvent('sallyport:security-breach', { 
        detail: { message: event.message }
      }));
    }
  });
  
  // Initialize auth on module load
  window.addEventListener('DOMContentLoaded', initialize);
  
  // Public API
  return {
    authenticate,
    logout,
    getAuthState,
    subscribe,
    unsubscribe
  };
})();
