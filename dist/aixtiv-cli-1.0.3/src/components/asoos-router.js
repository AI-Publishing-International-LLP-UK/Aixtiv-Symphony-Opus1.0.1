// router.js - Application router for view management

/**
 * Router Component
 * Handles application navigation and view rendering
 */
(() => {
  // View component mapping
  const views = {
    'login': renderLoginView,
    'symphony': () => {}, // Implemented in symphony-view.js
    'greenscreen': () => {}, // Implemented in greenscreen-view.js
    'console': () => {}, // Implemented in console-view.js
    'memorymap': () => {}, // Implemented in memorymap-view.js
    'agents': () => {}, // Implemented in agent-view.js
    'sallyport': () => {}  // Implemented in sallyport-view.js
  };
  
  // Default view if none specified
  const defaultView = 'login';
  
  /**
   * Initialize the router
   */
  const initialize = () => {
    console.log("Initializing application router...");
    
    // Subscribe to view changes
    AppState.subscribe('view', handleViewChange);
    
    // Subscribe to authentication changes
    SallyPortAuth.subscribe(handleAuthChange);
    
    // Set initial view based on URL or default
    const initialView = getViewFromUrl() || defaultView;
    AppState.setCurrentView(initialView);
    
    // Listen for URL changes (browser back/forward)
    window.addEventListener('popstate', () => {
      const view = getViewFromUrl() || defaultView;
      AppState.setCurrentView(view);
    });
  };
  
  /**
   * Handle view changes
   * @param {Object} state - Application state
   */
  const handleViewChange = (state) => {
    const viewName = state.currentView;
    
    // Update URL to reflect current view
    updateUrl(viewName);
    
    // Log view navigation for audit
    console.log(`Navigating to view: ${viewName}`);
    
    // External views have their own rendering logic
    // We don't need to do anything here as they subscribe to AppState changes
  };
  
  /**
   * Handle authentication changes
   * @param {Object} authState - Authentication state
   */
  const handleAuthChange = (authState) => {
    const currentView = AppState.getState().currentView;
    
    // Redirect to login if not authenticated and trying to access protected view
    if (!authState.isAuthenticated && currentView !== 'login') {
      console.log("User not authenticated, redirecting to login");
      AppState.setCurrentView('login');
    }
  };
  
  /**
   * Get current view from URL
   * @returns {string|null} - View name from URL or null
   */
  const getViewFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('view');
  };
  
  /**
   * Update URL to reflect current view
   * @param {string} viewName - Name of the current view
   */
  const updateUrl = (viewName) => {
    // Only update if view name provided
    if (!viewName) return;
    
    // Build new URL with view parameter
    const url = new URL(window.location.href);
    url.searchParams.set('view', viewName);
    
    // Update URL without full page reload
    window.history.pushState({view: viewName}, '', url.toString());
  };
  
  /**
   * Render login view
   * Basic implementation of login view rendering
   */
  function renderLoginView() {
    const contentElement = document.getElementById('app-content');
    if (!contentElement) return;
    
    contentElement.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="p-8 bg-white rounded-lg shadow-md max-w-md w-full security-glow">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold" style="color: #0bb1bb;">SallyPort Authentication</h2>
            <p class="text-gray-600">Secure access to ASOOS Developer Interface</p>
          </div>
          
          <div class="bg-white p-6 rounded-lg border border-gray-200 mb-6">
            <p class="text-center mb-4">Authentication required to access ASOOS interface</p>
            <button id="login-button" class="w-full bg-cyan-600 text-white py-2 px-4 rounded hover:bg-cyan-700 transition-colors">
              Authenticate with SallyPort
            </button>
          </div>
          
          <div class="text-sm text-gray-500 text-center">
            Protected by Dr. Grant's CLAUDE.md Framework
          </div>
        </div>
      </div>
    `;
    
    // Add login event listener
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.addEventListener('click', async () => {
        loginButton.disabled = true;
        loginButton.textContent = 'Authenticating...';
        
        try {
          const success = await SallyPortAuth.authenticate();
          if (success) {
            AppState.setCurrentView('symphony');
          } else {
            throw new Error("Authentication failed");
          }
        } catch (error) {
          console.error("Login error:", error);
          
          // Show error message
          contentElement.innerHTML += `
            <div class="fixed bottom-6 right-6 bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 max-w-md">
              <h3 class="font-bold mb-1">Authentication Error</h3>
              <p>${error.message || "Failed to authenticate"}</p>
            </div>
          `;
          
          // Reset button state
          loginButton.disabled = false;
          loginButton.textContent = 'Authenticate with SallyPort';
        }
      });
    }
  }
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', initialize);
})();
