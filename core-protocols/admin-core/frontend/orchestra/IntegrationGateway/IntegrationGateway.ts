import { IntegrationConfig, OAuth2Config, APIEndpoint, HttpMethod } from '../../types/integration';

/**
* Enum defining supported integration types
*/
export enum IntegrationType {
SSO = 'sso',
SAML = 'saml',
OAUTH = 'oauth',
LLM = 'llm',
API = 'api',
WEBHOOK = 'webhook',
EMAIL = 'email',
SMS = 'sms',
PAYMENT = 'payment',
ANALYTICS = 'analytics',
CRM = 'crm',
ERP = 'erp',
CMS = 'cms',
}

/**
* Interface for integration initialization options
*/
export interface IntegrationInitOptions {
configOverrides?: Partial<IntegrationConfig>;
environment?: 'development' | 'staging' | 'production';
debug?: boolean;
timeout?: number;
retryConfig?: {
    maxRetries: number;
    initialDelay: number;
    backoffFactor: number;
};
}

/**
* Interface for API call options
*/
export interface ApiCallOptions {
endpoint: string | APIEndpoint;
method?: HttpMethod;
data?: any;
params?: Record<string, string | number | boolean>;
headers?: Record<string, string>;
timeout?: number;
withAuth?: boolean;
}

/**
* Response structure for integration calls
*/
export interface IntegrationResponse<T = any> {
data: T;
status: number;
headers?: Record<string, string>;
metadata?: {
    requestId?: string;
    timestamp?: number;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
};
}

/**
* Base Integration interface that all integration providers must implement
*/
export interface Integration {
readonly id: string;
readonly name: string;
readonly type: IntegrationType;
readonly config: IntegrationConfig;

initialize(options?: IntegrationInitOptions): Promise<boolean>;
isInitialized(): boolean;
authenticate(): Promise<boolean>;
isAuthenticated(): boolean;
refreshAuth?(): Promise<boolean>;
callApi<T = any>(options: ApiCallOptions): Promise<IntegrationResponse<T>>;
disconnect(): Promise<boolean>;
}

/**
* Extended interface for SSO integrations
*/
export interface SSOIntegration extends Integration {
readonly type: IntegrationType.SSO;

generateAuthUrl(redirectUri?: string, state?: string): string;
handleAuthCallback(code: string, state?: string): Promise<any>;
validateToken(token: string): Promise<boolean>;
getUserInfo(token: string): Promise<any>;
}

/**
* Extended interface for SAML integrations
*/
export interface SAMLIntegration extends Integration {
readonly type: IntegrationType.SAML;

generateSAMLRequest(): string;
validateSAMLResponse(response: string): Promise<any>;
getMetadata(): string;
}

/**
* Extended interface for OAuth integrations
*/
export interface OAuthIntegration extends Integration {
readonly type: IntegrationType.OAUTH;
readonly config: IntegrationConfig & { oauth2Config: OAuth2Config };

generateAuthUrl(scopes?: string[], redirectUri?: string, state?: string): string;
handleAuthCallback(code: string, redirectUri?: string): Promise<any>;
refreshToken(refreshToken: string): Promise<any>;
}

/**
* Extended interface for LLM provider integrations
*/
export interface LLMIntegration extends Integration {
readonly type: IntegrationType.LLM;

complete(prompt: string, options?: any): Promise<IntegrationResponse<string>>;
generateEmbeddings(text: string): Promise<IntegrationResponse<number[]>>;
streamComplete?(prompt: string, callback: (chunk: string, done: boolean) => void, options?: any): Promise<void>;
listModels?(): Promise<IntegrationResponse<string[]>>;
}

/**
* A registry to maintain and access integrations
*/
export class IntegrationRegistry {
private static instance: IntegrationRegistry;
private integrations: Map<string, Integration> = new Map();

/**
* Get the singleton instance of the registry
*/
public static getInstance(): IntegrationRegistry {
    if (!IntegrationRegistry.instance) {
    IntegrationRegistry.instance = new IntegrationRegistry();
    }
    return IntegrationRegistry.instance;
}

/**
* Register a new integration
*/
public register(integration: Integration): void {
    if (this.integrations.has(integration.id)) {
    console.warn(`Integration with ID ${integration.id} already exists. Overwriting.`);
    }
    this.integrations.set(integration.id, integration);
}

/**
* Get an integration by its ID
*/
public get<T extends Integration>(id: string): T | undefined {
    return this.integrations.get(id) as T | undefined;
}

/**
* Get all integrations of a specific type
*/
public getByType<T extends Integration>(type: IntegrationType): T[] {
    return Array.from(this.integrations.values())
    .filter(integration => integration.type === type) as T[];
}

/**
* Remove an integration by its ID
*/
public remove(id: string): boolean {
    return this.integrations.delete(id);
}

/**
* Clear all integrations
*/
public clear(): void {
    this.integrations.clear();
}

/**
* Get all registered integrations
*/
public getAll(): Integration[] {
    return Array.from(this.integrations.values());
}
}

