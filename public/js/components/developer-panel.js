// developer-panel.js - Developer tools panel component

/**
 * Developer Panel Component
 * Renders the developer tools panel for advanced functionality
 * Toggle with Shift+Ctrl+9 keyboard shortcut
 */
(() => {
  // Cache DOM elements
  let panelElement;
  
  /**
   * Initialize the developer panel component
   */
  const initialize = () => {
    panelElement = document.getElementById('developer-panel');
    
    if (!panelElement) {
      console.error("Developer panel element not found in DOM");
      return;
    }
    
    // Initial render
    render();
    
    // Subscribe to dev panel visibility changes
    AppState.subscribe('devPanel', render);
  };
  
  /**
   * Render the developer panel component
   */
  const render = () => {
    if (!panelElement) return;
    
    const state = AppState.getState();
    
    // Only render if panel should be visible
    if (!state.devPanelVisible) {
      panelElement.innerHTML = '';
      return;
    }
    
    const panelContent = `
      <div class="fixed bottom-6 right-6 bg-white shadow-lg border border-gray-300 rounded-lg p-4 z-50 w-80">
        <h3 class="font-bold text-lg mb-2 text-gray-800">Symphony Developer Panel</h3>
        <div class="text-xs text-gray-500 mb-2">Press Shift+Ctrl+9 to toggle</div>
        <ul class="space-y-2 text-sm text-gray-700">
          <li>
            <button 
              class="w-full text-left hover:text-cyan-600 transition-colors py-1 dev-panel-button"
              data-view="symphony"
            >
              🔁 Launch Full Symphony View
            </button>
          </li>
          <li>
            <button 
              class="w-full text-left hover:text-cyan-600 transition-colors py-1 dev-panel-button"
              data-view="greenscreen"
            >
              🟢 Open Green Screen Studio
            </button>
          </li>
          <li>
            <button 
              class="w-full text-left hover:text-cyan-600 transition-colors py-1 dev-panel-button"
              data-view="console"
            >
              📡 Claude Orchestrator Console
            </button>
          </li>
          <li>
            <button 
              class="w-full text-left hover:text-cyan-600 transition-colors py-1 dev-panel-button"
              data-view="memorymap"
            >
              📖 Anthology Memory Flowchart
            </button>
          </li>
          <li>
            <button 
              class="w-full text-left hover:text-cyan-600 transition-colors py-1 dev-panel-button"
              data-view="agents"
            >
              🤖 Animate ASOS Agent View
            </button>
          </li>
          <li>
            <button 
              class="w-full text-left hover:text-cyan-600 transition-colors py-1 dev-panel-button"
              data-view="sallyport"
            >
              🔐 Verify SallyPort Access
            </button>
          </li>
        </ul>
      </div>
    `;
    
    // Update the DOM
    panelElement.innerHTML = panelContent;
    
    // Add event listeners
    const buttons = panelElement.querySelectorAll('.dev-panel-button');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const view = button.getAttribute('data-view');
        if (view) {
          console.log(`Developer Panel: Launching ${view}`);
          AppState.setCurrentView(view);
        }
      });
    });
  };
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', initialize);
})();
