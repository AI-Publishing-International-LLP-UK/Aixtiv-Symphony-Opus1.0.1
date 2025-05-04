"use strict";
/**
 * OpenID Connect Implementation for LinkedIn Authentication
 * Comprehensive user information retrieval and management
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrMatchOpenIDConfig = exports.LinkedInOpenIDConnectService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * LinkedIn OpenID Connect Service
 */
class LinkedInOpenIDConnectService {
    constructor(config) {
        this.tokenCache = new Map();
        this.config = config;
    }
    /**
     * Generate Authorization URL for OpenID Connect
     */
    generateAuthorizationUrl(state, nonce) {
        // Generate state and nonce if not provided
        const authState = state || this.generateSecureToken();
        const authNonce = nonce || this.generateSecureToken();
        // Construct authorization URL
        const baseUrl = 'https://www.linkedin.com/oauth/v2/authorization';
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: this.config.scopes.join(' '),
            state: authState,
            nonce: authNonce
        });
        return `${baseUrl}?${params.toString()}`;
    }
    /**
     * Exchange Authorization Code for Tokens
     */
    exchangeAuthorizationCode(authorizationCode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post('https://www.linkedin.com/oauth/v2/accessToken', new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: authorizationCode,
                    redirect_uri: this.config.redirectUri,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const tokenSet = {
                    access_token: response.data.access_token,
                    token_type: response.data.token_type,
                    expires_in: response.data.expires_in,
                    scope: response.data.scope,
                    id_token: response.data.id_token,
                    refresh_token: response.data.refresh_token
                };
                // Cache the token set
                this.cacheTokenSet(tokenSet);
                return tokenSet;
            }
            catch (error) {
                console.error('Token exchange failed', error);
                throw new Error('Failed to exchange authorization code');
            }
        });
    }
    /**
     * Retrieve User Information
     */
    getUserInfo(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use provided token or retrieve from cache
            const token = accessToken || this.getAccessTokenFromCache();
            try {
                const response = yield axios_1.default.get('https://api.linkedin.com/v2/userinfo', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                // Transform response to LinkedInUserInfo
                return this.transformUserInfo(response.data);
            }
            catch (error) {
                console.error('User info retrieval failed', error);
                throw new Error('Failed to retrieve user information');
            }
        });
    }
    /**
     * Refresh Access Token
     */
    refreshAccessToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post('https://www.linkedin.com/oauth/v2/accessToken', new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const tokenSet = {
                    access_token: response.data.access_token,
                    token_type: response.data.token_type,
                    expires_in: response.data.expires_in,
                    scope: response.data.scope,
                    refresh_token: response.data.refresh_token
                };
                // Update cache with new token set
                this.cacheTokenSet(tokenSet);
                return tokenSet;
            }
            catch (error) {
                console.error('Token refresh failed', error);
                throw new Error('Failed to refresh access token');
            }
        });
    }
    /**
     * Validate Access Token
     */
    validateAccessToken(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Introspection endpoint
                const response = yield axios_1.default.post('https://www.linkedin.com/oauth/v2/introspect', new URLSearchParams({
                    token: accessToken,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                return {
                    valid: response.data.active,
                    claims: response.data
                };
            }
            catch (error) {
                console.error('Token validation failed', error);
                return { valid: false };
            }
        });
    }
    /**
     * Generate a secure random token
     */
    generateSecureToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
    /**
     * Cache token set
     */
    cacheTokenSet(tokenSet) {
        // Use access token as the cache key
        this.tokenCache.set(tokenSet.access_token, tokenSet);
    }
    /**
     * Retrieve access token from cache
     */
    getAccessTokenFromCache() {
        // In a real-world scenario, you'd implement more sophisticated caching
        if (this.tokenCache.size === 0) {
            throw new Error('No cached tokens available');
        }
        // Return the first cached token
        return this.tokenCache.keys().next().value;
    }
    /**
     * Transform raw user info to standardized interface
     */
    transformUserInfo(rawUserInfo) {
        var _a, _b;
        return {
            sub: rawUserInfo.sub,
            name: rawUserInfo.name,
            given_name: rawUserInfo.given_name,
            family_name: rawUserInfo.family_name,
            picture: rawUserInfo.picture,
            email: rawUserInfo.email,
            email_verified: rawUserInfo.email_verified,
            // LinkedIn-specific extensions
            headline: rawUserInfo.headline,
            publicProfileUrl: rawUserInfo.publicProfileUrl,
            profilePictureUrls: {
                normal: (_a = rawUserInfo.pictureUrls) === null || _a === void 0 ? void 0 : _a.normal,
                large: (_b = rawUserInfo.pictureUrls) === null || _b === void 0 ? void 0 : _b.large
            }
        };
    }
}
exports.LinkedInOpenIDConnectService = LinkedInOpenIDConnectService;
/**
 * LinkedIn OpenID Connect Configuration for Dr. Match
 */
exports.DrMatchOpenIDConfig = {
    clientId: '7874fjg5h9t5la',
    clientSecret: process.env.LINKEDIN_DR_MATCH_CLIENT_SECRET || '',
    redirectUri: 'https://coaching2100.com',
    scopes: [
        'openid', // Basic OpenID Connect scope
        'profile', // Access to profile information
        'email' // Access to email address
    ]
};
/**
 * Demonstration of OpenID Connect Flow
 */
function demonstrateLinkedInOpenIDConnect() {
    return __awaiter(this, void 0, void 0, function* () {
        const openIDService = new LinkedInOpenIDConnectService(exports.DrMatchOpenIDConfig);
        try {
            // Generate Authorization URL
            const authorizationUrl = openIDService.generateAuthorizationUrl();
            console.log('Authorization URL:', authorizationUrl);
            // Simulate authorization code exchange 
            // (In a real app, this would come from the OAuth flow)
            const mockAuthorizationCode = 'MOCK_AUTHORIZATION_CODE';
            const tokenSet = yield openIDService.exchangeAuthorizationCode(mockAuthorizationCode);
            console.log('Token Set:', tokenSet);
            // Retrieve User Information
            const userInfo = yield openIDService.getUserInfo(tokenSet.access_token);
            console.log('User Information:', userInfo);
            // Validate Access Token
            const tokenValidation = yield openIDService.validateAccessToken(tokenSet.access_token);
            console.log('Token Validation:', tokenValidation);
        }
        catch (error) {
            console.error('OpenID Connect Demonstration Failed', error);
        }
    });
}
exports.default = {
    LinkedInOpenIDConnectService,
    DrMatchOpenIDConfig: exports.DrMatchOpenIDConfig,
    demonstrateLinkedInOpenIDConnect
};
