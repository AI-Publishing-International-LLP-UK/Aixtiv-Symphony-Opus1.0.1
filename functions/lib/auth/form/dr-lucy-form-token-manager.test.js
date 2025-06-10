"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dr_lucy_form_token_manager_1 = require("./dr-lucy-form-token-manager");
const fs = require("fs");
const crypto_1 = require("crypto");
// Mock dependencies
jest.mock('fs');
jest.mock('google-auth-library');
jest.mock('crypto');
describe('DrLucyFormTokenManager', () => {
    // Setup common test variables
    let formTokenManager;
    let mockCsrfProtection;
    let mockRateLimiter;
    let mockOriginValidator;
    // Sample test data
    const testPayload = {
        userId: 'test-user-123',
        formId: 'test-form-456',
        sessionId: 'test-session-789',
        scopes: ['form:read', 'form:submit'],
        metadata: {
            source: 'unit-test',
            testId: 'test-001'
        }
    };
    // Mock service account key
    const mockServiceAccountKey = {
        client_email: 'drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----\n',
        project_id: 'api-for-warp-drive'
    };
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        // Setup file system mock
        fs.readFileSync.mockReturnValue(JSON.stringify(mockServiceAccountKey));
        // Setup crypto mock
        crypto_1.default.createHmac.mockReturnValue({
            update: jest.fn(),
            digest: jest.fn().mockReturnValue('mock-digest')
        });
        crypto_1.default.createSign.mockReturnValue({
            update: jest.fn(),
            sign: jest.fn().mockReturnValue('mock-signature')
        });
        crypto_1.default.randomBytes.mockReturnValue({
            toString: jest.fn().mockReturnValue('mock-random-token')
        });
        // Create mock components
        mockCsrfProtection = {
            generateCsrfToken: jest.fn().mockReturnValue('mock-csrf-token'),
            validateCsrfToken: jest.fn().mockReturnValue(true)
        };
        mockRateLimiter = {
            checkRateLimit: jest.fn().mockResolvedValue(true)
        };
        mockOriginValidator = {
            validateOrigin: jest.fn().mockReturnValue(true),
            addAllowedOrigin: jest.fn(),
            removeAllowedOrigin: jest.fn(),
            createOriginValidationMiddleware: jest.fn()
        };
        // Create token manager with mocked dependencies
        formTokenManager = new dr_lucy_form_token_manager_1.DrLucyFormTokenManager({
            serviceAccountKeyPath: '/mock/path/to/key.json',
            tokenExpiryTimeInHours: 1,
            audience: 'test-audience',
            issuer: 'test-issuer'
        }, mockCsrfProtection, mockRateLimiter, mockOriginValidator);
        // Mock internal methods
        formTokenManager.createSignedJwt = jest.fn().mockReturnValue('mock-jwt-token');
        formTokenManager.verifyToken = jest.fn().mockReturnValue({
            sub: testPayload.userId,
            form_id: testPayload.formId,
            iss: 'test-issuer',
            aud: 'test-audience',
            exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        });
        formTokenManager.cacheToken = jest.fn();
        formTokenManager.startTokenCleanup = jest.fn();
        formTokenManager.stopTokenCleanup = jest.fn();
    });
    afterEach(() => {
        // Clean up
        jest.resetAllMocks();
    });
    // Test cases
    describe('generateToken', () => {
        it('should return false for invalid token', async () => {
            // Arrange
            formTokenManager.verifyToken = jest.fn().mockReturnValue(null);
            // Act
            const result = await formTokenManager.revokeToken('invalid-token');
            // Assert
            expect(result).toBe(false);
            expect(formTokenManager.verifyToken).toHaveBeenCalledWith('invalid-token');
        });
        it('should handle errors during revocation', async () => {
            // Arrange
            formTokenManager.verifyToken = jest.fn().mockImplementation(() => {
                throw new Error('Verification error');
            });
            // Act
            const result = await formTokenManager.revokeToken('error-token');
            // Assert
            expect(result).toBe(false);
        });
    });
    describe('createTokenValidationMiddleware', () => {
        let mockRequest;
        let mockResponse;
        let mockNext;
        let middleware;
        beforeEach(() => {
            mockRequest = {
                headers: {
                    origin: 'https://aixtiv-symphony.com'
                }
            };
            mockResponse = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
            middleware = formTokenManager.createTokenValidationMiddleware();
            jest.spyOn(formTokenManager, 'extractTokenFromRequest');
            jest.spyOn(formTokenManager, 'validateToken');
        });
        it('should call next() for valid token and origin', async () => {
            // Arrange
            formTokenManager.extractTokenFromRequest.mockReturnValue('valid-token');
            formTokenManager.validateToken.mockResolvedValue(true);
            // Act
            await middleware(mockRequest, mockResponse, mockNext);
            // Assert
            expect(mockOriginValidator.validateOrigin).toHaveBeenCalledWith('https://aixtiv-symphony.com');
            expect(formTokenManager.extractTokenFromRequest).toHaveBeenCalledWith(mockRequest);
            expect(formTokenManager.validateToken).toHaveBeenCalledWith('valid-token');
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
        it('should return 403 for invalid origin', async () => {
            // Arrange
            mockOriginValidator.validateOrigin.mockReturnValue(false);
            // Act
            await middleware(mockRequest, mockResponse, mockNext);
            // Assert
            expect(mockOriginValidator.validateOrigin).toHaveBeenCalledWith('https://aixtiv-symphony.com');
            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'invalid_origin',
                error_description: 'Request origin not allowed'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should return 401 when no token is provided', async () => {
            // Arrange
            formTokenManager.extractTokenFromRequest.mockReturnValue(null);
            // Act
            await middleware(mockRequest, mockResponse, mockNext);
            // Assert
            expect(formTokenManager.extractTokenFromRequest).toHaveBeenCalledWith(mockRequest);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'invalid_token',
                error_description: 'No token provided'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should return 401 for invalid token', async () => {
            // Arrange
            formTokenManager.extractTokenFromRequest.mockReturnValue('invalid-token');
            formTokenManager.validateToken.mockResolvedValue(false);
            // Act
            await middleware(mockRequest, mockResponse, mockNext);
            // Assert
            expect(formTokenManager.extractTokenFromRequest).toHaveBeenCalledWith(mockRequest);
            expect(formTokenManager.validateToken).toHaveBeenCalledWith('invalid-token');
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'invalid_token',
                error_description: 'Invalid or expired token'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should return 500 when an error occurs', async () => {
            // Arrange
            formTokenManager.extractTokenFromRequest.mockReturnValue('valid-token');
            formTokenManager.validateToken.mockRejectedValue(new Error('Validation error'));
            // Act
            await middleware(mockRequest, mockResponse, mockNext);
            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'server_error',
                error_description: 'An error occurred during token validation'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
    // Test CSRF Protection Class
    describe('GatewayCsrfProtection', () => {
        let csrfProtection;
        beforeEach(() => {
            csrfProtection = new dr_lucy_form_token_manager_1.GatewayCsrfProtection('test-secret');
        });
        describe('generateCsrfToken', () => {
            it('should generate a valid token', () => {
                // Act
                const token = csrfProtection.generateCsrfToken('test-session');
                // Assert
                expect(token).toBeDefined();
                expect(typeof token).toBe('string');
            });
        });
        describe('validateCsrfToken', () => {
            it('should validate a token generated for the same session', () => {
                // Arrange
                const sessionId = 'test-session';
                const token = csrfProtection.generateCsrfToken(sessionId);
                // Act
                const result = csrfProtection.validateCsrfToken(token, sessionId);
                // Assert
                expect(result).toBe(true);
            });
            it('should reject a token for a different session', () => {
                // Arrange
                const token = csrfProtection.generateCsrfToken('session-1');
                // Act
                const result = csrfProtection.validateCsrfToken(token, 'session-2');
                // Assert
                expect(result).toBe(false);
            });
            it('should handle invalid token format', () => {
                // Act
                const result = csrfProtection.validateCsrfToken('invalid-token', 'test-session');
                // Assert
                expect(result).toBe(false);
            });
        });
    });
    // Test InMemoryRateLimiter
    describe('InMemoryRateLimiter', () => {
        let rateLimiter;
        beforeEach(() => {
            rateLimiter = new dr_lucy_form_token_manager_1.InMemoryRateLimiter();
        });
        it('should allow requests within the rate limit', async () => {
            // Act
            const result1 = await rateLimiter.checkRateLimit('test-user');
            const result2 = await rateLimiter.checkRateLimit('test-user');
            const result3 = await rateLimiter.checkRateLimit('test-user');
            // Assert
            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(result3).toBe(true);
        });
        it('should block requests that exceed the rate limit', async () => {
            // Arrange
            const userId = 'test-user';
            const maxRequests = 5;
            // Act & Assert
            for (let i = 1; i <= maxRequests; i++) {
                const result = await rateLimiter.checkRateLimit(userId);
                expect(result).toBe(true);
            }
            // This request should exceed the limit
            const exceedResult = await rateLimiter.checkRateLimit(userId);
            expect(exceedResult).toBe(false);
        });
        it('should track different users separately', async () => {
            // Act
            const user1Result1 = await rateLimiter.checkRateLimit('user-1');
            const user1Result2 = await rateLimiter.checkRateLimit('user-1');
            const user2Result1 = await rateLimiter.checkRateLimit('user-2');
            // Assert
            expect(user1Result1).toBe(true);
            expect(user1Result2).toBe(true);
            expect(user2Result1).toBe(true);
        });
    });
    // Test FormOriginValidator
    describe('FormOriginValidator', () => {
        let originValidator;
        beforeEach(() => {
            originValidator = new dr_lucy_form_token_manager_1.FormOriginValidator(['https://allowed-origin.com']);
        });
        describe('validateOrigin', () => {
            it('should allow listed origins', () => {
                // Act
                const result = originValidator.validateOrigin('https://allowed-origin.com');
                // Assert
                expect(result).toBe(true);
            });
            it('should reject unlisted origins', () => {
                // Act
                const result = originValidator.validateOrigin('https://unknown-origin.com');
                // Assert
                expect(result).toBe(false);
            });
            it('should allow all origins when wildcard is set', () => {
                // Arrange
                originValidator.addAllowedOrigin('*');
                // Act
                const result = originValidator.validateOrigin('https://any-origin.com');
                // Assert
                expect(result).toBe(true);
            });
        });
        describe('addAllowedOrigin/removeAllowedOrigin', () => {
            it('should allow new origins after they are added', () => {
                // Arrange
                const newOrigin = 'https://new-origin.com';
                // Act
                originValidator.addAllowedOrigin(newOrigin);
                const result = originValidator.validateOrigin(newOrigin);
                // Assert
                expect(result).toBe(true);
            });
            it('should reject origins after they are removed', () => {
                // Arrange
                const origin = 'https://allowed-origin.com';
                // Act
                originValidator.removeAllowedOrigin(origin);
                const result = originValidator.validateOrigin(origin);
                // Assert
                expect(result).toBe(false);
            });
        });
        describe('createOriginValidationMiddleware', () => {
            it('should create a middleware function', () => {
                // Act
                const middleware = originValidator.createOriginValidationMiddleware();
                // Assert
                expect(typeof middleware).toBe('function');
            });
        });
    });
});
expect(result).toBeDefined();
expect(result.token).toBe('mock-jwt-token');
expect(result.user_id).toBe(testPayload.userId);
expect(result.form_id).toBe(testPayload.formId);
expect(result.csrf_token).toBe('mock-csrf-token');
expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith(testPayload.userId);
expect(mockCsrfProtection.generateCsrfToken).toHaveBeenCalledWith(testPayload.sessionId);
expect(formTokenManager.createSignedJwt).toHaveBeenCalled();
expect(formTokenManager.cacheToken).toHaveBeenCalled();
;
it('should throw error when rate limit is exceeded', async () => {
    // Arrange
    mockRateLimiter.checkRateLimit.mockResolvedValue(false);
    // Act & Assert
    await expect(formTokenManager.generateToken(testPayload))
        .rejects.toThrow('Rate limit exceeded for token generation');
    expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith(testPayload.userId);
    expect(formTokenManager.createSignedJwt).not.toHaveBeenCalled();
});
it('should throw error when service account key file is invalid', async () => {
    // Arrange
    fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
    });
    // Act & Assert
    await expect(formTokenManager.generateToken(testPayload))
        .rejects.toThrow('Failed to generate form token');
});
;
describe('validateToken', () => {
    it('should validate a valid token', async () => {
        // Act
        const result = await formTokenManager.validateToken('valid-token');
        // Assert
        expect(result).toBe(true);
        expect(formTokenManager.verifyToken).toHaveBeenCalledWith('valid-token');
    });
    it('should reject an invalid token', async () => {
        // Arrange
        formTokenManager.verifyToken = jest.fn().mockReturnValue(null);
        // Act
        const result = await formTokenManager.validateToken('invalid-token');
        // Assert
        expect(result).toBe(false);
    });
    it('should reject an expired token', async () => {
        // Arrange
        formTokenManager.verifyToken = jest.fn().mockReturnValue({
            sub: testPayload.userId,
            form_id: testPayload.formId,
            iss: 'test-issuer',
            aud: 'test-audience',
            exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago (expired)
        });
        // Act
        const result = await formTokenManager.validateToken('expired-token');
        // Assert
        expect(result).toBe(false);
    });
    it('should reject a token with invalid issuer', async () => {
        // Arrange
        formTokenManager.verifyToken = jest.fn().mockReturnValue({
            sub: testPayload.userId,
            form_id: testPayload.formId,
            iss: 'wrong-issuer',
            aud: 'test-audience',
            exp: Math.floor(Date.now() / 1000) + 3600
        });
        // Act
        const result = await formTokenManager.validateToken('wrong-issuer-token');
        // Assert
        expect(result).toBe(false);
    });
    it('should reject a token with invalid audience', async () => {
        // Arrange
        formTokenManager.verifyToken = jest.fn().mockReturnValue({
            sub: testPayload.userId,
            form_id: testPayload.formId,
            iss: 'test-issuer',
            aud: 'wrong-audience',
            exp: Math.floor(Date.now() / 1000) + 3600
        });
        // Act
        const result = await formTokenManager.validateToken('wrong-audience-token');
        // Assert
        expect(result).toBe(false);
    });
});
describe('validateTokenWithCsrf', () => {
    it('should validate token with valid CSRF token', async () => {
        // Arrange
        const spyValidateToken = jest.spyOn(formTokenManager, 'validateToken')
            .mockResolvedValue(true);
        // Act
        const result = await formTokenManager.validateTokenWithCsrf('valid-token', 'valid-csrf', testPayload.sessionId);
        // Assert
        expect(result).toBe(true);
        expect(spyValidateToken).toHaveBeenCalledWith('valid-token');
        expect(mockCsrfProtection.validateCsrfToken).toHaveBeenCalledWith('valid-csrf', testPayload.sessionId);
    });
    it('should reject with invalid token', async () => {
        // Arrange
        const spyValidateToken = jest.spyOn(formTokenManager, 'validateToken')
            .mockResolvedValue(false);
        // Act
        const result = await formTokenManager.validateTokenWithCsrf('invalid-token', 'valid-csrf', testPayload.sessionId);
        // Assert
        expect(result).toBe(false);
        expect(spyValidateToken).toHaveBeenCalledWith('invalid-token');
        expect(mockCsrfProtection.validateCsrfToken).not.toHaveBeenCalled();
    });
    it('should reject with invalid CSRF token', async () => {
        // Arrange
        const spyValidateToken = jest.spyOn(formTokenManager, 'validateToken')
            .mockResolvedValue(true);
        mockCsrfProtection.validateCsrfToken.mockReturnValue(false);
        // Act
        const result = await formTokenManager.validateTokenWithCsrf('valid-token', 'invalid-csrf', testPayload.sessionId);
        // Assert
        expect(result).toBe(false);
        expect(spyValidateToken).toHaveBeenCalledWith('valid-token');
        expect(mockCsrfProtection.validateCsrfToken).toHaveBeenCalledWith('invalid-csrf', testPayload.sessionId);
    });
});
describe('extractTokenFromRequest', () => {
    it('should extract token from Authorization header', () => {
        // Arrange
        const mockRequest = {
            headers: {
                authorization: 'Bearer test-token-123'
            }
        };
        // Act
        const result = formTokenManager.extractTokenFromRequest(mockRequest);
        // Assert
        expect(result).toBe('test-token-123');
    });
    it('should extract token from cookies', () => {
        // Arrange
        const mockRequest = {
            headers: {},
            cookies: {
                form_token: 'cookie-token-456'
            }
        };
        // Act
        const result = formTokenManager.extractTokenFromRequest(mockRequest);
        // Assert
        expect(result).toBe('cookie-token-456');
    });
    it('should extract token from request body', () => {
        // Arrange
        const mockRequest = {
            headers: {},
            cookies: {},
            body: {
                form_token: 'body-token-789'
            }
        };
        // Act
        const result = formTokenManager.extractTokenFromRequest(mockRequest);
        // Assert
        expect(result).toBe('body-token-789');
    });
    it('should extract token from query parameters', () => {
        // Arrange
        const mockRequest = {
            headers: {},
            cookies: {},
            body: {},
            query: {
                form_token: 'query-token-abc'
            }
        };
        // Act
        const result = formTokenManager.extractTokenFromRequest(mockRequest);
        // Assert
        expect(result).toBe('query-token-abc');
    });
    it('should return null when no token is found', () => {
        // Arrange
        const mockRequest = {
            headers: {},
            cookies: {},
            body: {},
            query: {}
        };
        // Act
        const result = formTokenManager.extractTokenFromRequest(mockRequest);
        // Assert
        expect(result).toBeNull();
    });
    it('should handle errors gracefully', () => {
        // Arrange
        const mockRequest = {
            headers: {
                get: () => { throw new Error('Header error'); }
            }
        };
        // Act
        const result = formTokenManager.extractTokenFromRequest(mockRequest);
        // Assert
        expect(result).toBeNull();
    });
});
describe('revokeToken', () => {
    it('should successfully revoke a valid token', async () => {
        // Arrange
        const mockToken = 'valid-token-to-revoke';
        const mockTokenCache = new Map();
        mockTokenCache.set('test-key', { token: mockToken });
        formTokenManager.tokenCache = mockTokenCache;
        // Act
        const result = await formTokenManager.revokeToken(mockToken);
        // Assert
        expect(result).toBe(true);
        expect(formTokenManager.verifyToken).toHaveBeenCalledWith(mockToken);
        expect(mockTokenCache.size).toBe(0);
    });
    it('should return false for invalid token', async () => {
        // Arrange
        (formToken);
    });
});
//# sourceMappingURL=dr-lucy-form-token-manager.test.js.map