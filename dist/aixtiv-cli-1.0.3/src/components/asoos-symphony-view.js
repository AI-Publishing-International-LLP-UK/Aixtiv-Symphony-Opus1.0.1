// symphony-view.js - Symphony view component

/**
 * Symphony View Component
 * Renders the Symphony orchestration interface
 */
(() => {
  // Cache DOM elements
  let contentElement;
  
  /**
   * Initialize the Symphony view component
   */
  const initialize = () => {
    contentElement = document.getElementById('app-content');
    
    if (!contentElement) {
      console.error("Content element not found in DOM");
      return;
    }
    
    // Subscribe to view changes
    AppState.subscribe('view', (state) => {
      if (state.currentView === 'symphony') {
        render();
      }
    });
  };
  
  /**
   * Render the Symphony view
   */
  const render = async () => {
    if (!contentElement) return;
    
    // Get authentication state
    const authState = SallyPortAuth.getAuthState();
    
    // Only render for authenticated users
    if (!authState.isAuthenticated) {
      renderLoginPrompt();
      return;
    }
    
    try {
      // Get Symphony status from integration gateway
      const symphonyStatus = await IntegrationGateway.callApi('Symphony', 'status');
      
      const viewContent = `
        <div class="p-8 bg-white shadow-inner max-w-4xl mx-auto mt-8 rounded-lg border border-gray-200">
          <h2 class="text-2xl font-bold mb-4 text-cyan-700">🎼 Symphony View</h2>
          <div class="bg-blue-50 p-6 rounded-lg">
            <div class="font-medium text-lg mb-2">Full Symphony View Loaded</div>
            <div class="text-gray-600">Orchestrating system components...</div>
            <div class="mt-4 grid grid-cols-3 gap-4">
              ${generateComponentGrid(symphonyStatus.components || 6)}
            </div>
            <div class="mt-6 text-right text-sm text-gray-500">
              Symphony v1.0.3 | Integration Gateway Active
            </div>
          </div>
          
          ${generateSystemMetrics()}
        </div>
      `;
      
      // Update the DOM
      contentElement.innerHTML = viewContent;
      
      // Add event listeners to components
      const components = contentElement.querySelectorAll('.component-item');
      components.forEach(component => {
        component.addEventListener('click', () => {
          const componentId = component.getAttribute('data-id');
          console.log(`Component ${componentId} clicked`);
          
          // Toggle active state
          component.classList.toggle('bg-blue-200');
          component.classList.toggle('border-blue-300');
        });
      });
      
      // Log view rendering for audit
      console.log("Symphony view rendered successfully");
      
    } catch (error) {
      console.error("Error rendering Symphony view:", error);
      
      // Show error state
      contentElement.innerHTML = `
        <div class="p-8 max-w-md mx-auto mt-8">
          <div class="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700">
            <h3 class="font-bold mb-2">Error Loading Symphony View</h3>
            <p>${error.message || "Failed to load component data"}</p>
            <button class="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors retry-button">
              Retry
            </button>
          </div>
        </div>
      `;
      
      // Add retry event listener
      const retryButton = contentElement.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', render);
      }
    }
  };
  
  /**
   * Render login prompt for unauthenticated users
   */
  const renderLoginPrompt = () => {
    contentElement.innerHTML = `
      <div class="p-8 text-center">
        <h2 class="text-xl font-bold text-red-600 mb-2">Authentication Required</h2>
        <p class="mb-4">Please login to access the Symphony View.</p>
        <button 
          class="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 login-button"
        >
          Authenticate with SallyPort
        </button>
      </div>
    `;
    
    // Add login event listener
    const loginButton = contentElement.querySelector('.login-button');
    if (loginButton) {
      loginButton.addEventListener('click', async () => {
        const success = await SallyPortAuth.authenticate();
        if (success) {
          render();
        }
      });
    }
  };
  
  /**
   * Generate component grid HTML
   * @param {number} count - Number of components to generate
   * @returns {string} - Component grid HTML
   */
  const generateComponentGrid = (count) => {
    let componentsHtml = '';
    
    for (let i = 1; i <= count; i++) {
      componentsHtml += `
        <div class="bg-white p-3 rounded border border-blue-200 text-center cursor-pointer hover:bg-blue-50 transition-colors component-item" data-id="${i}">
          Component ${i}
          <div class="text-xs text-gray-500 mt-1">Status: Active</div>
        </div>
      `;
    }
    
    return componentsHtml;
  };
  
  /**
   * Generate system metrics HTML
   * @returns {string} - System metrics HTML
   */
  const generateSystemMetrics = () => {
    return `
      <div class="mt-8 bg-white p-6 rounded-lg border border-gray-200">
        <h3 class="text-lg font-semibold mb-3 text-cyan-700">System Metrics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="border border-gray-100 rounded p-3 bg-gray-50">
            <div class="text-sm text-gray-500">CPU Usage</div>
            <div class="text-xl font-semibold">32%</div>
            <div class="w-full bg-gray-200 h-2 rounded-full mt-2">
              <div class="bg-green-500 h-2 rounded-full" style="width: 32%"></div>
            </div>
          </div>
          <div class="border border-gray-100 rounded p-3 bg-gray-50">
            <div class="text-sm text-gray-500">Memory</div>
            <div class="text-xl font-semibold">1.8 GB</div>
            <div class="w-full bg-gray-200 h-2 rounded-full mt-2">
              <div class="bg-blue-500 h-2 rounded-full" style="width: 45%"></div>
            </div>
          </div>
          <div class="border border-gray-100 rounded p-3 bg-gray-50">
            <div class="text-sm text-gray-500">Network</div>
            <div class="text-xl font-semibold">3.2 MB/s</div>
            <div class="w-full bg-gray-200 h-2 rounded-full mt-2">
              <div class="bg-purple-500 h-2 rounded-full" style="width: 28%"></div>
            </div>
          </div>
          <div class="border border-gray-100 rounded p-3 bg-gray-50">
            <div class="text-sm text-gray-500">Storage</div>
            <div class="text-xl font-semibold">128 GB</div>
            <div class="w-full bg-gray-200 h-2 rounded-full mt-2">
              <div class="bg-yellow-500 h-2 rounded-full" style="width: 62%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  };
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', initialize);
})();
