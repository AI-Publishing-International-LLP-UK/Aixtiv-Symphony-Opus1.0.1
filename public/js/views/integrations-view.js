// integrations-view.js - Multi-tenant integration system

/**
 * Integrations View Component
 * Renders the multi-tenant integration system with categories and push-button options
 */
(() => {
  // Cache DOM elements
  let contentElement;
  
  /**
   * Initialize the Integrations view component
   */
  const initialize = () => {
    contentElement = document.getElementById('app-content');
    
    if (!contentElement) {
      console.error("Content element not found in DOM");
      return;
    }
    
    // Subscribe to view changes
    AppState.subscribe('view', (state) => {
      if (state.currentView === 'integrations') {
        render();
      }
    });
  };
  
  /**
   * Render the Integrations view
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
          <p class="mb-4">Please login to access the Integrations Hub.</p>
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
    
    // Load integration categories and options
    const integrationCategories = await loadIntegrationCategories();
    
    // Render the integrations view
    const viewContent = `
      <div class="max-w-6xl mx-auto p-6">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-2xl font-bold">Multi-Tenant Integration Hub</h1>
          <button 
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors back-button"
          >
            Back to Dashboard
          </button>
        </div>
        
        <!-- Integration Hub Banner -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg mb-6">
          <div class="flex items-center">
            <div class="mr-6">
              <svg class="w-16 h-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="6" r="2" fill="white"/>
                <circle cx="15" cy="12" r="2" fill="white"/>
                <circle cx="9" cy="18" r="2" fill="white"/>
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-bold mb-1">One-Click Integration System</h2>
              <p class="text-purple-100">Deploy tenant integrations in seconds with our auto-configuration engine</p>
              <div class="mt-2 text-xs text-purple-200">
                <span class="bg-purple-500 rounded-full px-2 py-1 mr-2">Owner Access</span>
                <span class="bg-purple-500 rounded-full px-2 py-1">Multi-Tenant Ready</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Search and Filter -->
        <div class="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
          <div class="flex flex-wrap items-center">
            <div class="w-full md:w-1/2 lg:w-2/3 mb-3 md:mb-0 md:pr-4">
              <div class="relative">
                <input 
                  type="text" 
                  placeholder="Search integrations..." 
                  class="w-full border border-gray-300 rounded-md px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                <div class="absolute left-3 top-2.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <div class="w-full md:w-1/2 lg:w-1/3 flex space-x-2">
              <select class="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1">
                <option value="">All Categories</option>
                ${integrationCategories.map(category => 
                  `<option value="${category.id}">${category.name}</option>`
                ).join('')}
              </select>
              <select class="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1">
                <option value="">All Tenants</option>
                <option value="tenant1">Tenant Group A</option>
                <option value="tenant2">Tenant Group B</option>
                <option value="tenant3">Tenant Group C</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Integration Categories -->
        <div class="space-y-8">
          ${integrationCategories.map(category => `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div class="p-4 border-b border-gray-100 bg-gradient-to-r ${category.gradient}">
                <h2 class="text-lg font-semibold flex items-center">
                  <span class="mr-2">${category.icon}</span>
                  ${category.name}
                </h2>
              </div>
              <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  ${category.integrations.map(integration => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div class="flex items-start mb-3">
                        <div class="w-10 h-10 rounded-md bg-${integration.color}-100 flex items-center justify-center mr-3 flex-shrink-0">
                          <span class="text-${integration.color}-600">${integration.icon}</span>
                        </div>
                        <div>
                          <h3 class="font-medium text-gray-800">${integration.name}</h3>
                          <p class="text-xs text-gray-500">${integration.description}</p>
                        </div>
                      </div>
                      
                      <div class="flex flex-wrap gap-2 mb-3">
                        ${integration.tags.map(tag => 
                          `<span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">${tag}</span>`
                        ).join('')}
                      </div>
                      
                      <div class="flex justify-between items-center">
                        <span class="text-xs ${integration.status === 'Active' ? 'text-green-600' : 'text-gray-500'}">
                          ${integration.status}
                        </span>
                        <button 
                          class="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors integration-button" 
                          data-id="${integration.id}"
                          data-category="${category.id}"
                        >
                          ${integration.status === 'Active' ? 'Configure' : 'Integrate Now'}
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- Configuration Progress -->
        <div class="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <h2 class="text-lg font-semibold flex items-center">
              <span class="mr-2">📊</span>
              Integration Progress
            </h2>
          </div>
          <div class="p-4">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h3 class="font-medium text-gray-800">Current Tenant Integration Status</h3>
                <p class="text-sm text-gray-600">15 of 34 integrations configured</p>
              </div>
              <div class="mt-3 md:mt-0">
                <button class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm">
                  Download Report
                </button>
              </div>
            </div>
            
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div class="bg-blue-600 h-2.5 rounded-full" style="width: 44%"></div>
            </div>
            
            <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div class="p-3 bg-green-50 rounded-lg">
                <div class="text-xl font-bold text-green-700">15</div>
                <div class="text-xs text-gray-500">Active Integrations</div>
              </div>
              <div class="p-3 bg-amber-50 rounded-lg">
                <div class="text-xl font-bold text-amber-700">8</div>
                <div class="text-xs text-gray-500">Pending Configuration</div>
              </div>
              <div class="p-3 bg-blue-50 rounded-lg">
                <div class="text-xl font-bold text-blue-700">11</div>
                <div class="text-xs text-gray-500">Available to Install</div>
              </div>
              <div class="p-3 bg-purple-50 rounded-lg">
                <div class="text-xl font-bold text-purple-700">5</div>
                <div class="text-xs text-gray-500">Integration Requests</div>
              </div>
            </div>
          </div>
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
    
    // Add integration button event listeners
    const integrationButtons = contentElement.querySelectorAll('.integration-button');
    integrationButtons.forEach(button => {
      button.addEventListener('click', () => {
        const integrationId = button.getAttribute('data-id');
        const categoryId = button.getAttribute('data-category');
        
        // Call integration function
        integrateService(categoryId, integrationId);
      });
    });
  };
  
  /**
   * Integrate a service
   * @param {string} categoryId - Category ID
   * @param {string} integrationId - Integration ID
   */
  const integrateService = async (categoryId, integrationId) => {
    try {
      // Show integration in progress notification
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-6 right-6 bg-blue-50 border border-blue-200 p-4 rounded-lg text-blue-700 max-w-md z-50';
      notification.innerHTML = `
        <h3 class="font-bold mb-1">Integration in Progress</h3>
        <p>Configuring integration ${integrationId}...</p>
        <div class="mt-2 w-full bg-blue-200 rounded-full h-1.5">
          <div class="bg-blue-600 h-1.5 rounded-full integration-progress" style="width: 0%"></div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Simulate integration progress
      const progressBar = notification.querySelector('.integration-progress');
      
      // Simulate progress updates
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
        }
        
        if (progress >= 100) {
          clearInterval(progressInterval);
          
          // Update notification to show success
          notification.className = 'fixed bottom-6 right-6 bg-green-50 border border-green-200 p-4 rounded-lg text-green-700 max-w-md z-50';
          notification.innerHTML = `
            <h3 class="font-bold mb-1">Integration Complete</h3>
            <p>The integration has been successfully configured and is now active.</p>
          `;
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 3000);
          
          // Refresh the view
          render();
        }
      }, 150);
      
      // Call the integration gateway API in a real implementation
      await IntegrationGateway.callApi('Integrations', 'configure', {
        categoryId,
        integrationId,
        tenantGroup: 'default'
      });
      
    } catch (error) {
      console.error(`Integration error (${categoryId}/${integrationId}):`, error);
      
      // Show error notification
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-6 right-6 bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 max-w-md z-50';
      notification.innerHTML = `
        <h3 class="font-bold mb-1">Integration Failed</h3>
        <p>${error.message || "Failed to configure integration."}</p>
        <button class="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors retry-button">
          Retry
        </button>
      `;
      
      document.body.appendChild(notification);
      
      // Add retry button handler
      const retryButton = notification.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
          integrateService(categoryId, integrationId);
        });
      }
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 10000);
    }
  };
  
  /**
   * Load integration categories
   * @returns {Promise<Array>} - Integration categories
   */
  const loadIntegrationCategories = async () => {
    // In a real implementation, this would load from your integration gateway
    // For demo purposes, return predefined categories and integrations
    
    // These would be loaded from your integration gateway in a real implementation
    return [
      {
        id: 'communication',
        name: 'Communication & Messaging',
        icon: '💬',
        gradient: 'from-blue-50 to-indigo-50',
        integrations: [
          {
            id: 'slack',
            name: 'Slack Enterprise',
            description: 'Team collaboration and messaging platform',
            icon: '💬',
            color: 'blue',
            status: 'Active',
            tags: ['Messaging', 'Teams', 'Enterprise']
          },
          {
            id: 'teams',
            name: 'Microsoft Teams',
            description: 'Chat, meetings, and file collaboration',
            icon: '👥',
            color: 'purple',
            status: 'Active',
            tags: ['Microsoft', 'Enterprise', 'Meetings']
          },
          {
            id: 'zoom',
            name: 'Zoom Meetings',
            description: 'Video conferencing and webinars',
            icon: '📹',
            color: 'blue',
            status: 'Available',
            tags: ['Video', 'Meetings', 'Webinars']
          },
          {
            id: 'intercom',
            name: 'Intercom',
            description: 'Customer messaging platform',
            icon: '🔔',
            color: 'green',
            status: 'Available',
            tags: ['Customer', 'Support', 'Chat']
          },
          {
            id: 'discord',
            name: 'Discord Communities',
            description: 'Voice, video and text for communities',
            icon: '🎮',
            color: 'indigo',
            status: 'Available',
            tags: ['Communities', 'Voice', 'Gaming']
          },
          {
            id: 'twilio',
            name: 'Twilio SMS & Voice',
            description: 'Programmable SMS and voice calls',
            icon: '📱',
            color: 'red',
            status: 'Available',
            tags: ['SMS', 'Voice', 'API']
          }
        ]
      },
      {
        id: 'crm',
        name: 'CRM & Customer Management',
        icon: '👥',
        gradient: 'from-green-50 to-teal-50',
        integrations: [
          {
            id: 'salesforce',
            name: 'Salesforce',
            description: 'Cloud-based CRM platform',
            icon: '☁️',
            color: 'blue',
            status: 'Active',
            tags: ['CRM', 'Sales', 'Enterprise']
          },
          {
            id: 'hubspot',
            name: 'HubSpot CRM',
            description: 'Marketing, sales & service platform',
            icon: '🔄',
            color: 'orange',
            status: 'Available',
            tags: ['Marketing', 'CRM', 'Inbound']
          },
          {
            id: 'zendesk',
            name: 'Zendesk Suite',
            description: 'Customer service and engagement',
            icon: '🎯',
            color: 'green',
            status: 'Active',
            tags: ['Support', 'Ticketing', 'Customer']
          },
          {
            id: 'dynamics',
            name: 'Microsoft Dynamics',
            description: 'Business applications and CRM',
            icon: '📊',
            color: 'blue',
            status: 'Available',
            tags: ['Microsoft', 'Enterprise', 'CRM']
          },
          {
            id: 'pipedrive',
            name: 'Pipedrive',
            description: 'Sales pipeline management',
            icon: '📈',
            color: 'green',
            status: 'Available',
            tags: ['Sales', 'Pipeline', 'Deals']
          },
          {
            id: 'freshdesk',
            name: 'Freshdesk',
            description: 'Customer support and help desk',
            icon: '🎧',
            color: 'teal',
            status: 'Available',
            tags: ['Support', 'Help Desk', 'Tickets']
          }
        ]
      },
      {
        id: 'productivity',
        name: 'Productivity & Workflows',
        icon: '⚡',
        gradient: 'from-orange-50 to-amber-50',
        integrations: [
          {
            id: 'google-workspace',
            name: 'Google Workspace',
            description: 'Gmail, Docs, Drive, and more',
            icon: '📝',
            color: 'red',
            status: 'Active',
            tags: ['Documents', 'Email', 'Cloud']
          },
          {
            id: 'office365',
            name: 'Microsoft 365',
            description: 'Office apps and cloud services',
            icon: '📊',
            color: 'blue',
            status: 'Active',
            tags: ['Office', 'Microsoft', 'Documents']
          },
          {
            id: 'asana',
            name: 'Asana',
            description: 'Work management for teams',
            icon: '📋',
            color: 'pink',
            status: 'Available',
            tags: ['Tasks', 'Projects', 'Teams']
          },
          {
            id: 'trello',
            name: 'Trello',
            description: 'Visual project management',
            icon: '📌',
            color: 'blue',
            status: 'Available',
            tags: ['Kanban', 'Boards', 'Visual']
          },
          {
            id: 'notion',
            name: 'Notion',
            description: 'All-in-one workspace',
            icon: '📘',
            color: 'gray',
            status: 'Available',
            tags: ['Wiki', 'Docs', 'Workspace']
          },
          {
            id: 'evernote',
            name: 'Evernote',
            description: 'Notes and task management',
            icon: '📔',
            color: 'green',
            status: 'Available',
            tags: ['Notes', 'Tasks', 'Organization']
          }
        ]
      },
      {
        id: 'finance',
        name: 'Finance & Accounting',
        icon: '💰',
        gradient: 'from-emerald-50 to-green-50',
        integrations: [
          {
            id: 'quickbooks',
            name: 'QuickBooks',
            description: 'Accounting and financial management',
            icon: '📒',
            color: 'green',
            status: 'Active',
            tags: ['Accounting', 'Finance', 'Expenses']
          },
          {
            id: 'xero',
            name: 'Xero',
            description: 'Cloud-based accounting software',
            icon: '📊',
            color: 'blue',
            status: 'Available',
            tags: ['Accounting', 'Invoicing', 'Payroll']
          },
          {
            id: 'stripe',
            name: 'Stripe Payments',
            description: 'Online payment processing',
            icon: '💳',
            color: 'indigo',
            status: 'Active',
            tags: ['Payments', 'E-commerce', 'Subscription']
          },
          {
            id: 'paypal',
            name: 'PayPal Business',
            description: 'Online payment solutions',
            icon: '💲',
            color: 'blue',
            status: 'Available',
            tags: ['Payments', 'International', 'Marketplace']
          },
          {
            id: 'sage',
            name: 'Sage Accounting',
            description: 'Business management software',
            icon: '📑',
            color: 'green',
            status: 'Available',
            tags: ['ERP', 'Accounting', 'Enterprise']
          },
          {
            id: 'freshbooks',
            name: 'FreshBooks',
            description: 'Accounting for small businesses',
            icon: '📝',
            color: 'teal',
            status: 'Available',
            tags: ['Invoicing', 'Time Tracking', 'SMB']
          }
        ]
      },
      {
        id: 'ai',
        name: 'AI & Machine Learning',
        icon: '🤖',
        gradient: 'from-purple-50 to-indigo-50',
        integrations: [
          {
            id: 'openai',
            name: 'OpenAI API',
            description: 'AI models for text and images',
            icon: '🧠',
            color: 'purple',
            status: 'Active',
            tags: ['AI', 'GPT', 'Machine Learning']
          },
          {
            id: 'claude',
            name: 'Anthropic Claude',
            description: 'Conversational AI assistants',
            icon: '💬',
            color: 'blue',
            status: 'Active',
            tags: ['AI', 'Assistant', 'NLP']
          },
          {
            id: 'vertexai',
            name: 'Google Vertex AI',
            description: 'Machine learning on Google Cloud',
            icon: '📊',
            color: 'red',
            status: 'Available',
            tags: ['AI', 'Google Cloud', 'ML Tools']
          },
          {
            id: 'azureai',
            name: 'Azure AI',
            description: 'Microsoft AI services',
            icon: '☁️',
            color: 'blue',
            status: 'Available',
            tags: ['AI', 'Microsoft', 'Cloud']
          },
          {
            id: 'huggingface',
            name: 'Hugging Face',
            description: 'Open source NLP models',
            icon: '🤗',
            color: 'yellow',
            status: 'Available',
            tags: ['NLP', 'Open Source', 'Models']
          },
          {
            id: 'stability',
            name: 'Stability AI',
            description: 'Generative AI for images',
            icon: '🎨',
            color: 'purple',
            status: 'Available',
            tags: ['Image Generation', 'Stable Diffusion', 'Creative']
          }
        ]
      },
      {
        id: 'devops',
        name: 'DevOps & Deployment',
        icon: '⚙️',
        gradient: 'from-cyan-50 to-blue-50',
        integrations: [
          {
            id: 'github',
            name: 'GitHub Enterprise',
            description: 'Code hosting and development',
            icon: '📦',
            color: 'gray',
            status: 'Active',
            tags: ['Git', 'CI/CD', 'Code']
          },
          {
            id: 'gitlab',
            name: 'GitLab',
            description: 'Complete DevOps platform',
            icon: '🦊',
            color: 'orange',
            status: 'Available',
            tags: ['DevOps', 'CI/CD', 'Repositories']
          },
          {
            id: 'aws',
            name: 'AWS Cloud',
            description: 'Amazon Web Services',
            icon: '☁️',
            color: 'orange',
            status: 'Active',
            tags: ['Cloud', 'Hosting', 'Services']
          },
          {
            id: 'azure',
            name: 'Microsoft Azure',
            description: 'Cloud computing services',
            icon: '☁️',
            color: 'blue',
            status: 'Available',
            tags: ['Cloud', 'Microsoft', 'Enterprise']
          },
          {
            id: 'gcp',
            name: 'Google Cloud Platform',
            description: 'Google cloud services',
            icon: '☁️',
            color: 'red',
            status: 'Active',
            tags: ['Cloud', 'Google', 'Services']
          },
          {
            id: 'docker',
            name: 'Docker Enterprise',
            description: 'Container platform',
            icon: '🐳',
            color: 'blue',
            status: 'Available',
            tags: ['Containers', 'Deployment', 'Microservices']
          }
        ]
      },
      {
        id: 'analytics',
        name: 'Analytics & Reporting',
        icon: '📊',
        gradient: 'from-amber-50 to-yellow-50',
        integrations: [
          {
            id: 'ga4',
            name: 'Google Analytics 4',
            description: 'Website and app analytics',
            icon: '📈',
            color: 'yellow',
            status: 'Active',
            tags: ['Web Analytics', 'Tracking', 'Reporting']
          },
          {
            id: 'mixpanel',
            name: 'Mixpanel',
            description: 'Product analytics platform',
            icon: '📊',
            color: 'blue',
            status: 'Available',
            tags: ['Product', 'User Analytics', 'Funnels']
          },
          {
            id: 'tableau',
            name: 'Tableau',
            description: 'Data visualization software',
            icon: '📈',
            color: 'green',
            status: 'Available',
            tags: ['Visualization', 'BI', 'Dashboards']
          },
          {
            id: 'looker',
            name: 'Looker',
            description: 'Business intelligence platform',
            icon: '📊',
            color: 'blue',
            status: 'Available',
            tags: ['BI', 'Dashboards', 'Reporting']
          },
          {
            id: 'powerbi',
            name: 'Power BI',
            description: 'Microsoft business analytics',
            icon: '📊',
            color: 'yellow',
            status: 'Active',
            tags: ['Microsoft', 'Analytics', 'Visualization']
          },
          {
            id: 'amplitude',
            name: 'Amplitude',
            description: 'Product analytics platform',
            icon: '📉',
            color: 'purple',
            status: 'Available',
            tags: ['Product', 'Behavior', 'Analytics']
          }
        ]
      },
      {
        id: 'security',
        name: 'Security & Compliance',
        icon: '🔒',
        gradient: 'from-red-50 to-orange-50',
        integrations: [
          {
            id: 'okta',
            name: 'Okta',
            description: 'Identity and access management',
            icon: '🔑',
            color: 'blue',
            status: 'Active',
            tags: ['SSO', 'Identity', 'Authentication']
          },
          {
            id: 'auth0',
            name: 'Auth0',
            description: 'Authentication and authorization',
            icon: '🔐',
            color: 'blue',
            status: 'Available',
            tags: ['Identity', 'Auth', 'SSO']
          },
          {
            id: 'crowdstrike',
            name: 'CrowdStrike',
            description: 'Endpoint protection platform',
            icon: '🛡️',
            color: 'red',
            status: 'Available',
            tags: ['Security', 'Endpoint', 'Protection']
          },
          {
            id: 'onelogin',
            name: 'OneLogin',
            description: 'Unified access management',
            icon: '🔑',
            color: 'blue',
            status: 'Available',
            tags: ['SSO', 'Identity', 'Access']
          },
          {
            id: 'cloudflare',
            name: 'Cloudflare',
            description: 'Web security and performance',
            icon: '☁️',
            color: 'orange',
            status: 'Active',
            tags: ['CDN', 'Security', 'Performance']
          },
          {
            id: 'duo',
            name: 'Duo Security',
            description: 'Multi-factor authentication',
            icon: '🔐',
            color: 'green',
            status: 'Available',
            tags: ['MFA', '2FA', 'Authentication']
          }
        ]
      },
      {
        id: 'ecommerce',
        name: 'E-Commerce & Retail',
        icon: '🛒',
        gradient: 'from-green-50 to-lime-50',
        integrations: [
          {
            id: 'shopify',
            name: 'Shopify',
            description: 'E-commerce platform',
            icon: '🛍️',
            color: 'green',
            status: 'Active',
            tags: ['E-commerce', 'Online Store', 'Retail']
          },
          {
            id: 'woocommerce',
            name: 'WooCommerce',
            description: 'WordPress e-commerce',
            icon: '🛒',
            color: 'purple',
            status: 'Available',
            tags: ['WordPress', 'E-commerce', 'Plugins']
          },
          {
            id: 'bigcommerce',
            name: 'BigCommerce',
            description: 'E-commerce platform',
            icon: '🏪',
            color: 'blue',
            status: 'Available',
            tags: ['E-commerce', 'Enterprise', 'Headless']
          },
          {
            id: 'magento',
            name: 'Adobe Commerce',
            description: 'E-commerce platform (Magento)',
            icon: '🛍️',
            color: 'orange',
            status: 'Available',
            tags: ['Adobe', 'E-commerce', 'Enterprise']
          },
          {
            id: 'square',
            name: 'Square',
            description: 'Payment and point of sale',
            icon: '💳',
            color: 'green',
            status: 'Active',
            tags: ['Payments', 'POS', 'Retail']
          },
          {
            id: 'opencart',
            name: 'OpenCart',
            description: 'Open source e-commerce',
            icon: '🛒',
            color: 'blue',
            status: 'Available',
            tags: ['Open Source', 'E-commerce', 'Self-hosted']
          }
        ]
      },
      {
        id: 'marketing',
        name: 'Marketing & Automation',
        icon: '📣',
        gradient: 'from-pink-50 to-rose-50',
        integrations: [
          {
            id: 'mailchimp',
            name: 'Mailchimp',
            description: 'Email marketing platform',
            icon: '📧',
            color: 'yellow',
            status: 'Active',
            tags: ['Email', 'Marketing', 'Automation']
          },
          {
            id: 'marketo',
            name: 'Marketo',
            description: 'Marketing automation software',
            icon: '📊',
            color: 'purple',
            status: 'Available',
            tags: ['Automation', 'Lead Gen', 'Enterprise']
          },
          {
            id: 'constantcontact',
            name: 'Constant Contact',
            description: 'Email marketing services',
            icon: '📧',
            color: 'blue',
            status: 'Available',
            tags: ['Email', 'SMB', 'Marketing']
          },
          {
            id: 'sendinblue',
            name: 'Sendinblue',
            description: 'Email & marketing automation',
            icon: '📨',
            color: 'blue',
            status: 'Available',
            tags: ['Email', 'SMS', 'Automation']
          },
          {
            id: 'hootsuite',
            name: 'Hootsuite',
            description: 'Social media management',
            icon: '📱',
            color: 'teal',
            status: 'Active',
            tags: ['Social Media', 'Scheduling', 'Analytics']
          },
          {
            id: 'buffer',
            name: 'Buffer',
            description: 'Social media management',
            icon: '📱',
            color: 'blue',
            status: 'Available',
            tags: ['Social Media', 'Publishing', 'Analytics']
          }
        ]
      }
    ];
  };
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', initialize);
})();