/**
* Abstract base class for integrations to reduce boilerplate
*/
export abstract class BaseIntegration implements Integration {
public readonly id: string;
public readonly name: string;
public readonly type: IntegrationType;
public readonly config: IntegrationConfig;

protected initialized = false;
protected authenticated = false;
protected authData: any = null;

constructor(id: string, name: string, type: IntegrationType, config: IntegrationConfig) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.config = config;
}

public isInitialized(): boolean {
    return this.initialized;
}

public isAuthenticated(): boolean {
    return this.authenticated;
}

public abstract initialize(options?: IntegrationInitOptions): Promise<boolean>;
public abstract authenticate(): Promise<boolean>;
public abstract callApi<T = any>(options: ApiCallOptions): Promise<IntegrationResponse<T>>;

public async disconnect(): Promise<boolean> {
    this.authenticated = false;
    this.authData = null;
    return true;
}

protected validateConfig(): boolean {
    // Basic validation that config has required fields
    if (!this.config) return false;
    if (!this.config.baseUrl) return false;
    if (!this.config.endpoints || Object.keys(this.config.endpoints).length === 0) return false;
    
    return true;
}
}

/**
* Factory function to create integrations of various types
*/
export const createIntegration = (
type: IntegrationType,
id: string,
name: string,
config: IntegrationConfig
): Integration | null => {
// Implementation would instantiate the correct integration type
// This would be expanded with concrete implementations
return null;
};

/**
* Main Gateway class that provides access to all integrations
*/
export class IntegrationGateway {
private static instance: IntegrationGateway;
private registry: IntegrationRegistry;

private constructor() {
    this.registry = IntegrationRegistry.getInstance();
}

/**
* Get the singleton instance of the gateway
*/
public static getInstance(): IntegrationGateway {
    if (!IntegrationGateway.instance) {
    IntegrationGateway.instance = new IntegrationGateway();
    }
    return IntegrationGateway.instance;
}

/**
* Register a new integration with the gateway
*/
public registerIntegration(integration: Integration): void {
    this.registry.register(integration);
}

/**
* Get an integration by its ID
*/
public getIntegration<T extends Integration>(id: string): T | undefined {
    return this.registry.get<T>(id);
}

/**
* Get all integrations of a specific type
*/
public getIntegrationsByType<T extends Integration>(type: IntegrationType): T[] {
    return this.registry.getByType<T>(type);
}

/**
* Initialize all registered integrations
*/
public async initializeAll(options?: IntegrationInitOptions): Promise<boolean[]> {
    const integrations = this.registry.getAll();
    return Promise.all(integrations.map(integration => integration.initialize(options)));
}

/**
* Get a specific type of integration by ID and casting to the appropriate type
*/
public getSSOIntegration(id: string): SSOIntegration | undefined {
    const integration = this.registry.get<SSOIntegration>(id);
    return integration?.type === IntegrationType.SSO ? integration : undefined;
}

public getSAMLIntegration(id: string): SAMLIntegration | undefined {
    const integration = this.registry.get<SAMLIntegration>(id);
    return integration?.type === IntegrationType.SAML ? integration : undefined;
}

public getOAuthIntegration(id: string): OAuthIntegration | undefined {
    const integration = this.registry.get<OAuthIntegration>(id);
    return integration?.type === IntegrationType.OAUTH ? integration : undefined;
}

public getLLMIntegration(id: string): LLMIntegration | undefined {
    const integration = this.registry.get<LLMIntegration>(id);
    return integration?.type === IntegrationType.LLM ? integration : undefined;
}

/**
* Helper method to call an integration's API by ID
*/
public async callIntegrationApi<T = any>(
    integrationId: string,
    options: ApiCallOptions
): Promise<IntegrationResponse<T>> {
    const integration = this.getIntegration(integrationId);
    if (!integration) {
    throw new Error(`Integration with ID ${integrationId} not found`);
    }
    
    if (!integration.isInitialized()) {
    await integration.initialize();
    }
    
    if (options.withAuth !== false && !integration.isAuthenticated()) {
    await integration.authenticate();
    }
    
    return integration.callApi<T>(options);
}
}

// Export the default singleton instance
export default IntegrationGateway.getInstance();

