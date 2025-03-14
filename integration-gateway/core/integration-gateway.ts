      console.error(`PubSub subscription error for ${this.serviceId}:`, error);
      this.metrics.errors++;
    });
    
    this.subscription = subscription;
    
    console.log(`PubSub binding started for service: ${this.serviceId}`);
    
    return true;
  }
  
  async stop() {
    if (this.subscription) {
      this.subscription.removeAllListeners();
      this.subscription = null;
    }
    
    await super.stop();
    console.log(`PubSub binding stopped for service: ${this.serviceId}`);
    
    return true;
  }
  
  async processMessage(message) {
    await super.processMessage(message);
    
    try {
      const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
      
      // Process message based on service-specific logic
      const result = await this._processServiceMessage(data);
      
      // Publish processing event
      await pubsub.topic('pubsub-events').publish(Buffer.from(JSON.stringify({
        serviceId: this.serviceId,
        messageId: message.id,
        timestamp: new Date().toISOString(),
        result
      })));
      
      return result;
    } catch (error) {
      console.error(`Error processing PubSub message for ${this.serviceId}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }
  
  async _processServiceMessage(data) {
    // Service-specific message processing
    // This would be customized based on the service requirements
    return { status: 'processed', data };
  }
}

/**
 * REST API binding for standard REST APIs
 */
class RestBinding extends BaseBinding {
  constructor(serviceId, config, gateway) {
    super(serviceId, config, gateway);
    this.endpoints = config.rest?.endpoints || [];
    this.baseUrl = config.rest?.baseUrl;
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }
  
  async initialize() {
    await super.initialize();
    
    if (!this.baseUrl) {
      throw new Error(`REST base URL not specified for service: ${this.serviceId}`);
    }
    
    // Initialize interceptors
    this._setupInterceptors();
    
    this.status = 'initialized';
    console.log(`REST binding initialized for service: ${this.serviceId}`);
    
    return true;
  }
  
  _setupInterceptors() {
    // Add request and response interceptors
    // These would be customized based on service requirements
  }
  
  async start() {
    await super.start();
    console.log(`REST binding started for service: ${this.serviceId}`);
    return true;
  }
  
  async stop() {
    await super.stop();
    console.log(`REST binding stopped for service: ${this.serviceId}`);
    return true;
  }
  
  async processMessage(message) {
    await super.processMessage(message);
    return { status: 'processed' };
  }
}

/**
 * Metrics Collector for monitoring and telemetry
 */
class MetricsCollector {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.collectionInterval = null;
  }
  
  startCollection() {
    // Start periodic metrics collection
    this.collectionInterval = setInterval(() => {
      this._reportMetrics();
    }, 60000); // Report every minute
    
    console.log(`Metrics collection started for ${this.serviceName}`);
  }
  
  stopCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }
  
  incrementCounter(name, value = 1) {
    const currentValue = this.counters.get(name) || 0;
    this.counters.set(name, currentValue + value);
  }
  
  setGauge(name, value) {
    this.gauges.set(name, value);
  }
  
  observeHistogram(name, value) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    
    const values = this.histograms.get(name);
    values.push(value);
    
    // Keep only last 1000 observations to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
  }
  
  async _reportMetrics() {
    try {
      // Create metrics payload
      const metrics = {
        timestamp: new Date().toISOString(),
        service: this.serviceName,
        counters: Object.fromEntries(this.counters),
        gauges: Object.fromEntries(this.gauges),
        histograms: Object.fromEntries(
          Array.from(this.histograms.entries()).map(([name, values]) => {
            // Calculate histogram statistics
            return [name, this._calculateHistogramStats(values)];
          })
        )
      };
      
      // Report to Cloud Monitoring
      await this._writeToCloudMonitoring(metrics);
      
      // Publish metrics event
      await pubsub.topic('metrics-events').publish(Buffer.from(JSON.stringify(metrics)));
      
    } catch (error) {
      console.error('Error reporting metrics:', error);
    }
  }
  
  _calculateHistogramStats(values) {
    if (values.length === 0) {
      return { count: 0 };
    }
    
    // Sort values for percentile calculation
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  async _writeToCloudMonitoring(metrics) {
    // In a production environment, this would write to Cloud Monitoring
    // For this example, we'll just log to console
    console.debug('Metrics report:', JSON.stringify(metrics, null, 2));
  }
}

/**
 * Recovery Manager for handling system recovery
 */
class RecoveryManager {
  constructor(gateway) {
    this.gateway = gateway;
    this.recoveryStrategies = new Map();
    this.recoveryHistory = [];
  }
  
  async initialize() {
    // Register recovery strategies for different failure scenarios
    this.registerRecoveryStrategy('connection_failure', this._handleConnectionFailure.bind(this));
    this.registerRecoveryStrategy('token_refresh_failure', this._handleTokenRefreshFailure.bind(this));
    this.registerRecoveryStrategy('service_unhealthy', this._handleServiceUnhealthy.bind(this));
    
    console.log('Recovery manager initialized');
    return true;
  }
  
  registerRecoveryStrategy(failureType, strategyFn) {
    this.recoveryStrategies.set(failureType, strategyFn);
  }
  
  async recoverFromFailure(serviceId, failureType, context = {}) {
    try {
      console.log(`Attempting recovery for service ${serviceId} from ${failureType}`);
      
      const strategy = this.recoveryStrategies.get(failureType);
      
      if (!strategy) {
        throw new Error(`No recovery strategy found for failure type: ${failureType}`);
      }
      
      // Execute recovery strategy
      const result = await strategy(serviceId, context);
      
      // Record recovery attempt
      this.recoveryHistory.push({
        serviceId,
        failureType,
        timestamp: new Date(),
        success: result.success,
        actions: result.actions
      });
      
      // Store in Firestore
      await db.collection('recoveryAttempts').add({
        serviceId,
        failureType,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: result.success,
        actions: result.actions,
        context
      });
      
      return result;
    } catch (error) {
      console.error(`Recovery failed for ${serviceId} (${failureType}):`, error);
      
      // Store failure in Firestore
      await db.collection('recoveryAttempts').add({
        serviceId,
        failureType,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: false,
        error: error.message,
        context
      });
      
      throw error;
    }
  }
  
  async _handleConnectionFailure(serviceId, context) {
    const actions = [];
    
    // Step 1: Check if service config exists
    const serviceDoc = await db.collection('integrationServices').doc(serviceId).get();
    
    if (!serviceDoc.exists) {
      return {
        success: false,
        actions,
        message: 'Service configuration not found'
      };
    }
    
    // Step 2: Attempt to re-initialize connection
    actions.push('Attempting to re-initialize connection');
    
    try {
      const serviceConfig = serviceDoc.data();
      const connection = await this.gateway.initializeConnection(serviceId, serviceConfig);
      this.gateway.connections.set(serviceId, connection);
      actions.push('Connection re-initialized successfully');
      
      // Step 3: Update status in Firestore
      await db.collection('integrationServices').doc(serviceId).update({
        status: 'active',
        lastConnected: admin.firestore.FieldValue.serverTimestamp(),
        recoveryAttempts: admin.firestore.FieldValue.increment(1)
      });
      actions.push('Service status updated in Firestore');
      
      return {
        success: true,
        actions,
        message: 'Connection recovered successfully'
      };
    } catch (error) {
      actions.push(`Connection re-initialization failed: ${error.message}`);
      
      // Step 4: If reconnection fails, try to recreate service adapter
      try {
        actions.push('Attempting to recreate service adapter');
        const serviceConfig = serviceDoc.data();
        const adapter = this.gateway.createServiceAdapter(serviceConfig);
        this.gateway.adapters.set(serviceId, adapter);
        
        // Try connection again
        const connection = await this.gateway.initializeConnection(serviceId, serviceConfig);
        this.gateway.connections.set(serviceId, connection);
        actions.push('Service adapter recreated and connection established');
        
        return {
          success: true,
          actions,
          message: 'Connection recovered by recreating adapter'
        };
      } catch (adapterError) {
        actions.push(`Service adapter recreation failed: ${adapterError.message}`);
        
        return {
          success: false,
          actions,
          message: 'Connection recovery failed'
        };
      }
    }
  }
  
  async _handleTokenRefreshFailure(serviceId, context) {
    const actions = [];
    
    // Step 1: Check if service exists
    if (!this.gateway.authStrategies.has(serviceId)) {
      return {
        success: false,
        actions,
        message: 'Service auth strategy not found'
      };
    }
    
    // Step 2: Get auth strategy
    const authStrategy = this.gateway.authStrategies.get(serviceId);
    actions.push('Retrieved auth strategy');
    
    // Step 3: Re-initialize auth strategy
    try {
      actions.push('Attempting to re-initialize auth strategy');
      await authStrategy.initialize();
      actions.push('Auth strategy re-initialized');
      
      // Step 4: Update connection credentials
      const connection = this.gateway.connections.get(serviceId);
      connection.credentials = authStrategy.getMaskedCredentials();
      actions.push('Connection credentials updated');
      
      return {
        success: true,
        actions,
        message: 'Token refresh recovery successful'
      };
    } catch (error) {
      actions.push(`Auth strategy re-initialization failed: ${error.message}`);
      
      // Step 5: If client credentials flow is available, try it
      try {
        if (authStrategy._performClientCredentialsFlow) {
          actions.push('Attempting client credentials flow');
          await authStrategy._performClientCredentialsFlow();
          actions.push('Client credentials flow successful');
          
          // Update connection credentials
          const connection = this.gateway.connections.get(serviceId);
          connection.credentials = authStrategy.getMaskedCredentials();
          actions.push('Connection credentials updated');
          
          return {
            success: true,
            actions,
            message: 'Token refresh recovery successful via client credentials'
          };
        }
      } catch (flowError) {
        actions.push(`Client credentials flow failed: ${flowError.message}`);
      }
      
      return {
        success: false,
        actions,
        message: 'Token refresh recovery failed'
      };
    }
  }
  
  async _handleServiceUnhealthy(serviceId, context) {
    const actions = [];
    
    // Step 1: Check if service exists
    if (!this.gateway.connections.has(serviceId)) {
      return {
        success: false,
        actions,
        message: 'Service connection not found'
      };
    }
    
    // Step 2: Check specific health issue if provided
    const healthIssue = context.healthIssue || 'unknown';
    actions.push(`Identified health issue: ${healthIssue}`);
    
    // Step 3: Apply recovery based on health issue
    switch (healthIssue) {
      case 'timeout':
        actions.push('Applying timeout recovery strategy');
        // Increase timeouts and retry
        break;
      
      case 'rate_limit':
        actions.push('Applying rate limit recovery strategy');
        // Implement backoff and retry
        break;
      
      case 'api_error':
        actions.push('Applying API error recovery strategy');
        // Check for API version issues or endpoint changes
        break;
      
      default:
        // General reconnection approach
        actions.push('Applying general recovery strategy');
        try {
          const result = await this._handleConnectionFailure(serviceId, context);
          actions.push(...result.actions);
          
          if (result.success) {
            return {
              success: true,
              actions,
              message: 'Service health recovered via connection recovery'
            };
          }
        } catch (error) {
          actions.push(`Connection recovery failed: ${error.message}`);
        }
    }
    
    // Step 4: If all else fails, try adapter recreation as last resort
    try {
      actions.push('Attempting adapter recreation as last resort');
      
      const serviceDoc = await db.collection('integrationServices').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        actions.push('Service configuration not found');
        return {
          success: false,
          actions,
          message: 'Service health recovery failed'
        };
      }
      
      const serviceConfig = serviceDoc.data();
      
      // Recreate adapter
      const adapter = this.gateway.createServiceAdapter(serviceConfig);
      this.gateway.adapters.set(serviceId, adapter);
      actions.push('Service adapter recreated');
      
      // Create auth strategy
      const authStrategy = this.gateway.createAuthStrategy(serviceConfig);
      this.gateway.authStrategies.set(serviceId, authStrategy);
      actions.push('Auth strategy recreated');
      
      // Initialize connection
      const connection = await this.gateway.initializeConnection(serviceId, serviceConfig);
      this.gateway.connections.set(serviceId, connection);
      actions.push('Connection re-established');
      
      return {
        success: true,
        actions,
        message: 'Service health recovered via complete recreation'
      };
    } catch (error) {
      actions.push(`Complete recreation failed: ${error.message}`);
      
      return {
        success: false,
        actions,
        message: 'Service health recovery failed'
      };
    }
  }
  
  getRecoveryHistory() {
    return this.recoveryHistory;
  }
}

// Credential Management for AIXTIV
// This section handles secure access to credentials for all required services
const CredentialManager = {
  /**
   * Initialize credential manager
   */
  async initialize() {
    console.log('Initializing credential manager...');
    
    // Validate GCP project
    if (process.env.GOOGLE_CLOUD_PROJECT !== 'api-for-warp-drive') {
      throw new Error('Invalid GCP project. Expected: api-for-warp-drive');
    }
    
    // Verify service account permissions
    try {
      const serviceAccount = await this._getServiceAccountDetails();
      
      if (!serviceAccount.email.endsWith('@api-for-warp-drive.iam.gserviceaccount.com')) {
        console.warn('Service account may not have correct permissions');
      }
    } catch (error) {
      console.error('Error verifying service account:', error);
    }
    
    // Load credentials from Secret Manager
    await this._loadSecrets();
    
    console.log('Credential manager initialized');
    return true;
  },
  
  /**
   * Get service account details
   * @private
   */
  async _getServiceAccountDetails() {
    // In a real implementation, this would use GCP API to get service account details
    // For this example, we'll return mock data
    return {
      email: 'integration-gateway@api-for-warp-drive.iam.gserviceaccount.com',
      uniqueId: '123456789',
      oauth2ClientId: 'integration-gateway-client'
    };
  },
  
  /**
   * Load secrets from GCP Secret Manager
   * @private
   */
  async _loadSecrets() {
    try {
      console.log('Loading secrets from Secret Manager...');
      
      // In a production environment, this would use GCP Secret Manager API
      // For this example, we'll set predefined secrets
      
      // Set LLM API credentials
      process.env.OPENAI_API_KEY = await this._getSecret('openai-api-key');
      process.env.ANTHROPIC_API_KEY = await this._getSecret('anthropic-api-key');
      process.env.HUGGINGFACE_API_KEY = await this._getSecret('huggingface-api-key');
      
      // Set database credentials
      process.env.FIRESTORE_PRIVATE_KEY = await this._getSecret('firestore-private-key');
      process.env.PINECONE_API_KEY = await this._getSecret('pinecone-api-key');
      process.env.PINECONE_ENVIRONMENT = await this._getSecret('pinecone-environment');
      
      // Set integration credentials
      process.env.GITHUB_CLIENT_ID = await this._getSecret('github-client-id');
      process.env.GITHUB_CLIENT_SECRET = await this._getSecret('github-client-secret');
      
      // Set SSO configurations
      process.env.SAML_PRIVATE_KEY = await this._getSecret('saml-private-key');
      process.env.SAML_CERT = await this._getSecret('saml-cert');
      
      // Set workload identity federation configuration
      process.env.WORKLOAD_IDENTITY_CONFIG = await this._getSecret('workload-identity-config');
      
      console.log('Secrets loaded successfully');
      
      return true;
    } catch (error) {
      console.error('Error loading secrets:', error);
      throw error;
    }
  },
  
  /**
   * Get a secret from Secret Manager
   * @private
   */
  async _getSecret(secretName) {
    try {
      // In a production environment, this would use GCP Secret Manager API
      // For this example, we'll return mock values
      
      const mockSecrets = {
        'openai-api-key': 'sk-openai-mock-key',
        'anthropic-api-key': 'sk-anthropic-mock-key',
        'huggingface-api-key': 'hf-mock-key',
        'firestore-private-key': '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----',
        'pinecone-api-key': 'pinecone-mock-key',
        'pinecone-environment': 'us-west1-gcp',
        'github-client-id': 'github-mock-client-id',
        'github-client-secret': 'github-mock-client-secret',
        'saml-private-key': '-----BEGIN PRIVATE KEY-----\nMOCK_SAML_KEY\n-----END PRIVATE KEY-----',
        'saml-cert': '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
        'workload-identity-config': JSON.stringify({
          'type': 'external_account',
          'audience': 'api-for-warp-drive',
          'provider_id': 'projects/123456789/locations/global/workloadIdentityPools/aixtiv-pool/providers/aixtiv-provider'
        })
      };
      
      // Simulate accessing Secret Manager
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mockSecrets[secretName]) {
        throw new Error(`Secret not found: ${secretName}`);
      }
      
      return mockSecrets[secretName];
    } catch (error) {
      console.error(`Error getting secret ${secretName}:`, error);
      throw error;
    }
  },
  
  /**
   * Get credentials for a specific service
   */
  async getServiceCredentials(serviceType) {
    try {
      switch (serviceType) {
        case 'openai':
          return {
            apiKey: process.env.OPENAI_API_KEY
          };
        
        case 'anthropic':
          return {
            apiKey: process.env.ANTHROPIC_API_KEY
          };
          
        case 'huggingface':
          return {
            apiKey: process.env.HUGGINGFACE_API_KEY
          };
          
        case 'firebase':
          return {
            projectId: 'api-for-warp-drive',
            clientEmail: 'firebase-adminsdk@api-for-warp-drive.iam.gserviceaccount.com',
            privateKey: process.env.FIRESTORE_PRIVATE_KEY
          };
          
        case 'pinecone':
          return {
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT
          };
          
        case 'github':
          return {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
          };
          
        default:
          // For other service types, load from Firestore
          const credentialDoc = await db.collection('serviceCredentials')
            .where('type', '==', serviceType)
            .where('status', '==', 'active')
            .limit(1)
            .get();
            
          if (credentialDoc.empty) {
            throw new Error(`No credentials found for service type: ${serviceType}`);
          }
          
          return credentialDoc.docs[0].data().credentials;
      }
    } catch (error) {
      console.error(`Error getting credentials for ${serviceType}:`, error);
      throw error;
    }
  },
  
  /**
   * Create OAuth configuration for a service
   */
  async createOAuthConfig(serviceType) {
    try {
      const baseConfig = {
        callbackURL: `https://api.aixtiv.io/auth/${serviceType}/callback`,
        scope: ['profile', 'email']
      };
      
      // Get service-specific configuration
      const credentials = await this.getServiceCredentials(serviceType);
      
      return {
        ...baseConfig,
        clientID: credentials.clientId,
        clientSecret: credentials.clientSecret,
        authorizationURL: credentials.authorizationURL,
        tokenURL: credentials.tokenURL,
        scope: credentials.scope || baseConfig.scope
      };
    } catch (error) {
      console.error(`Error creating OAuth config for ${serviceType}:`, error);
      throw error;
    }
  },
  
  /**
   * Create SAML configuration for SSO
   */
  async createSAMLConfig() {
    return {
      entryPoint: 'https://sso.aixtiv.io/saml2/idp',
      issuer: 'api-for-warp-drive',
      cert: process.env.SAML_CERT,
      privateKey: process.env.SAML_PRIVATE_KEY,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      validateInResponseTo: true,
      disableRequestedAuthnContext: true
    };
  }
};

