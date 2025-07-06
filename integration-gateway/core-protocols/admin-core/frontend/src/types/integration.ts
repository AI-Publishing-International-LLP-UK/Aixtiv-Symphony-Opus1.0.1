import type { SecurityLevel, ProtectionLevel } from './security';

export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope: string[];
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    provider: OAuthProvider;
}

export enum OAuthProvider {
    GOOGLE = 'google',
    GITHUB = 'github',
    MICROSOFT = 'microsoft',
    CUSTOM = 'custom'
}

export interface SecurityConfig {
    level: SecurityLevel;
    protection: ProtectionLevel;
    encryption: {
        algorithm: string;
        keySize: number;
        mode: string;
    };
    authentication: {
        type: AuthType;
        mfa: boolean;
        sessionTimeout: number;
    };
    rateLimit: {
        enabled: boolean;
        maxRequests: number;
        windowMs: number;
    };
}

export enum AuthType {
    JWT = 'jwt',
    SESSION = 'session',
    TOKEN = 'token',
    OAUTH = 'oauth'
}

export interface IntegrationEndpoint {
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    timeout: number;
    retry: RetryConfig;
}

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

export interface RetryConfig {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
}
