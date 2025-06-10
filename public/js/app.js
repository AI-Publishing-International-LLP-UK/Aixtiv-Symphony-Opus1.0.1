// app.js - Main application initialization

/**
 * ASOOS Developer Interface
 * Main application initialization and coordination
 */
(() => {
  // Application configuration
  const config = {
    appVersion: '1.0.3',
    environment: 'development',
    debugMode: true,
    securityLevel: 'high'
  };
  
  // Track application startup time
  const startTime = Date.now();
  
  /**
   * Initialize the application
   */
  const initialize = () => {
    console.log(`Initializing ASOOS Developer Interface v${config.appVersion}...`);
    
    // Set up error handling
    setupErrorHandling();
    
    // Check browser compatibility
    if (!checkBrowserCompatibility()) {
      showCompatibilityError();
      return;
    }
    
    // Configure security monitoring
    setupSecurityMonitoring();
    
    // Register for SDK security events
    monitorSDKSecurity();
    
    // Log initialization time
    const initTime = Date.now() - startTime;
    console.log(`Application initialized in ${initTime}ms`);
    
    // Show welcome message if in debug mode
    if (config.debugMode) {
      showDebugWelcome();
    }
  };
  
  /**
   * Set up global error handling
   */
  const setupErrorHandling = () => {
    window.addEventListener('error', (event) => {
      console.error('Application error:', event.error || event.message);
      
      // Prevent error from showing in console in production
      if (config.environment !== 'development') {
        event.preventDefault();
      }
      
      // Display error message to user if critical
      if (isCriticalError(event.error || event.message)) {
        showErrorNotification(event.error || event.message);
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Prevent error from showing in console in production
      if (config.environment !== 'development') {
        event.preventDefault();
      }
    });
  };
  
  /**
   * Check if the browser is compatible with the application
   * @returns {boolean} - Whether the browser is compatible
   */
  const checkBrowserCompatibility = () => {
    // Check for required browser features
    const requiredFeatures = [
      'localStorage' in window,
      'fetch' in window,
      'Promise' in window,
      'Map' in window,
      'customElements' in window
    ];
    
    return requiredFeatures.every(feature => feature === true);
  };
  
  /**
   * Show browser compatibility error
   */
  const showCompatibilityError = () => {
    document.body.innerHTML = `
      <div class="flex items-center justify-center h-screen bg-red-50">
        <div class="max-w-md p-8 bg-white rounded-lg shadow-md">
          <h2 class="text-2xl font-bold text-red-600 mb-4">Browser Not Supported</h2>
          <p class="mb-4">Your browser does not support features required by ASOOS Developer Interface.</p>
          <p>Please use a modern browser such as Chrome, Firefox, Edge, or Safari.</p>
        </div>
      </div>
    `;
  };
  
  /**
   * Monitor for SDK security breaches
   */
  const monitorSDKSecurity = () => {
    // Monitor for SDK security events
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes("SDK compromised password BG")) {
        console.error("SDK SECURITY BREACH DETECTED:", event.message);
        
        // Trigger security protocol
        document.dispatchEvent(new CustomEvent('sallyport:security-breach', { 
          detail: { message: "SDK compromised password detected" }
        }));
        
        // Show security notification
        showSecurityNotification("Security breach detected in SDK authentication. System is taking protective measures.");
      }
    });
  };
  
  /**
   * Set up security monitoring
   */
  const setupSecurityMonitoring = () => {
    // Monitor for suspicious behavior
    let rapidActionCount = 0;
    let lastActionTime = Date.now();
    
    document.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastActionTime < 300) {
        rapidActionCount++;
        
        if (rapidActionCount > 10) {
          console.warn("Suspicious rapid user activity detected");
          rapidActionCount = 0;
        }
      } else {
        rapidActionCount = 0;
      }
      
      lastActionTime = now;
    });
    
    // Listen for security breach events
    document.addEventListener('sallyport:security-breach', (event) => {
      console.error("SECURITY BREACH:", event.detail.message);
      
      // Log security incident
      logSecurityIncident(event.detail.message);
      
      // Take protective action
      SallyPortAuth.logout();
      IntegrationGateway.clearCache();
      
      // Show security notification
      showSecurityNotification("Security alert: Your session has been terminated for protection.");
    });
  };
  
  /**
   * Log security incident
   * @param {string} message - Incident message
   */
  const logSecurityIncident = (message) => {
    // In a real implementation, this would send to a logging server
    console.error(`SECURITY INCIDENT [${new Date().toISOString()}]: ${message}`);
    
    // Add security alert to application state
    AppState.addSecurityAlert({
      type: 'security-breach',
      message: message,
      severity: 'critical'
    });
  };
  
  /**
   * Determine if an error is critical
   * @param {Error|string} error - Error object or message
   * @returns {boolean} - Whether the error is critical
   */
  const isCriticalError = (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const criticalPatterns = [
      'security',
      'authentication',
      'unauthorized',
      'failed to load',
      'connection refused',
      'storage quota exceeded'
    ];
    
    return criticalPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    );
  };
  
  /**
   * Show error notification to user
   * @param {Error|string} error - Error object or message
   */
  const showErrorNotification = (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-6 right-6 bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 max-w-md z-50';
    notification.innerHTML = `
      <h3 class="font-bold mb-1">Application Error</h3>
      <p>${errorMessage}</p>
      <button class="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors close-btn">
        Dismiss
      </button>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
    
    // Add close button handler
    const closeBtn = notification.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      });
    }
  };
  
  /**
   * Show security notification to user
   * @param {string} message - Security message
   */
  const showSecurityNotification = (message) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-6 right-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-yellow-700 max-w-md z-50 security-glow';
    notification.innerHTML = `
      <h3 class="font-bold mb-1">Security Alert</h3>
      <p>${message}</p>
      <button class="mt-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors close-btn">
        Acknowledge
      </button>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 30000);
    
    // Add close button handler
    const closeBtn = notification.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      });
    }
  };
  
  /**
   * Show debug welcome message
   */
  const showDebugWelcome = () => {
    console.info(`
    ╔═════════════════════════════════════════════════╗
    ║                                                 ║
    ║  ASOOS Developer Interface v${config.appVersion}             ║
    ║                                                 ║
    ║  Environment: ${config.environment.padEnd(12)}                ║
    ║  Security: ${config.securityLevel.padEnd(15)}                ║
    ║  Debug Mode: ${config.debugMode ? 'Enabled' : 'Disabled'}                      ║
    ║                                                 ║
    ║  Press Shift+Ctrl+9 to open Developer Panel    ║
    ║                                                 ║
    ╚═════════════════════════════════════════════════╝
    `);
  };
  
  // Initialize the application when DOM is ready
  window.addEventListener('DOMContentLoaded', initialize);
})();