// Initialize Configuration for AIXTIV environment
const config = {
  projectId: 'api-for-warp-drive',
  region: 'us-west1',
  credentials: {
    email: 'pr@coaching2100.com',
    project: 'api-for-warp-drive'
  },
  services: {
    firebase: {
      databaseURL: 'https://api-for-warp-drive.firebaseio.com',
      storageBucket: 'api-for-warp-drive.appspot.com'
    },
    pinecone: {
      environment: 'us-west1-gcp',
      indexes: {
        agents: { dimensions: 1536, metric: 'cosine' },
        bids: { dimensions: 1536, metric: 'cosine' },
        content: { dimensions: 1536, metric: 'cosine' }
      }
    }
  },
  api: {
    port: process.env.PORT || 3000,
    basePath: '/api/v1',
    auth: {
      enabled: true,
      jwksUri: 'https://api-for-warp-drive.firebaseapp.com/.well-known/jwks.json',
      issuer: 'https://securetoken.google.com/api-for-warp-drive'
    }
  },
  integrations: {
    llm: {
      primary: {
        type: 'anthropic',
        models: ['claude-3-7-sonnet-20250219', 'claude-3-opus', 'claude-3-5-sonnet']
      },
      fallbacks: [
        {
          type: 'openai',
          models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
        },
        {
          type: 'vertexai',
          models: ['text-unicorn', 'text-bison']
        }
      ]
    },
    github: {
      enabled: true,
      webhookPath: '/webhooks/github',
      auth: {
        type: 'oauth2',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET
      }
    }
  },
  monitoring: {
    enabled: true,
    alertChannels: ['email', 'slack'],
    errorThreshold: 5,
    healthCheckInterval: 60 // seconds
  }
};

