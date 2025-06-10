// settings-view.js - Settings view with Vision Lake story

/**
 * Settings View Component
 * Renders the settings interface with Vision Lake storyline elements
 */
(() => {
  // Cache DOM elements
  let contentElement;
  
  /**
   * Initialize the Settings view component
   */
  const initialize = () => {
    contentElement = document.getElementById('app-content');
    
    if (!contentElement) {
      console.error("Content element not found in DOM");
      return;
    }
    
    // Subscribe to view changes
    AppState.subscribe('view', (state) => {
      if (state.currentView === 'settings') {
        render();
      }
    });
  };
  
  /**
   * Render the Settings view
   */
  const render = async () => {
    if (!contentElement) return;
    
    // Get authentication state
    const authState = SallyPortAuth.getAuthState();
    
    // Only render for authenticated users
    if (!authState.isAuthenticated) {
      // Show login prompt
      contentElement.innerHTML = `
        <div class="p-8 text-center">
          <h2 class="text-xl font-bold text-red-600 mb-2">Authentication Required</h2>
          <p class="mb-4">Please login to access Settings.</p>
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
      
      return;
    }
    
    // Generate settings view with Vision Lake story elements
    const viewContent = `
      <div class="max-w-4xl mx-auto p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Settings & Vision Lake Playbook</h1>
          <button 
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors back-button"
          >
            Back to Dashboard
          </button>
        </div>
        
        <!-- Vision Lake Story Banner -->
        <div class="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-4 rounded-lg mb-6">
          <div class="flex items-center">
            <div class="mr-4">
              <svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M2 8H22" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M6 16H6.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 16H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold">Vision Lake Interactive Playbook</h2>
              <p class="text-sm text-blue-100">A journey through intelligent systems disguised as settings</p>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Voice & Language Settings with Story Element -->
          <div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
              <h2 class="text-lg font-semibold flex items-center">
                <span class="mr-2">🔊</span>
                Voice & Language
              </h2>
            </div>
            <div class="p-4 space-y-4">
              <div class="italic text-sm text-gray-600 border-l-4 border-blue-300 pl-3 py-2 bg-blue-50 mb-4 vision-lake-story">
                At Vision Lake, Dr. Claude demonstrated how voice could travel across water. "The vibrations create ripples," he explained, "just as your words create ripples through the Symphony."
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Text-to-Speech</label>
                <div class="flex items-center">
                  <div class="relative inline-flex items-center mr-3">
                    <input type="checkbox" checked class="sr-only peer" />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <span class="text-sm text-gray-500">Enable voice responses</span>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Voice Model</label>
                <select class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option>US English (Female)</option>
                  <option>British English (Male)</option>
                  <option>Australian English</option>
                  <option>Indian English</option>
                </select>
                <p class="mt-1 text-xs text-gray-500">Voice is adapted to your location automatically.</p>
              </div>
            </div>
          </div>
          
          <!-- AI Personality Settings with Story Element -->
          <div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 class="text-lg font-semibold flex items-center">
                <span class="mr-2">🧠</span>
                AI Personality
              </h2>
            </div>
            <div class="p-4 space-y-3">
              <div class="italic text-sm text-gray-600 border-l-4 border-purple-300 pl-3 py-2 bg-purple-50 mb-4 vision-lake-story">
                "Personalities are like the fish in Vision Lake," Dr. Sabina said thoughtfully. "Each unique, each with a purpose, but all part of the same ecosystem."
              </div>
              
              <div class="flex items-center p-2 rounded-md bg-blue-50 border border-blue-100">
                <div class="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center mr-2">
                  <div class="w-2 h-2 rounded-full bg-blue-600"></div>
                </div>
                <div>
                  <div class="font-medium">Professional</div>
                  <div class="text-xs text-gray-500">Formal, business-focused responses</div>
                </div>
              </div>
              
              <div class="flex items-center p-2 rounded-md hover:bg-gray-50">
                <div class="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center mr-2">
                </div>
                <div>
                  <div class="font-medium">Friendly</div>
                  <div class="text-xs text-gray-500">Casual, conversational tone</div>
                </div>
              </div>
              
              <div class="flex items-center p-2 rounded-md hover:bg-gray-50">
                <div class="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center mr-2">
                </div>
                <div>
                  <div class="font-medium">Technical</div>
                  <div class="text-xs text-gray-500">Detailed, technically oriented responses</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Visual Theme Settings with Story Element -->
          <div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <h2 class="text-lg font-semibold flex items-center">
                <span class="mr-2">🎨</span>
                Visual Theme
              </h2>
            </div>
            <div class="p-4 space-y-4">
              <div class="italic text-sm text-gray-600 border-l-4 border-amber-300 pl-3 py-2 bg-amber-50 mb-4 vision-lake-story">
                As the sun set over Vision Lake, Dr. Grant pointed to the colors reflecting on the water. "The Symphony is like this lake at sunset—the themes you choose change how you see the world."
              </div>
              
              <div class="space-y-3">
                <div class="flex items-center p-2 rounded-md bg-blue-50 border border-blue-100">
                  <div class="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center mr-2">
                    <div class="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                  <div>
                    <div class="font-medium">Ocean Blue</div>
                    <div class="text-xs text-gray-500">Default corporate theme</div>
                  </div>
                </div>
                
                <div class="flex items-center p-2 rounded-md hover:bg-gray-50">
                  <div class="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center mr-2">
                  </div>
                  <div>
                    <div class="font-medium">Forest Green</div>
                    <div class="text-xs text-gray-500">Natural, calming theme</div>
                  </div>
                </div>
                
                <div class="flex items-center p-2 rounded-md hover:bg-gray-50">
                  <div class="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center mr-2">
                  </div>
                  <div>
                    <div class="font-medium">Sunset Orange</div>
                    <div class="text-xs text-gray-500">Vibrant, energetic theme</div>
                  </div>
                </div>
                
                <div class="flex items-center p-2 rounded-md hover:bg-gray-50">
                  <div class="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center mr-2">
                  </div>
                  <div>
                    <div class="font-medium">Dark Mode</div>
                    <div class="text-xs text-gray-500">Reduced eye strain at night</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Security Settings with Story Element -->
          <div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-teal-50">
              <h2 class="text-lg font-semibold flex items-center">
                <span class="mr-2">🔒</span>
                Security Settings
              </h2>
            </div>
            <div class="p-4 space-y-4">
              <div class="italic text-sm text-gray-600 border-l-4 border-green-300 pl-3 py-2 bg-green-50 mb-4 vision-lake-story">
                "The lake's edge contains boundaries for a reason," Dr. Lucy explained as they walked the shoreline. "Just as SallyPort creates boundaries to protect what matters most."
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Two-Factor Authentication</label>
                <div class="flex items-center">
                  <div class="relative inline-flex items-center mr-3">
                    <input type="checkbox" checked class="sr-only peer" />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </div>
                  <span class="text-sm text-gray-500">Enable 2FA for all logins</span>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Session Timeout</label>
                <select class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500">
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>2 hours</option>
                  <option>4 hours</option>
                </select>
                <p class="mt-1 text-xs text-gray-500">Automatically log out after inactivity.</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Security Alerts</label>
                <div class="flex items-center">
                  <div class="relative inline-flex items-center mr-3">
                    <input type="checkbox" checked class="sr-only peer" />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </div>
                  <span class="text-sm text-gray-500">Receive security notifications</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Vision Lake Chapter Navigation -->
        <div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h2 class="text-lg font-semibold flex items-center">
              <span class="mr-2">📘</span>
              Vision Lake Playbook Chapters
            </h2>
          </div>
          <div class="p-4">
            <div class="italic text-sm text-gray-600 border-l-4 border-indigo-300 pl-3 py-2 bg-indigo-50 mb-4 vision-lake-story">
              "The story of Vision Lake has many chapters," Mr. Roark said, holding an old leather-bound book. "Just as your journey with Symphony will unfold in chapters of discovery."
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <div class="font-medium mb-1">Chapter 1: Dawn at Vision Lake</div>
                <div class="text-xs text-gray-500">Introduction to the Symphony framework</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <div class="font-medium mb-1">Chapter 2: The Lake's Guardians</div>
                <div class="text-xs text-gray-500">Security protocols and best practices</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <div class="font-medium mb-1">Chapter 3: Ripples of Innovation</div>
                <div class="text-xs text-gray-500">Integration patterns and strategies</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <div class="font-medium mb-1">Chapter 4: The Sunset Reflection</div>
                <div class="text-xs text-gray-500">Advanced analytics and insights</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <div class="font-medium mb-1">Chapter 5: Night Stars Protocol</div>
                <div class="text-xs text-gray-500">Multi-tenant system architecture</div>
              </div>
              <div class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                <div class="font-medium mb-1">Chapter 6: The Morning Chorus</div>
                <div class="text-xs text-gray-500">Team collaboration and workflow</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Settings Actions -->
        <div class="mt-6 flex justify-end">
          <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors mr-4">
            Reset to Defaults
          </button>
          <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors save-button">
            Save Changes
          </button>
        </div>
      </div>
    `;
    
    // Update the DOM
    contentElement.innerHTML = viewContent;
    
    // Add event listeners
    const backButton = contentElement.querySelector('.back-button');
    if (backButton) {
      backButton.addEventListener('click', () => {
        AppState.setCurrentView('symphony');
      });
    }
    
    const saveButton = contentElement.querySelector('.save-button');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        // Simulate saving settings
        console.log("Saving settings...");
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-6 right-6 bg-green-50 border border-green-200 p-4 rounded-lg text-green-700 max-w-md z-50';
        notification.innerHTML = `
          <h3 class="font-bold mb-1">Settings Saved</h3>
          <p>Your preferences have been updated successfully.</p>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      });
    }
    
    // Add hover effects to story elements
    const storyElements = contentElement.querySelectorAll('.vision-lake-story');
    storyElements.forEach(element => {
      element.addEventListener('mouseenter', () => {
        element.classList.add('bg-blue-100');
        element.classList.add('shadow-sm');
      });
      
      element.addEventListener('mouseleave', () => {
        element.classList.remove('bg-blue-100');
        element.classList.remove('shadow-sm');
      });
    });
  };
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', initialize);
})();
