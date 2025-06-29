// app-state.js - Core application state management

/**
 * AppState - Central state management for ASOOS Developer Interface
 * Handles view state, user preferences, and component coordination
 */
const AppState = (() => {
  // Private module state
  const state = {
    currentView: null,
    userPreferences: {
      theme: 'light',
      language: 'en',
      accessibility: false
    },
    systemStatus: {
      sallyPortActive: false,
      orchestratorConnected: false,
      integrationGatewayStatus: 'disconnected'
    },
    devPanelVisible: false,
    securityAlerts: [],
    lastActivity: Date.now()
  };
  
  // List of callbacks to notify when state changes
  const stateListeners = {
    'view': [],
    'preferences': [],
    'system': [],
    'devPanel': [],
    'security': [],
    'all': []
  };
  
  /**
   * Set the current view
   * @param {string} viewName - Name of the view to display
   */
  const setCurrentView = (viewName) => {
    if (state.currentView !== viewName) {
      console.log(`Changing view to: ${viewName}`);
      state.currentView = viewName;
      state.lastActivity = Date.now();
      
      // Notify listeners
      notifyListeners('view');
      notifyListeners('all');
    }
  };
  
  /**
   * Update system status
   * @param {Object} statusUpdate - Status properties to update
   */
  const updateSystemStatus = (statusUpdate) => {
    state.systemStatus = {
      ...state.systemStatus,
      ...statusUpdate
    };
    
    notifyListeners('system');
    notifyListeners('all');
  };
  
  /**
   * Toggle developer panel visibility
   */
  const toggleDevPanel = () => {
    state.devPanelVisible = !state.devPanelVisible;
    state.lastActivity = Date.now();
    
    notifyListeners('devPanel');
    notifyListeners('all');
  };
  
  /**
   * Update user preferences
   * @param {Object} preferencesUpdate - Preference properties to update
   */
  const updatePreferences = (preferencesUpdate) => {
    state.userPreferences = {
      ...state.userPreferences,
      ...preferencesUpdate
    };
    
    // Save preferences to localStorage
    localStorage.setItem('asoos_preferences', JSON.stringify(state.userPreferences));
    
    notifyListeners('preferences');
    notifyListeners('all');
  };
  
  /**
   * Add a security alert
   * @param {Object} alert - Alert details
   */
  const addSecurityAlert = (alert) => {
    state.securityAlerts.push({
      ...alert,
      timestamp: Date.now()
    });
    
    notifyListeners('security');
    notifyListeners('all');
  };
  
  /**
   * Subscribe to state changes
   * @param {string} type - Type of state changes to listen for
   * @param {Function} callback - Function to call when state changes
   */
  const subscribe = (type, callback) => {
    if (typeof callback === 'function') {
      if (stateListeners[type]) {
        stateListeners[type].push(callback);
      } else {
        console.warn(`Unknown state type: ${type}`);
      }
    }
  };
  
  /**
   * Unsubscribe from state changes
   * @param {string} type - Type of state changes to stop listening for
   * @param {Function} callback - Function to remove from listeners
   */
  const unsubscribe = (type, callback) => {
    if (stateListeners[type]) {
      const index = stateListeners[type].indexOf(callback);
      if (index !== -1) {
        stateListeners[type].splice(index, 1);
      }
    }
  };
  
  /**
   * Notify all listeners of state changes
   * @param {string} type - Type of state change
   */
  const notifyListeners = (type) => {
    if (stateListeners[type]) {
      stateListeners[type].forEach(listener => {
        try {
          listener(getState());
        } catch (error) {
          console.error(`Error in state listener for ${type}:`, error);
        }
      });
    }
  };
  
  /**
   * Get the current state
   * @returns {Object} - Current application state
   */
  const getState = () => {
    return {
      currentView: state.currentView,
      userPreferences: { ...state.userPreferences },
      systemStatus: { ...state.systemStatus },
      devPanelVisible: state.devPanelVisible,
      securityAlerts: [...state.securityAlerts],
      lastActivity: state.lastActivity
    };
  };
  
  /**
   * Initialize the application state
   */
  const initialize = () => {
    console.log("Initializing application state...");
    
    // Load saved preferences if available
    const savedPreferences = localStorage.getItem('asoos_preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        state.userPreferences = {
          ...state.userPreferences,
          ...parsed
        };
      } catch (error) {
        console.error("Error loading saved preferences:", error);
      }
    }
    
    // Set default view based on authentication
    SallyPortAuth.subscribe((authState) => {
      updateSystemStatus({
        sallyPortActive: authState.isAuthenticated
      });
      
      // Auto-switch view based on authentication
      if (authState.isAuthenticated && !state.currentView) {
        setCurrentView('symphony');
      } else if (!authState.isAuthenticated) {
        setCurrentView('login');
      }
    });
    
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      // Developer panel shortcut: Shift+Ctrl+9
      if (event.shiftKey && event.ctrlKey && event.key === '9') {
        toggleDevPanel();
      }
    });
    
    // Listen for security breach events
    document.addEventListener('sallyport:security-breach', (event) => {
      addSecurityAlert({
        type: 'security-breach',
        message: event.detail.message || 'Security breach detected',
        severity: 'critical'
      });
    });
    
    console.log("Application state initialized");
  };
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', initialize);
  
  // Public API
  return {
    setCurrentView,
    updateSystemStatus,
    toggleDevPanel,
    updatePreferences,
    addSecurityAlert,
    getState,
    subscribe,
    unsubscribe
  };
})();
