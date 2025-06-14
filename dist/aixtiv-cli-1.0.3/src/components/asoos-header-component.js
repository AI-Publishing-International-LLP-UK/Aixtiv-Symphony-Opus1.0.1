// header.js - Application header component

/**
 * Header Component
 * Renders the application header and handles user information display
 */
(() => {
  // Cache DOM elements
  let headerElement;
  
  /**
   * Initialize the header component
   */
  const initialize = () => {
    headerElement = document.getElementById('app-header');
    
    if (!headerElement) {
      console.error("Header element not found in DOM");
      return;
    }
    
    // Initial render
    render();
    
    // Subscribe to auth changes to update header
    SallyPortAuth.subscribe(render);
  };
  
  /**
   * Render the header component
   */
  const render = (authState) => {
    if (!headerElement) return;
    
    // Get current auth state if not provided
    authState = authState || SallyPortAuth.getAuthState();
    
    let headerContent = '';
    
    if (authState.isAuthenticated && authState.user) {
      // Authenticated header
      headerContent = `
        <div class="h-16 bg-black text-white flex items-center justify-between px-6">
          <div class="font-bold text-2xl tracking-wide" style="color: #0bb1bb;">
            ASOOS
          </div>
          <div class="text-right">
            <div class="font-bold text-lg">${authState.user.name}</div>
            <div class="text-sm" style="color: #0bb1bb;">${authState.user.role}</div>
          </div>
        </div>
      `;
    } else {
      // Non-authenticated header
      headerContent = `
        <div class="h-16 bg-black text-white flex items-center justify-between px-6">
          <div class="font-bold text-2xl tracking-wide" style="color: #0bb1bb;">
            ASOOS
          </div>
          <div class="text-right">
            <div class="text-sm" style="color: #0bb1bb;">Please authenticate to continue</div>
          </div>
        </div>
      `;
    }
    
    // Update the DOM
    headerElement.innerHTML = headerContent;
    
    // Add event listeners
    const logoElement = headerElement.querySelector('.font-bold.text-2xl');
    if (logoElement) {
      logoElement.addEventListener('click', () => {
        AppState.setCurrentView('symphony');
      });
    }
  };
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', initialize);
})();