// Express app for API endpoints
const app = express();
app.use(express.json());

// Initialize authentication
app.use(passport.initialize());

// Create and export the Integration Gateway singleton
const gateway = new IntegrationGateway();
global.integrationGateway = gateway;

// Initialize the system
async function initializeSystem() {
  try {
    console.log('Initializing AIXTIV Integration Gateway system...');
    
    // Initialize credential manager
    await CredentialManager.initialize();
    
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.projectId,
        clientEmail: config.credentials.email,
        privateKey: process.env.FIRESTORE_PRIVATE_KEY
      }),
      databaseURL: config.services.firebase.databaseURL,
      storageBucket: config.services.firebase.storageBucket
    });
    
    // Initialize gateway
    await gateway.initialize();
    
    // Start API server
    const port = config.api.port;
    app.listen(port, () => {
      console.log(`AIXTIV Integration Gateway API listening on port ${port}`);
    });
    
    console.log('AIXTIV Integration Gateway system initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize system:', error);
    process.exit(1);
  }
}

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
  const health = gateway.healthMonitor.getStatus();
  res.json(health);
});

// Service registration endpoint
app.post('/api/v1/services', async (req, res) => {
  try {
    const serviceConfig = req.body;
    const result = await gateway.registerService(serviceConfig);
    res.status(201).json(result);
  } catch (error) {
    console.error('Service registration failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Service execution endpoint
app.post('/api/v1/services/:serviceId/:operation', async (req, res) => {
  try {
    const { serviceId, operation } = req.params;
    const params = req.body;
    
    // Execute operation
    const result = await gateway.execute(serviceId, operation, params);
    
    res.json(result);
  } catch (error) {
    console.error(`Operation ${operation} failed for ${req.params.serviceId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Model selection endpoint
app.post('/api/v1/models/select', async (req, res) => {
  try {
    const { userType, taskType, requirementProfile } = req.body;
    
    // Select model
    const model = await gateway.selectModel(userType, taskType, requirementProfile);
    
    res.json(model);
  } catch (error) {
    console.error('Model selection failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook handler
app.post('/webhooks/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    if (!gateway.webhookHandlers.has(serviceId)) {
      res.status(404).json({ error: `No webhook handler for service: ${serviceId}` });
      return;
    }
    
    // Call the webhook handler
    await gateway.webhookHandlers.get(serviceId)(req, res);
  } catch (error) {
    console.error(`Webhook handling failed for ${req.params.serviceId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Export API and Gateway for use in other modules
module.exports = {
  app,
  gateway,
  initializeSystem,
  CredentialManager,
  config
};

// Start if run directly
if (require.main === module) {
  initializeSystem();
}        console.warn(`Unhealthy services detected: ${unhealthyServices.join(', ')}`);
        
        // Update overall status
        this.status.overall = unhealthyServices.length / Object.keys(results).length > 0.5 ? 
          'critical' : 'degraded';
        
        // Attempt to reconnect unhealthy services
        for (const serviceId of unhealthyServices) {
          this.reconnectService(serviceId).catch(error => {
            console.error(`Service reconnection failed for ${serviceId}:`, error);
          });
        }
        
        // Send alert if multiple services are unhealthy
        if (unhealthyServices.length >= 3) {
          await this._sendSystemAlert({
            severity: 'warning',
            message: `Multiple services unhealthy: ${unhealthyServices.join(', ')}`,
            timestamp: now
          });
        }
      } else {
        this.status.overall = 'healthy';
      }
      
      // Update service status
      for (const [serviceId, health] of Object.entries(results)) {
        this.status.services[serviceId] = health;
      }
      
      // Publish health check results
      await pubsub.topic('service-health-events').publish(Buffer.from(JSON.stringify({
        timestamp: now.toISOString(),
        results,
        overall: this.status.overall
      })));
      
      console.log(`Health check completed. Overall status: ${this.status.overall}`);
      
      return results;
    } catch (error) {
      console.error('Health check failed:', error);
      
      // Update status
      this.status.overall = 'unknown';
      this.status.lastCheck = new Date();
      
      // Send alert
      await this._sendSystemAlert({
        severity: 'error',
        message: `Health check system failed: ${error.message}`,
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Attempt to reconnect a service
   * @param {string} serviceId - Service identifier
   */
  async reconnectService(serviceId) {
    try {
      console.log(`Attempting to reconnect service: ${serviceId}`);
      
      // Get service configuration
      const serviceDoc = await db.collection('integrationServices').doc(serviceId).get();
      
      if (!serviceDoc.exists) {
        throw new Error(`Service ${serviceId} not found`);
      }
      
      const serviceConfig = serviceDoc.data();
      
      // Re-initialize connection
      const connection = await this.gateway.initializeConnection(serviceId, serviceConfig);
      this.gateway.connections.set(serviceId, connection);
      
      console.log(`Service ${serviceId} reconnected successfully`);
      
      // Update status in Firestore
      await db.collection('integrationServices').doc(serviceId).update({
        status: 'active',
        lastConnected: admin.firestore.FieldValue.serverTimestamp(),
        reconnectionAttempts: admin.firestore.FieldValue.increment(1)
      });
      
      // Update metrics
      this.gateway.metrics.incrementCounter('service_reconnections_success');
      this.gateway.metrics.setGauge(`connection_status_${serviceId}`, 1);
      
      // Publish reconnection event
      await pubsub.topic('service-reconnection-events').publish(Buffer.from(JSON.stringify({
        serviceId,
        timestamp: new Date().toISOString(),
        success: true
      })));
      
      return true;
    } catch (error) {
      console.error(`Service reconnection failed for ${serviceId}:`, error);
      
      // Update status in Firestore
      await db.collection('integrationServices').doc(serviceId).update({
        status: 'reconnection_failed',
        lastReconnectionAttempt: admin.firestore.FieldValue.serverTimestamp(),
        reconnectionAttempts: admin.firestore.FieldValue.increment(1),
        lastError: error.message
      });
      
      // Update metrics
      this.gateway.metrics.incrementCounter('service_reconnections_failure');
      this.gateway.metrics.setGauge(`connection_status_${serviceId}`, 0);
      
      // Publish reconnection failure event
      await pubsub.topic('service-reconnection-events').publish(Buffer.from(JSON.stringify({
        serviceId,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      })));
      
      throw error;
    }
  }
  
  /**
   * Send system alert
   * @private
   */
  async _sendSystemAlert(alert) {
    try {
      // Log alert
      console.warn(`SYSTEM ALERT: ${alert.severity} - ${alert.message}`);
      
      // Store in Firestore
      await db.collection('systemAlerts').add({
        ...alert,
        component: 'integration-gateway',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Publish to alert topic
      await pubsub.topic('system-alerts').publish(Buffer.from(JSON.stringify(alert)));
      
      // In production, this would integrate with monitoring systems
      // like Stackdriver, PagerDuty, etc.
      
      return true;
    } catch (error) {
      console.error('Failed to send system alert:', error);
      return false;
    }
  }
  
  /**
   * Stop health monitoring
   */
  async stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
  
  /**
   * Get current health status
   */
  getStatus() {
    return this.status;
  }
}

/**
 * Model Selector for choosing optimal LLM models
 */
class ModelSelector {
  constructor() {
    this.serviceModels = new Map();
    this.modelCatalog = new Map();
    this.userPreferences = new Map();
    this.metricTracker = {};
  }

  /**
   * Initialize the model selector
   */
  async initialize() {
    try {
      console.log('Initializing model selector...');
      
      // Load model catalog from Firestore
      const catalogSnapshot = await db.collection('modelCatalog').get();
      
      for (const doc of catalogSnapshot.docs) {
        const model = doc.data();
        this.modelCatalog.set(model.modelId, model);
      }
      
      // Load user preferences
      const preferencesSnapshot = await db.collection('userModelPreferences').get();
      
      for (const doc of preferencesSnapshot.docs) {
        this.userPreferences.set(doc.id, doc.data());
      }
      
      // Initialize metrics tracking
      this.metricTracker = {
        totalSelections: 0,
        modelSelections: {},
        userTypeSelections: {},
        taskTypeSelections: {}
      };
      
      console.log(`Model selector initialized with ${this.modelCatalog.size} models`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize model selector:', error);
      throw error;
    }
  }

  /**
   * Register models for a service
   * @param {string} serviceId - Service identifier
   * @param {Array} models - Array of model information
   */
  async registerServiceModels(serviceId, models) {
    try {
      console.log(`Registering ${models.length} models for service: ${serviceId}`);
      
      this.serviceModels.set(serviceId, models);
      
      // Update model catalog
      for (const model of models) {
        const modelId = `${serviceId}:${model.modelId}`;
        
        this.modelCatalog.set(modelId, {
          ...model,
          serviceId,
          fullModelId: modelId
        });
        
        // Store in Firestore
        await db.collection('modelCatalog').doc(modelId).set({
          ...model,
          serviceId,
          fullModelId: modelId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log(`Models registered successfully for service: ${serviceId}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to register models for service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Select optimal model based on requirements
   * @param {string} userType - User type (pilot, co-pilot)
   * @param {string} taskType - Task type
   * @param {Object} requirementProfile - Requirements profile
   * @returns {Promise<Object>} Selected model information
   */
  async selectModel(userType, taskType, requirementProfile) {
    try {
      console.log(`Selecting model for ${userType} performing ${taskType}`);
      
      // Get user preferences if available
      const userId = requirementProfile.userId;
      const userPreference = userId ? this.userPreferences.get(userId) : null;
      
      // Get preferred model if specified
      if (userPreference?.preferredModel && this.modelCatalog.has(userPreference.preferredModel)) {
        const model = this.modelCatalog.get(userPreference.preferredModel);
        
        // Track selection
        this._trackModelSelection(model.fullModelId, userType, taskType);
        
        return {
          ...model,
          selectionReason: `User preference: ${model.name}`,
          selectionMethod: 'user_preference'
        };
      }
      
      // Calculate model scores based on requirements
      const scoredModels = [];
      
      for (const [modelId, model] of this.modelCatalog.entries()) {
        // Skip models that don't meet minimum requirements
        if (requirementProfile.minTokens && model.maxTokens < requirementProfile.minTokens) {
          continue;
        }
        
        if (requirementProfile.contextWindow && model.contextWindow < requirementProfile.contextWindow) {
          continue;
        }
        
        // Calculate base score
        let score = 0;
        
        // Score based on user type
        if (userType === 'pilot' && model.recommendedFor.includes('pilot')) {
          score += 10;
        }
        
        if (userType === 'co-pilot' && model.recommendedFor.includes('co-pilot')) {
          score += 10;
        }
        
        // Score based on task type
        if (model.idealTasks && model.idealTasks.includes(taskType)) {
          score += 15;
        }
        
        // Score based on capabilities
        if (requirementProfile.capabilities) {
          for (const capability of requirementProfile.capabilities) {
            if (model.capabilities && model.capabilities.includes(capability)) {
              score += 5;
            }
          }
        }
        
        // Adjust score based on latency requirements
        if (requirementProfile.lowLatency && model.averageLatency < 500) {
          score += 10;
        }
        
        // Adjust score based on cost sensitivity
        if (requirementProfile.costSensitive && model.costTier === 'low') {
          score += 10;
        }
        
        // Adjust based on service availability
        if (model.serviceId && this.serviceModels.has(model.serviceId)) {
          score += 5;
        }
        
        // Add to scored models
        scoredModels.push({
          modelId,
          model,
          score
        });
      }
      
      // Sort by score (descending)
      scoredModels.sort((a, b) => b.score - a.score);
      
      // Return the highest scoring model
      if (scoredModels.length > 0) {
        const selection = {
          ...scoredModels[0].model,
          selectionReason: `Optimal match for ${userType} performing ${taskType}`,
          selectionMethod: 'scoring',
          score: scoredModels[0].score,
          alternatives: scoredModels.slice(1, 3).map(m => m.modelId)
        };
        
        // Track selection
        this._trackModelSelection(selection.fullModelId, userType, taskType);
        
        // Log selection for analysis
        await db.collection('modelSelections').add({
          userId: requirementProfile.userId || 'anonymous',
          userType,
          taskType,
          requirementProfile,
          selectedModel: selection.fullModelId,
          score: selection.score,
          alternatives: selection.alternatives,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Selected model ${selection.fullModelId} (score: ${selection.score}) for ${userType} performing ${taskType}`);
        
        return selection;
      }
      
      // No suitable model found
      throw new Error('No suitable model found for the given requirements');
    } catch (error) {
      console.error('Model selection failed:', error);
      throw error;
    }
  }
  
  /**
   * Track model selection metrics
   * @private
   */
  _trackModelSelection(modelId, userType, taskType) {
    // Increment total selections
    this.metricTracker.totalSelections++;
    
    // Track by model
    if (!this.metricTracker.modelSelections[modelId]) {
      this.metricTracker.modelSelections[modelId] = 0;
    }
    this.metricTracker.modelSelections[modelId]++;
    
    // Track by user type
    if (!this.metricTracker.userTypeSelections[userType]) {
      this.metricTracker.userTypeSelections[userType] = 0;
    }
    this.metricTracker.userTypeSelections[userType]++;
    
    // Track by task type
    if (!this.metricTracker.taskTypeSelections[taskType]) {
      this.metricTracker.taskTypeSelections[taskType] = 0;
    }
    this.metricTracker.taskTypeSelections[taskType]++;
  }

  /**
   * Update user model preferences
   * @param {string} userId - User identifier
   * @param {Object} preferences - User preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      console.log(`Updating model preferences for user: ${userId}`);
      
      // Validate preferred model if specified
      if (preferences.preferredModel && !this.modelCatalog.has(preferences.preferredModel)) {
        throw new Error(`Invalid model ID: ${preferences.preferredModel}`);
      }
      
      // Update preferences map
      this.userPreferences.set(userId, preferences);
      
      // Update in Firestore
      await db.collection('userModelPreferences').doc(userId).set({
        ...preferences,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Model preferences updated for user: ${userId}`);
      
      return true;
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }
  
  /**
   * Get model selection metrics
   */
  getMetrics() {
    return this.metricTracker;
  }
}

/**
 * Access Token Manager for handling token refresh and scheduling
 */
class AccessTokenManager {
  constructor() {
    this.refreshTimers = new Map();
    this.tokenRefreshQueue = new PQueue({ concurrency: 5 });
  }

  /**
   * Initialize the token manager
   * @param {Map} connections - Map of service connections
   */
  async initialize(connections) {
    try {
      console.log('Initializing access token manager...');
      
      // Schedule token refresh for each connection
      for (const [serviceId, connection] of connections.entries()) {
        // Skip if no refresh token or no expiration
        if (!connection.credentials?.expiresAt) {
          continue;
        }
        
        this.scheduleTokenRefresh(serviceId, connection.credentials.expiresAt);
      }
      
      console.log('Access token manager initialized');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize token manager:', error);
      throw error;
    }
  }

  /**
   * Schedule a token refresh
   * @param {string} serviceId - Service identifier
   * @param {number} expiresAt - Expiration timestamp
   */
  scheduleTokenRefresh(serviceId, expiresAt) {
    // Clear any existing timer
    if (this.refreshTimers.has(serviceId)) {
      clearTimeout(this.refreshTimers.get(serviceId));
    }
    
    // Calculate time until expiry (with 5-minute buffer)
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now - (5 * 60 * 1000);
    
    // If already expired or about to expire, refresh immediately
    if (timeUntilExpiry <= 0) {
      this.tokenRefreshQueue.add(() => 
        this.refreshToken(serviceId).catch(error => {
          console.error(`Immediate token refresh failed for ${serviceId}:`, error);
        })
      );
      return;
    }
    
    // Schedule refresh
    const timerId = setTimeout(() => {
      this.tokenRefreshQueue.add(() =>
        this.refreshToken(serviceId).catch(error => {
          console.error(`Scheduled token refresh failed for ${serviceId}:`, error);
        })
      );
    }, timeUntilExpiry);
    
    this.refreshTimers.set(serviceId, timerId);
    
    console.log(`Token refresh scheduled for ${serviceId} in ${Math.round(timeUntilExpiry / 60000)} minutes`);
  }

  /**
   * Refresh an access token
   * @param {string} serviceId - Service identifier
   * @returns {Promise<Object>} Refreshed credentials
   */
  async refreshToken(serviceId) {
    try {
      console.log(`Refreshing token for service: ${serviceId}`);
      
      // Get auth strategy from the gateway
      const gateway = global.integrationGateway;
      const authStrategy = gateway.authStrategies.get(serviceId);
      
      if (!authStrategy || !authStrategy.refreshToken) {
        throw new Error(`No refresh capability for service ${serviceId}`);
      }
      
      // Refresh the token
      const newCredentials = await authStrategy.refreshToken();
      
      // Update connection credentials
      const connection = gateway.connections.get(serviceId);
      connection.credentials = newCredentials;
      
      // Update in Redis
      await redis.hset(`integration:connection:${serviceId}`, 'credentials', authStrategy.getMaskedCredentials());
      
      // Schedule next refresh
      if (newCredentials.expiresAt) {
        this.scheduleTokenRefresh(serviceId, newCredentials.expiresAt);
      }
      
      console.log(`Token refreshed successfully for ${serviceId}`);
      
      // Track metrics
      gateway.metrics.incrementCounter(`token_refresh_success_${serviceId}`);
      
      // Publish token refresh event
      await pubsub.topic('token-refresh-events').publish(Buffer.from(JSON.stringify({
        serviceId,
        timestamp: new Date().toISOString(),
        success: true
      })));
      
      return newCredentials;
    } catch (error) {
      console.error(`Token refresh failed for ${serviceId}:`, error);
      
      // Track metrics
      if (global.integrationGateway) {
        global.integrationGateway.metrics.incrementCounter(`token_refresh_failure_${serviceId}`);
      }
      
      // Publish token refresh failure event
      await pubsub.topic('token-refresh-events').publish(Buffer.from(JSON.stringify({
        serviceId,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      })));
      
      throw error;
    }
  }
}

/**
 * Base class for active bindings
 */
class BaseBinding {
  constructor(serviceId, config, gateway) {
    this.serviceId = serviceId;
    this.config = config;
    this.gateway = gateway;
    this.status = 'stopped';
    this.lastActivity = null;
    this.metrics = {
      messagesReceived: 0,
      messagesProcessed: 0,
      errors: 0
    };
  }
  
  async initialize() {
    this.status = 'initializing';
    // To be implemented by subclasses
  }
  
  async start() {
    this.status = 'running';
    this.lastActivity = new Date();
    // To be implemented by subclasses
  }
  
  async stop() {
    this.status = 'stopped';
    // To be implemented by subclasses
  }
  
  async processMessage(message) {
    try {
      this.metrics.messagesReceived++;
      this.lastActivity = new Date();
      
      // To be implemented by subclasses
      
      this.metrics.messagesProcessed++;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }
  
  getStatus() {
    return {
      serviceId: this.serviceId,
      bindingType: this.constructor.name,
      status: this.status,
      lastActivity: this.lastActivity,
      metrics: this.metrics
    };
  }
}

/**
 * Webhook binding for receiving webhook events from services
 */
class WebhookBinding extends BaseBinding {
  constructor(serviceId, config, gateway) {
    super(serviceId, config, gateway);
    this.webhookPath = config.webhook?.path || `/webhooks/${serviceId}`;
    this.verificationToken = config.webhook?.verificationToken;
    this.handlers = new Map();
  }
  
  async initialize() {
    await super.initialize();
    
    // Register webhook handlers
    if (this.config.webhook?.events) {
      for (const event of this.config.webhook.events) {
        this.registerEventHandler(event.type, event.handler);
      }
    }
    
    this.status = 'initialized';
    console.log(`Webhook binding initialized for service: ${this.serviceId}`);
    
    return true;
  }
  
  async start() {
    await super.start();
    console.log(`Webhook binding started for service: ${this.serviceId}`);
    return true;
  }
  
  async stop() {
    await super.stop();
    console.log(`Webhook binding stopped for service: ${this.serviceId}`);
    return true;
  }
  
  registerEventHandler(eventType, handler) {
    this.handlers.set(eventType, handler);
  }
  
  async handleWebhook(req, res) {
    try {
      // Verify webhook if verification token is configured
      if (this.verificationToken) {
        const token = req.headers['x-webhook-token'];
        
        if (!token || token !== this.verificationToken) {
          res.status(401).json({ error: 'Invalid webhook token' });
          return;
        }
      }
      
      // Extract event type
      const eventType = req.headers['x-webhook-event'] || 'default';
      
      // Process webhook payload
      const result = await this.processMessage({
        eventType,
        payload: req.body,
        headers: req.headers
      });
      
      // Send response
      res.status(200).json({ status: 'success', result });
    } catch (error) {
      console.error(`Error processing webhook for ${this.serviceId}:`, error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
  
  async processMessage(message) {
    await super.processMessage(message);
    
    const { eventType, payload } = message;
    
    // Find handler for event type
    const handler = this.handlers.get(eventType) || this.handlers.get('default');
    
    if (!handler) {
      console.warn(`No handler found for event type: ${eventType}`);
      return { status: 'ignored', reason: 'No handler found' };
    }
    
    // Execute handler
    const result = await handler(payload, this.gateway);
    
    // Log and publish event
    await pubsub.topic('webhook-events').publish(Buffer.from(JSON.stringify({
      serviceId: this.serviceId,
      eventType,
      timestamp: new Date().toISOString(),
      result
    })));
    
    return result;
  }
}

/**
 * Polling binding for regularly querying service
 */
class PollingBinding extends BaseBinding {
  constructor(serviceId, config, gateway) {
    super(serviceId, config, gateway);
    this.pollInterval = config.polling?.interval || 60000; // Default: 1 minute
    this.pollOperation = config.polling?.operation;
    this.pollParams = config.polling?.params || {};
    this.intervalId = null;
  }
  
  async initialize() {
    await super.initialize();
    
    if (!this.pollOperation) {
      throw new Error(`Polling operation not specified for service: ${this.serviceId}`);
    }
    
    this.status = 'initialized';
    console.log(`Polling binding initialized for service: ${this.serviceId}`);
    
    return true;
  }
  
  async start() {
    await super.start();
    
    // Start polling
    this.intervalId = setInterval(() => {
      this.poll().catch(error => {
        console.error(`Polling error for ${this.serviceId}:`, error);
      });
    }, this.pollInterval);
    
    // Initial poll
    await this.poll();
    
    console.log(`Polling binding started for service: ${this.serviceId}`);
    
    return true;
  }
  
  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    await super.stop();
    console.log(`Polling binding stopped for service: ${this.serviceId}`);
    
    return true;
  }
  
  async poll() {
    try {
      console.log(`Polling service: ${this.serviceId}`);
      
      // Execute operation
      const result = await this.gateway.execute(
        this.serviceId,
        this.pollOperation,
        this.pollParams
      );
      
      // Process result
      await this.processMessage({
        operation: this.pollOperation,
        params: this.pollParams,
        result
      });
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Polling failed for ${this.serviceId}:`, error);
      throw error;
    }
  }
  
  async processMessage(message) {
    await super.processMessage(message);
    
    // Publish event
    await pubsub.topic('polling-events').publish(Buffer.from(JSON.stringify({
      serviceId: this.serviceId,
      operation: message.operation,
      timestamp: new Date().toISOString(),
      resultSummary: this._summarizeResult(message.result)
    })));
    
    return { status: 'processed' };
  }
  
  _summarizeResult(result) {
    // Create a summary of the result for logging
    if (Array.isArray(result)) {
      return { type: 'array', length: result.length };
    } else if (typeof result === 'object' && result !== null) {
      return { type: 'object', keys: Object.keys(result) };
    } else {
      return { type: typeof result };
    }
  }
}

/**
 * Streaming binding for real-time data
 */
class StreamingBinding extends BaseBinding {
  constructor(serviceId, config, gateway) {
    super(serviceId, config, gateway);
    this.streamingEndpoint = config.streaming?.endpoint;
    this.streamingParams = config.streaming?.params || {};
    this.stream = null;
  }
  
  async initialize() {
    await super.initialize();
    
    if (!this.streamingEndpoint) {
      throw new Error(`Streaming endpoint not specified for service: ${this.serviceId}`);
    }
    
    this.status = 'initialized';
    console.log(`Streaming binding initialized for service: ${this.serviceId}`);
    
    return true;
  }
  
  async start() {
    await super.start();
    
    // Start streaming
    await this._connectStream();
    
    console.log(`Streaming binding started for service: ${this.serviceId}`);
    
    return true;
  }
  
  async stop() {
    if (this.stream) {
      this.stream.close();
      this.stream = null;
    }
    
    await super.stop();
    console.log(`Streaming binding stopped for service: ${this.serviceId}`);
    
    return true;
  }
  
  async _connectStream() {
    try {
      // This is a placeholder for connecting to a streaming API
      // In a real implementation, this would connect to WebSockets, SSE, or other streaming protocol
      console.log(`Connecting to streaming endpoint for service: ${this.serviceId}`);
      
      // Simulate connection with reconnection logic
      this._setupReconnection();
      
      return true;
    } catch (error) {
      console.error(`Stream connection failed for ${this.serviceId}:`, error);
      
      // Retry connection after delay
      setTimeout(() => {
        this._connectStream().catch(e => {
          console.error(`Stream reconnection failed for ${this.serviceId}:`, e);
        });
      }, 10000); // 10 second delay
      
      throw error;
    }
  }
  
  _setupReconnection() {
    // Placeholder for reconnection logic
    // In a real implementation, this would handle reconnection on connection drops
  }
  
  async processMessage(message) {
    await super.processMessage(message);
    
    // Publish event
    await pubsub.topic('streaming-events').publish(Buffer.from(JSON.stringify({
      serviceId: this.serviceId,
      timestamp: new Date().toISOString(),
      message
    })));
    
    return { status: 'processed' };
  }
}

/**
 * PubSub binding for integration with Google Cloud Pub/Sub
 */
class PubSubBinding extends BaseBinding {
  constructor(serviceId, config, gateway) {
    super(serviceId, config, gateway);
    this.topicName = config.pubsub?.topic;
    this.subscriptionName = config.pubsub?.subscription;
    this.subscription = null;
  }
  
  async initialize() {
    await super.initialize();
    
    if (!this.topicName || !this.subscriptionName) {
      throw new Error(`PubSub topic or subscription not specified for service: ${this.serviceId}`);
    }
    
    this.status = 'initialized';
    console.log(`PubSub binding initialized for service: ${this.serviceId}`);
    
    return true;
  }
  
  async start() {
    await super.start();
    
    // Create subscription client
    const subscription = pubsub.subscription(this.subscriptionName);
    
    // Setup message handler
    subscription.on('message', message => {
      this.processMessage(message)
        .then(() => message.ack())
        .catch(error => {
          console.error(`Error processing PubSub message for ${this.serviceId}:`, error);
          message.nack();
        });
    });
    
    // Setup error handler
    subscription.on('error', error => {
      console.error(`PubSub subscription error for ${this.serviceId}:`, error/**
 * AIXTIV Integration Gateway
 * 
 * Comprehensive service for maintaining active connections with all AIXTIV components
 * and external services. Provides unified authentication, connection management,
 * health monitoring, and automatic recovery.
 */

// Core imports for Node.js implementation
const express = require('express');
const passport = require('passport');
const { OAuth2Strategy } = require('passport-oauth2');
const { SAMLStrategy } = require('passport-saml');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');
const { MonitoringServiceClient } = require('@google-cloud/monitoring');

// Import Rust binding
const { IntegrationGatewayRust } = require('./rust_bindings');

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'api-for-warp-drive'
  });
}

// Initialize services
const db = admin.firestore();
const pubsub = new PubSub();
const redis = new Redis(process.env.REDIS_URL);
const monitoring = new MonitoringServiceClient();

/**
 * Main Integration Gateway Class
 * Manages all service integrations, authentication flows, and connection monitoring
 */
class IntegrationGateway {
  constructor() {
    this.adapters = new Map();
    this.connections = new Map();
    this.authStrategies = new Map();
    this.webhookHandlers = new Map();
    this.healthMonitor = new HealthMonitor(this);
    this.accessTokenManager = new AccessTokenManager();
    this.modelSelector = new ModelSelector();
    this.activeBindings = new Map();
    this.rustGateway = new IntegrationGatewayRust();
    this.metrics = new MetricsCollector('aixtiv-integration-gateway');
    this.recoveryManager = new RecoveryManager(this);
  }

  /**
   * Initialize the Integration Gateway
   */
  async initialize() {
    console.log('Initializing AIXTIV Integration Gateway...');
    
    try {
      // Initialize Rust core
      await this.rustGateway.initialize({
        projectId: 'api-for-warp-drive',
        region: 'us-west1'
      });
      
      // Load registered service configurations from Firestore
      const servicesSnapshot = await db.collection('integrationServices').get();
      let registeredServices = 0;
      
      for (const doc of servicesSnapshot.docs) {
        const serviceConfig = doc.data();
        if (serviceConfig.status === 'active' || serviceConfig.status === 'pending') {
          await this.registerService(serviceConfig);
          registeredServices++;
        }
      }
      
      // Initialize health monitoring
      await this.healthMonitor.initialize();
      
      // Register webhook handlers
      this.registerWebhookHandlers();
      
      // Initialize access token refresh system
      await this.accessTokenManager.initialize(this.connections);
      
      // Initialize model selector
      await this.modelSelector.initialize();
      
      // Initialize recovery manager
      await this.recoveryManager.initialize();
      
      // Start metrics collection
      this.metrics.startCollection();
      
      console.log(`Integration Gateway initialized with ${this.connections.size} services`);
      
      // Publish initialization event
      await pubsub.topic('integration-gateway-events').publish(Buffer.from(JSON.stringify({
        event: 'initialized',
        timestamp: new Date().toISOString(),
        serviceCount: this.connections.size,
        servicesRegistered: registeredServices
      })));
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Integration Gateway:', error);
      
      // Publish initialization failure event
      await pubsub.topic('integration-gateway-events').publish(Buffer.from(JSON.stringify({
        event: 'initialization_failed',
        timestamp: new Date().toISOString(),
        error: error.message
      })));
      
      throw error;
    }
  }

  /**
   * Register a new service with the gateway
   * @param {Object} serviceConfig - Service configuration
   */
  async registerService(serviceConfig) {
    try {
      const { serviceId, serviceName, authType, apiVersion, endpoints, models, bindingType } = serviceConfig;
      
      console.log(`Registering service: ${serviceName} (${serviceId})`);
      
      // Create appropriate adapter
      const adapter = this.createServiceAdapter(serviceConfig);
      this.adapters.set(serviceId, adapter);
      
      // Set up authentication strategy
      const authStrategy = this.createAuthStrategy(serviceConfig);
      this.authStrategies.set(serviceId, authStrategy);
      
      // Initialize connection
      const connection = await this.initializeConnection(serviceId, serviceConfig);
      this.connections.set(serviceId, connection);
      
      // Register with Rust core for high-performance operations
      await this.rustGateway.registerService(serviceId, {
        ...serviceConfig,
        credentials: authStrategy.getMaskedCredentials()
      });
      
      // Store models information for this service if available
      if (models && models.length > 0) {
        await this.modelSelector.registerServiceModels(serviceId, models);
      }
      
      // Create active binding based on type
      if (bindingType) {
        await this.createActiveBinding(serviceId, bindingType, serviceConfig);
      }
      
      // Log successful registration
      console.log(`Service registered successfully: ${serviceName} (${serviceId})`);
      
      // Store or update in Firestore
      const serviceDoc = db.collection('integrationServices').doc(serviceId);
      const docSnapshot = await serviceDoc.get();
      
      if (!docSnapshot.exists) {
        await serviceDoc.set({
          ...serviceConfig,
          status: 'active',
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          lastConnected: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await serviceDoc.update({
          status: 'active',
          lastConnected: admin.firestore.FieldValue.serverTimestamp(),
          endpoints: endpoints || docSnapshot.data().endpoints,
          apiVersion: apiVersion || docSnapshot.data().apiVersion
        });
      }
      
      // Track metric
      this.metrics.incrementCounter('service_registrations');
      
      return { success: true, serviceId };
    } catch (error) {
      console.error(`Failed to register service ${serviceConfig.serviceName}:`, error);
      
      // Update status in Firestore if service document exists
      try {
        const serviceDoc = db.collection('integrationServices').doc(serviceConfig.serviceId);
        const docSnapshot = await serviceDoc.get();
        
        if (docSnapshot.exists) {
          await serviceDoc.update({
            status: 'registration_failed',
            lastError: error.message,
            lastErrorTimestamp: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (dbError) {
        console.error('Error updating service status in Firestore:', dbError);
      }
      
      // Track metric
      this.metrics.incrementCounter('service_registration_failures');
      
      throw error;
    }
  }

  /**
   * Create a service adapter based on service type
   * @param {Object} config - Service configuration
   * @returns {Object} Service adapter
   */
  createServiceAdapter(config) {
    const { serviceType } = config;
    
    // Standard service types
    const standardAdapters = {
      'openai': OpenAIAdapter,
      'anthropic': AnthropicAdapter,
      'huggingface': HuggingFaceAdapter,
      'vertexai': VertexAIAdapter,
      'azure_openai': AzureOpenAIAdapter,
      'linkedin': LinkedInAdapter,
      'googleworkspace': GoogleWorkspaceAdapter,
      'microsoft365': Microsoft365Adapter,
      'salesforce': SalesforceAdapter,
      'hubspot': HubSpotAdapter,
      'zendesk': ZendeskAdapter,
      'github': GitHubAdapter,
      'jira': JiraAdapter,
      'asana': AsanaAdapter,
      'slack': SlackAdapter,
      'custom': CustomServiceAdapter
    };
    
    // Integration-specific adapters
    const integrationAdapters = {
      'sapAriba': SAPAribaAdapter,
      'oracleProcurement': OracleProcurementAdapter,
      'eProcure': EProcureAdapter,
      'fedBizOpps': FedBizOppsAdapter,
      'usaspending': USASpendingAdapter,
      'grants': GrantsGovAdapter,
      'synthesia': SynthesiaAdapter,
      'university': UniversityProcurementAdapter,
      'state': StateProcurementAdapter,
      'county': CountyProcurementAdapter,
      'local': LocalProcurementAdapter
    };
    
    // Combined adapter types
    const adapterTypes = { ...standardAdapters, ...integrationAdapters };
    
    // Check if adapter exists
    const AdapterClass = adapterTypes[serviceType];
    if (!AdapterClass) {
      throw new Error(`Unsupported service type: ${serviceType}`);
    }
    
    return new AdapterClass(config);
  }

  /**
   * Create an authentication strategy based on auth type
   * @param {Object} config - Service configuration
   * @returns {Object} Authentication strategy
   */
  createAuthStrategy(config) {
    const { authType, serviceId } = config;
    
    const authStrategies = {
      'oauth2': OAuth2AuthStrategy,
      'oauth1': OAuth1AuthStrategy,
      'saml': SAMLAuthStrategy,
      'workload_identity': WorkloadIdentityAuthStrategy,
      'api_key': APIKeyAuthStrategy,
      'jwt': JWTAuthStrategy,
      'basic': BasicAuthStrategy,
      'none': NoAuthStrategy
    };
    
    const StrategyClass = authStrategies[authType];
    if (!StrategyClass) {
      throw new Error(`Unsupported authentication type: ${authType}`);
    }
    
    return new StrategyClass(config);
  }

  /**
   * Initialize a connection to the service
   * @param {string} serviceId - Service identifier 
   * @param {Object} config - Service configuration
   * @returns {Object} Connection object
   */
  async initializeConnection(serviceId, config) {
    try {
      console.log(`Initializing connection to service: ${serviceId}`);
      
      const adapter = this.adapters.get(serviceId);
      const authStrategy = this.authStrategies.get(serviceId);
      
      // Initialize auth credentials
      const credentials = await authStrategy.initialize();
      
      // Connect to service
      const connection = await adapter.connect(credentials);
      
      // Create connection record
      const connectionRecord = {
        serviceId,
        status: 'connected',
        adapter: adapter.constructor.name,
        authStrategy: authStrategy.constructor.name,
        credentials: authStrategy.getMaskedCredentials(),
        connectedAt: new Date(),
        lastHealthCheck: new Date(),
        healthStatus: 'healthy',
        statistics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0
        },
        rateLimits: connection.rateLimits || {}
      };
      
      // Store connection metadata in Redis for quick access
      await redis.hset(`integration:connection:${serviceId}`, connectionRecord);
      
      // Store connection metrics
      this.metrics.setGauge(`connection_status_${serviceId}`, 1);
      
      console.log(`Connection initialized successfully: ${serviceId}`);
      
      return connectionRecord;
    } catch (error) {
      console.error(`Failed to initialize connection to ${serviceId}:`, error);
      
      // Store connection metrics
      this.metrics.setGauge(`connection_status_${serviceId}`, 0);
      
      // Create failed connection record for monitoring
      const failedConnection = {
        serviceId,
        status: 'connection_failed',
        error: error.message,
        failedAt: new Date()
      };
      
      // Store in Redis for monitoring
      await redis.hset(`integration:connection:${serviceId}`, failedConnection);
      
      throw error;
    }
  }

  /**
   * Create an active binding for a service
   * @param {string} serviceId - Service identifier
   * @param {string} bindingType - Type of binding
   * @param {Object} config - Service configuration
   */
  async createActiveBinding(serviceId, bindingType, config) {
    try {
      console.log(`Creating ${bindingType} binding for service: ${serviceId}`);
      
      let binding;
      
      switch (bindingType) {
        case 'webhook':
          binding = new WebhookBinding(serviceId, config, this);
          break;
        case 'polling':
          binding = new PollingBinding(serviceId, config, this);
          break;
        case 'streaming':
          binding = new StreamingBinding(serviceId, config, this);
          break;
        case 'pubsub':
          binding = new PubSubBinding(serviceId, config, this);
          break;
        case 'rest':
          binding = new RestBinding(serviceId, config, this);
          break;
        default:
          throw new Error(`Unsupported binding type: ${bindingType}`);
      }
      
      // Initialize the binding
      await binding.initialize();
      
      // Store the binding
      this.activeBindings.set(serviceId, binding);
      
      console.log(`Active binding created for service: ${serviceId}`);
      
      return binding;
    } catch (error) {
      console.error(`Failed to create binding for ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Register webhook handlers for all services
   */
  registerWebhookHandlers() {
    // Loop through all registered services and set up webhook handlers
    for (const [serviceId, connection] of this.connections.entries()) {
      const adapter = this.adapters.get(serviceId);
      
      if (adapter.supportsWebhooks) {
        this.webhookHandlers.set(serviceId, (req, res) => {
          return adapter.handleWebhook(req, res);
        });
      }
    }
  }

  /**
   * Execute a request to a service
   * @param {string} serviceId - Service identifier
   * @param {string} operation - Operation name
   * @param {Object} params - Operation parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Operation result
   */
  async execute(serviceId, operation, params, options = {}) {
    if (!this.adapters.has(serviceId)) {
      throw new Error(`Service not registered: ${serviceId}`);
    }
    
    const startTime = Date.now();
    const adapter = this.adapters.get(serviceId);
    const connection = this.connections.get(serviceId);
    
    // Update statistics
    connection.statistics.totalRequests++;
    
    try {
      // Apply any pre-processing
      const processedParams = await this._preprocessRequest(serviceId, operation, params, options);
      
      // Check if we should use Rust implementation for better performance
      if (adapter.hasRustImplementation && adapter.hasRustImplementation(operation)) {
        const result = await this.rustGateway.executeService(serviceId, operation, processedParams);
        
        // Update statistics
        connection.statistics.successfulRequests++;
        const duration = Date.now() - startTime;
        connection.statistics.avgResponseTime = 
          (connection.statistics.avgResponseTime * (connection.statistics.successfulRequests - 1) + duration) / 
          connection.statistics.successfulRequests;
        
        // Track metrics
        this.metrics.observeHistogram(`request_duration_${serviceId}`, duration);
        this.metrics.incrementCounter(`requests_success_${serviceId}`);
        
        return result;
      }
      
      // Execute the operation using JavaScript implementation
      const result = await adapter[operation](processedParams, connection);
      
      // Update statistics
      connection.statistics.successfulRequests++;
      const duration = Date.now() - startTime;
      connection.statistics.avgResponseTime = 
        (connection.statistics.avgResponseTime * (connection.statistics.successfulRequests - 1) + duration) / 
        connection.statistics.successfulRequests;
      
      // Track metrics
      this.metrics.observeHistogram(`request_duration_${serviceId}`, duration);
      this.metrics.incrementCounter(`requests_success_${serviceId}`);
      
      // Apply any post-processing
      const processedResult = await this._postprocessResponse(serviceId, operation, result, options);
      
      return processedResult;
    } catch (error) {
      // Update statistics
      connection.statistics.failedRequests++;
      
      // Track metrics
      this.metrics.incrementCounter(`requests_failure_${serviceId}`);
      
      // Check if token refresh is needed
      if (error.response?.status === 401 && connection.credentials.refreshToken) {
        try {
          console.log(`Attempting token refresh for service: ${serviceId}`);
          
          // Refresh token and retry
          const newCredentials = await this.accessTokenManager.refreshToken(serviceId);
          connection.credentials = newCredentials;
          
          // Update Redis cache
          await redis.hset(`integration:connection:${serviceId}`, 'credentials', authStrategy.getMaskedCredentials());
          
          console.log(`Token refresh successful for service: ${serviceId}, retrying operation`);
          
          // Retry the operation
          const result = await adapter[operation](params, { ...connection, credentials: newCredentials });
          
          // Update statistics
          connection.statistics.successfulRequests++;
          const duration = Date.now() - startTime;
          connection.statistics.avgResponseTime = 
            (connection.statistics.avgResponseTime * (connection.statistics.successfulRequests - 1) + duration) / 
            connection.statistics.successfulRequests;
          
          // Track metrics
          this.metrics.observeHistogram(`request_duration_${serviceId}`, duration);
          this.metrics.incrementCounter(`requests_success_${serviceId}`);
          this.metrics.incrementCounter(`token_refresh_success_${serviceId}`);
          
          return result;
        } catch (refreshError) {
          console.error(`Token refresh failed for ${serviceId}:`, refreshError);
          this.metrics.incrementCounter(`token_refresh_failure_${serviceId}`);
          throw error;
        }
      }
      
      throw error;
    }
  }

  /**
   * Pre-process a request before sending to service
   * @private
   */
  async _preprocessRequest(serviceId, operation, params, options) {
    // Apply service-specific transformations
    const adapter = this.adapters.get(serviceId);
    if (adapter.preprocess) {
      params = await adapter.preprocess(operation, params, options);
    }
    
    // Apply global transformations
    if (options.transform) {
      params = await options.transform(params);
    }
    
    return params;
  }

  /**
   * Post-process a response from a service
   * @private
   */
  async _postprocessResponse(serviceId, operation, result, options) {
    // Apply service-specific transformations
    const adapter = this.adapters.get(serviceId);
    if (adapter.postprocess) {
      result = await adapter.postprocess(operation, result, options);
    }
    
    // Apply global transformations
    if (options.transformResponse) {
      result = await options.transformResponse(result);
    }
    
    return result;
  }

  /**
   * Select the optimal model for a user request
   * @param {string} userType - User type (pilot, co-pilot, etc.)
   * @param {string} taskType - Task type
   * @param {Object} requirementProfile - Requirements profile
   * @returns {Promise<Object>} Selected model information
   */
  async selectModel(userType, taskType, requirementProfile) {
    return await this.modelSelector.selectModel(userType, taskType, requirementProfile);
  }

  /**
   * Health check for all connections
   * @returns {Promise<Object>} Health status for all connections
   */
  async healthCheck() {
    try {
      const results = {};
      
      for (const [serviceId, connection] of this.connections.entries()) {
        try {
          const adapter = this.adapters.get(serviceId);
          const health = await adapter.healthCheck(connection);
          
          results[serviceId] = {
            status: health.status,
            latency: health.latency,
            lastChecked: new Date()
          };
          
          // Update connection health status
          connection.healthStatus = health.status;
          connection.lastHealthCheck = new Date();
          
          // Update Redis cache
          await redis.hset(`integration:connection:${serviceId}`, {
            healthStatus: health.status,
            lastHealthCheck: new Date().toISOString()
          });
          
          // Update metrics
          this.metrics.setGauge(`health_status_${serviceId}`, health.status === 'healthy' ? 1 : 0);
          
        } catch (error) {
          results[serviceId] = {
            status: 'unhealthy',
            error: error.message,
            lastChecked: new Date()
          };
          
          // Update connection health status
          connection.healthStatus = 'unhealthy';
          connection.lastHealthCheck = new Date();
          
          // Update Redis cache
          await redis.hset(`integration:connection:${serviceId}`, {
            healthStatus: 'unhealthy',
            lastHealthCheck: new Date().toISOString(),
            lastError: error.message
          });
          
          // Update metrics
          this.metrics.setGauge(`health_status_${serviceId}`, 0);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown the Integration Gateway
   */
  async shutdown() {
    console.log('Shutting down Integration Gateway...');
    
    // Stop all active bindings
    for (const [serviceId, binding] of this.activeBindings.entries()) {
      try {
        await binding.stop();
        console.log(`Stopped binding for service: ${serviceId}`);
      } catch (error) {
        console.error(`Error stopping binding for service ${serviceId}:`, error);
      }
    }
    
    // Stop health monitor
    await this.healthMonitor.stop();
    
    // Stop metrics collection
    this.metrics.stopCollection();
    
    // Stop Rust core
    await this.rustGateway.shutdown();
    
    console.log('Integration Gateway shutdown complete');
  }
}

/**
 * OAuth2 Authentication Strategy
 * 
 * Handles OAuth 2.0 authentication flows and token management.
 */
class OAuth2AuthStrategy {
  constructor(config) {
    this.config = config;
    this.tokens = null;
    this.serviceId = config.serviceId;
  }

  /**
   * Initialize the authentication strategy
   * @returns {Promise<Object>} Initialized credentials
   */
  async initialize() {
    try {
      console.log(`Initializing OAuth2 authentication for service: ${this.serviceId}`);
      
      // Check if we have stored tokens for this service
      const storedTokens = await this._getStoredTokens();
      
      if (storedTokens && storedTokens.accessToken && new Date(storedTokens.expiresAt) > new Date()) {
        // Use stored tokens
        this.tokens = storedTokens;
        console.log(`Using stored tokens for service: ${this.serviceId}`);
      } else if (storedTokens && storedTokens.refreshToken) {
        // Refresh the token
        console.log(`Refreshing token for service: ${this.serviceId}`);
        this.tokens = storedTokens;
        await this.refreshToken();
      } else {
        // Need to perform the full OAuth flow
        console.log(`No valid tokens found for service: ${this.serviceId}`);
        
        // For server-to-server, use client credentials flow
        if (this.config.clientCredentials) {
          await this._performClientCredentialsFlow();
        } else {
          throw new Error('No valid tokens found and client credentials flow not configured');
        }
      }
      
      return this.getMaskedCredentials();
    } catch (error) {
      console.error(`OAuth2 initialization failed for ${this.config.serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get stored tokens from secure storage
   * @private
   */
  async _getStoredTokens() {
    try {
      // Get tokens from Firestore
      const tokenDoc = await db.collection('serviceTokens').doc(this.config.serviceId).get();
      
      if (tokenDoc.exists) {
        return tokenDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return null;
    }
  }

  /**
   * Perform the OAuth 2.0 client credentials flow
   * @private
   */
  async _performClientCredentialsFlow() {
    try {
      const { tokenUrl, clientId, clientSecret, scope } = this.config;
      
      console.log(`Performing client credentials flow for service: ${this.serviceId}`);
      
      // Prepare request
      const data = new URLSearchParams();
      data.append('grant_type', 'client_credentials');
      data.append('client_id', clientId);
      data.append('client_secret', clientSecret);
      
      if (scope) {
        data.append('scope', scope);
      }
      
      // Make request
      const response = await axios.post(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Process response
      this.tokens = {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
        scope: response.data.scope,
        refreshToken: response.data.refresh_token
      };
      
      // Store tokens
      await this._storeTokens(this.tokens);
      
      console.log(`Client credentials flow successful for service: ${this.serviceId}`);
      
      return this.tokens;
    } catch (error) {
      console.error('Client credentials flow failed:', error);
      throw error;
    }
  }

  /**
   * Store tokens in secure storage
   * @private
   */
  async _storeTokens(tokens) {
    try {
      // Store in Firestore
      await db.collection('serviceTokens').doc(this.config.serviceId).set({
        ...tokens,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh the access token
   * @returns {Promise<Object>} Refreshed credentials
   */
  async refreshToken() {
    try {
      const { tokenUrl, clientId, clientSecret } = this.config;
      const { refreshToken } = this.tokens;
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      console.log(`Refreshing token for service: ${this.serviceId}`);
      
      // Prepare request
      const data = new URLSearchParams();
      data.append('grant_type', 'refresh_token');
      data.append('refresh_token', refreshToken);
      data.append('client_id', clientId);
      data.append('client_secret', clientSecret);
      
      // Make request
      const response = await axios.post(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Process response
      this.tokens = {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        expiresIn: response.data.expires_in,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
        scope: response.data.scope,
        refreshToken: response.data.refresh_token || refreshToken
      };
      
      // Store tokens
      await this._storeTokens(this.tokens);
      
      console.log(`Token refresh successful for service: ${this.serviceId}`);
      
      return this.tokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get masked credentials for logging
   * @returns {Object} Masked credentials
   */
  getMaskedCredentials() {
    if (!this.tokens) {
      return { status: 'not_initialized' };
    }
    
    return {
      tokenType: this.tokens.tokenType,
      expiresAt: this.tokens.expiresAt,
      scope: this.tokens.scope,
      hasRefreshToken: !!this.tokens.refreshToken,
      accessToken: this.tokens.accessToken ? `${this.tokens.accessToken.substring(0, 5)}...` : null
    };
  }
}

/**
 * Health Monitor for service connections
 */
class HealthMonitor {
  constructor(gateway) {
    this.gateway = gateway;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.timerId = null;
    this.status = {
      overall: 'unknown',
      services: {},
      lastCheck: null
    };
  }

  /**
   * Initialize the health monitor
   */
  async initialize() {
    console.log('Initializing health monitor...');
    
    // Perform initial health check
    await this.performHealthCheck();
    
    // Schedule regular health checks
    this.timerId = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('Scheduled health check failed:', error);
      });
    }, this.checkInterval);
    
    console.log('Health monitor initialized');
    return true;
  }

  /**
   * Perform health check for all connections
   */
  async performHealthCheck() {
    try {
      console.log('Performing health check for all services...');
      
      const results = await this.gateway.healthCheck();
      const now = new Date();
      
      // Update status
      this.status.lastCheck = now;
      
      // Count unhealthy services
      const unhealthyServices = Object.entries(results)
        .filter(([_, health]) => health.status === 'unhealthy')
        .map(([serviceId]) => serviceId);
      
      if (unhealthyServices.length > 0) {
        console.warn(`Unhealthy services detected: ${unhealthyServices.join