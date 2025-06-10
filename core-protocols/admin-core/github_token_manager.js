const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Octokit } = require('@octokit/rest');
const { createOAuthAppAuth } = require('@octokit/auth-oauth-app');
const { createOAuthUserAuth } = require('@octokit/auth-oauth-user');

class GitHubTokenManager {
    constructor(projectId, clientId, clientSecret) {
        this.projectId = projectId;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.secretClient = new SecretManagerServiceClient();
        this.tokenCache = new Map();
        this.expirationThreshold = 3600 * 1000; // 1 hour in milliseconds
        this.oauth2Config = {
            clientType: 'oauth-app',
            clientId: this.clientId,
            clientSecret: this.clientSecret,
            scopes: ['repo', 'user'],
        };
    }

async validateGitHubToken(tokenData) {
    try {
        const { access_token, refresh_token, expires_at } = tokenData;
        
        // Check if token is expired or about to expire
        const now = Date.now();
        if (expires_at && now >= expires_at - this.expirationThreshold) {
            const refreshedToken = await this.refreshOAuthToken(refresh_token);
            if (refreshedToken) {
                return this.validateGitHubToken(refreshedToken);
            }
        }

        const auth = createOAuthUserAuth({
            ...this.oauth2Config,
            token: access_token,
        });

        const { token } = await auth();
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.users.getAuthenticated();

        return {
            isValid: true,
            username: data.login,
            scopes: await this.getTokenScopes(octokit),
            expiresAt: expires_at,
            refreshToken: refresh_token
        };
    } catch (error) {
        return {
            isValid: false,
            error: error.message
        };
    }
}

async checkSecretManagerToken(secretName) {
    try {
    const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;
    const [version] = await this.secretClient.accessSecretVersion({ name });
    const token = version.payload.data.toString();
    return await this.validateGitHubToken(token);
    } catch (error) {
    return {
        isValid: false,
        error: `Secret Manager error: ${error.message}`
    };
    }
}

async rotateToken(secretName, newToken) {
    try {
    // Validate new token before rotation
    const validation = await this.validateGitHubToken(newToken);
    if (!validation.isValid) {
        throw new Error('New token validation failed');
    }

    // Create new version in Secret Manager
    const parent = `projects/${this.projectId}/secrets/${secretName}`;
    await this.secretClient.addSecretVersion({
        parent,
        payload: {
        data: Buffer.from(newToken)
        }
    });

    this.tokenCache.delete(secretName); // Clear cache
    return true;
    } catch (error) {
    throw new Error(`Token rotation failed: ${error.message}`);
    }
}

async getTokenScopes(octokit) {
    const response = await octokit.request('GET /');
    return response.headers['x-oauth-scopes']?.split(', ') || [];
}

async refreshOAuthToken(refreshToken) {
    try {
        const auth = createOAuthUserAuth({
            ...this.oauth2Config,
            refreshToken,
        });

        const { token, refreshToken: newRefreshToken, expiresAt } = await auth({ type: "refresh" });
        
        return {
            access_token: token,
            refresh_token: newRefreshToken,
            expires_at: expiresAt
        };
    } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
    }
}

async initiateOAuthFlow(code) {
    try {
        const auth = createOAuthUserAuth({
            ...this.oauth2Config,
            code,
        });

        const { token, refreshToken, expiresAt } = await auth({ type: "token" });
        
        return {
            access_token: token,
            refresh_token: refreshToken,
            expires_at: expiresAt
        };
    } catch (error) {
        throw new Error(`OAuth flow failed: ${error.message}`);
    }
}

async monitorTokenHealth(secretNames) {
    const results = new Map();
    for (const secretName of secretNames) {
    const status = await this.checkSecretManagerToken(secretName);
    results.set(secretName, status);

    // Alert if token is expired or near expiration
    if (status.expiresAt) {
        const timeToExpiration = new Date(status.expiresAt) - new Date();
        if (timeToExpiration < this.expirationThreshold) {
        console.warn(`Token ${secretName} expires soon: ${status.expiresAt}`);
        }
    }
    }
    return results;
}

async getSecureToken(secretName) {
    if (this.tokenCache.has(secretName)) {
    return this.tokenCache.get(secretName);
    }

    const token = await this.checkSecretManagerToken(secretName);
    if (token.isValid) {
    this.tokenCache.set(secretName, token);
    return token;
    }
    throw new Error(`Invalid token in ${secretName}`);
}
}

module.exports = GitHubTokenManager;

