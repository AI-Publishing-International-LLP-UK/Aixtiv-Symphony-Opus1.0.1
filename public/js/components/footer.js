// footer.js - Application footer component

/**
 * Footer Component
 * Renders the application footer with system status information
 */
(() => {
  // Cache DOM elements
  let footerElement;
  
  /**
   * Initialize the footer component
   */
  const initialize = () => {
    footerElement = document.getElementById('app-footer');
    
    if (!footerElement) {
      console.error("Footer element not found in DOM");
      return;
    }
    
    // Initial render
    render();
    
    // Subscribe to system status changes
    AppState.subscribe('system', render);
  };
  
  /**
   * Render the footer component
   */
  const render = () => {
    if (!footerElement) return;
    
    const state = AppState.getState();
    const sallyPortStatus = state.systemStatus.sallyPortActive ? 'Active' : 'Inactive';
    const gatewayStatus = state.systemStatus.integrationGatewayStatus;
    
    // Generate status indicator class based on gateway status
    let statusClass = 'bg-gray-500'; // default: unknown
    if (gatewayStatus === 'connected') {
      statusClass = 'bg-green-500';
    } else if (gatewayStatus === 'connecting') {
      statusClass = 'bg-yellow-500';
    } else if (gatewayStatus === 'error' || gatewayStatus === 'disconnected') {
      statusClass = 'bg-red-500';
    }
    
    const footerContent = `
      <div class="h-10 bg-gray-800 text-gray-300 text-xs flex items-center justify-between px-4">
        <div>ASOOS v1.0.3 | Owner Subscriber Access</div>
        <div class="flex items-center">
          <span class="w-2 h-2 rounded-full ${statusClass} mr-2"></span>
          SallyPort Authentication: ${sallyPortStatus}
        </div>
      </div>
    `;
    
    // Update the DOM
    footerElement.innerHTML = footerContent;
  };
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', initialize);
})();
