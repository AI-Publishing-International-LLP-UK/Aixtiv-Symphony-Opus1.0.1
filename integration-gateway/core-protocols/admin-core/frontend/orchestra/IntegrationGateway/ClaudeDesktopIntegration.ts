import { IntegrationType, BaseIntegration, IntegrationConfig, IntegrationResponse, IntegrationInitOptions, ApiCallOptions, ClaudeDesktopIntegration } from './IntegrationGateway';

export class ClaudeDesktopIntegrationImpl extends BaseIntegration implements ClaudeDesktopIntegration {
    private vectorStore: any; // Pinecone vector store instance
    private firestore: any; // Firestore instance
    private llmService: any; // LLM service for Claude

    constructor(id: string, config: IntegrationConfig) {
        super(id, 'Claude Desktop', IntegrationType.CLAUDE_DESKTOP, config);
    }

    public async initialize(options?: IntegrationInitOptions): Promise<boolean> {
        if (!this.validateConfig()) {
            throw new Error('Invalid configuration for Claude Desktop integration');
        }

        try {
            // Initialize Firestore connection
            this.firestore = admin.firestore();
            
            // Initialize Pinecone for vector storage
            const pineconeConfig = {
                apiKey: process.env.PINECONE_API_KEY,
                environment: 'us-west1-gcp'
            };
            this.vectorStore = await this.initializePinecone(pineconeConfig);
            
            // Initialize Claude service
            this.llmService = await this.initializeClaude({
                apiKey: process.env.ANTHROPIC_API_KEY,
                model: 'claude-3-5-sonnet'
            });

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Claude Desktop integration:', error);
            return false;
        }
    }

    public async authenticate(): Promise<boolean> {
        try {
            // Verify service account authentication
            const serviceAccount = await this.getServiceAccountDetails();
            if (!serviceAccount.email.endsWith('@api-for-warp-drive.iam.gserviceaccount.com')) {
                throw new Error('Invalid service account for api-for-warp-drive');
            }

            // Verify Pinecone connection
            await this.vectorStore.describeIndex('claude-desktop');

            // Verify Claude API access
            await this.llmService.verifyAccess();

            this.authenticated = true;
            return true;
        } catch (error) {
            console.error('Failed to authenticate Claude Desktop integration:', error);
            return false;
        }
    }

    public async syncSettings(settings: any): Promise<IntegrationResponse<void>> {
        if (!this.isInitialized()) {
            throw new Error('Claude Desktop integration not initialized');
        }

        try {
            // Store settings in Firestore
            const docRef = this.firestore.collection('claude-desktop-settings').doc(settings.userId);
            await docRef.set({
                settings: settings,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                vectorId: await this.storeSettingsVector(settings)
            });

            return {
                status: 200,
                data: undefined,
                metadata: {
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            throw new Error(`Failed to sync settings: ${error}`);
        }
    }

    public async getSettings(): Promise<IntegrationResponse<any>> {
        if (!this.isInitialized()) {
            throw new Error('Claude Desktop integration not initialized');
        }

        try {
            // Get settings from Firestore
            const snapshot = await this.firestore.collection('claude-desktop-settings')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) {
                return {
                    status: 404,
                    data: null,
                    metadata: {
                        timestamp: Date.now()
                    }
                };
            }

            const doc = snapshot.docs[0];
            return {
                status: 200,
                data: doc.data().settings,
                metadata: {
                    timestamp: doc.data().timestamp.toMillis(),
                    vectorId: doc.data().vectorId
                }
            };
        } catch (error) {
            throw new Error(`Failed to get settings: ${error}`);
        }
    }

    public async applySettings(settings: any): Promise<IntegrationResponse<void>> {
        if (!this.isInitialized()) {
            throw new Error('Claude Desktop integration not initialized');
        }

        try {
            // Verify settings with Claude
            const validation = await this.llmService.validateSettings(settings);
            if (!validation.isValid) {
                throw new Error(`Invalid settings: ${validation.reason}`);
            }

            // Store in Firestore
            await this.syncSettings(settings);

            // Update vector store
            await this.updateSettingsVector(settings);

            return {
                status: 200,
                data: undefined,
                metadata: {
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            throw new Error(`Failed to apply settings: ${error}`);
        }
    }

    public async callApi<T>(options: ApiCallOptions): Promise<IntegrationResponse<T>> {
        if (!this.isInitialized()) {
            throw new Error('Claude Desktop integration not initialized');
        }

        try {
            // Handle different API endpoints
            switch (options.endpoint) {
                case '/settings/sync':
                    return await this.syncSettings(options.data);
                case '/settings':
                    return await this.getSettings();
                case '/settings/apply':
                    return await this.applySettings(options.data);
                default:
                    throw new Error(`Unknown endpoint: ${options.endpoint}`);
            }
        } catch (error) {
            throw new Error(`Failed to call Claude Desktop API: ${error}`);
        }
    }

    private async initializePinecone(config: any): Promise<any> {
        try {
            const pinecone = await import('@pinecone-database/pinecone');
            const client = new pinecone.PineconeClient();
            await client.init({
                environment: config.environment,
                apiKey: config.apiKey
            });

            // Ensure index exists
            const indexName = 'claude-desktop';
            const indexList = await client.listIndexes();
            if (!indexList.includes(indexName)) {
                await client.createIndex({
                    name: indexName,
                    dimension: 1536,
                    metric: 'cosine'
                });
            }

            return client.Index(indexName);
        } catch (error) {
            throw new Error(`Failed to initialize Pinecone: ${error}`);
        }
    }

    private async initializeClaude(config: any): Promise<any> {
        try {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new Anthropic({
                apiKey: config.apiKey
            });

            // Verify client is working
            await client.messages.create({
                model: config.model,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }]
            });

            return client;
        } catch (error) {
            throw new Error(`Failed to initialize Claude: ${error}`);
        }
    }

    private async getServiceAccountDetails(): Promise<any> {
        // Get service account from environment or metadata server
        const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS 
            ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
            : await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/?recursive=true', {
                headers: {'Metadata-Flavor': 'Google'}
            }).then(res => res.json());

        return serviceAccount;
    }

    private async storeSettingsVector(settings: any): Promise<string> {
        // Generate embedding using Claude
        const settingsString = JSON.stringify(settings);
        const embedding = await this.llmService.getEmbedding(settingsString);

        // Store in Pinecone
        const vectorId = `settings-${Date.now()}`;
        await this.vectorStore.upsert({
            vectors: [{
                id: vectorId,
                values: embedding,
                metadata: {
                    type: 'claude-desktop-settings',
                    userId: settings.userId,
                    timestamp: Date.now()
                }
            }]
        });

        return vectorId;
    }

    private async updateSettingsVector(settings: any): Promise<void> {
        // Get existing vector ID
        const snapshot = await this.firestore.collection('claude-desktop-settings')
            .where('userId', '==', settings.userId)
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const oldVectorId = snapshot.docs[0].data().vectorId;
            // Delete old vector
            await this.vectorStore.delete({ ids: [oldVectorId] });
        }

        // Store new vector
        await this.storeSettingsVector(settings);
    }
}

