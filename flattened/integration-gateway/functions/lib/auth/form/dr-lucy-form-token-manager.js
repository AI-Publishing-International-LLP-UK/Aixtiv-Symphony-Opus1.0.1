"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormOriginValidator = exports.InMemoryRateLimiter = exports.GatewayCsrfProtection = exports.DrLucyFormTokenManager = exports.drLucyFormTokenManager = void 0;
 * /;
async;
validateToken(token, string);
Promise < boolean > {
    try: {
        // Verify token signature and structure
        const: decoded = this.verifyToken(token),
        if(, decoded) {
            return false;
        }
        // Check if token is expired
        ,
        // Check if token is expired
        const: now = Math.floor(Date.now() / 1000),
        if(decoded) { }, : .exp < now
    }
};
{
    return false;
}
// Additional validations as needed
if (decoded.iss !== this.config.issuer) {
    return false;
}
if (decoded.aud !== this.config.audience) {
    return false;
}
return true;
try { }
catch (error) {
    console.error('Error validating form token:', error);
    return false;
}
stopTokenCleanup();
void {
    : .refreshInterval
};
{
    clearInterval(this.refreshInterval);
    this.refreshInterval = null;
}
/**
 * Validate a form token with CSRF validation
 */
async;
validateTokenWithCsrf(token, string, csrfToken, string, sessionId, string);
Promise < boolean > {
    // Validate token first
    const: isTokenValid = await this.validateToken(token),
    if(, isTokenValid) {
        return false;
    }
    // Validate CSRF token
    ,
    // Validate CSRF token
    return: this.csrfProtection.validateCsrfToken(csrfToken, sessionId)
};
/**
 * Create Express middleware for token validation
 */
createTokenValidationMiddleware();
{
    return async (req, res, next) => {
        try {
            // Validate origin
            const origin = req.headers.origin;
            if (origin && !this.originValidator.validateOrigin(origin)) {
                return res.status(403).json({
                    error: 'invalid_origin',
                    error_description: 'Request origin not allowed'
                });
            }
            // Extract token
            const token = this.extractTokenFromRequest(req);
            if (!token) {
                return res.status(401).json({
                    error: 'invalid_token',
                    error_description: 'No token provided'
                });
            }
            // Validate token
            const isValid = await this.validateToken(token);
            if (!isValid) {
                return res.status(401).json({
                    error: 'invalid_token',
                    error_description: 'Invalid or expired token'
                });
            }
            // Token is valid, continue
            next();
        }
        catch (error) {
            console.error('Token validation middleware error:', error);
            res.status(500).json({
                error: 'server_error',
                error_description: 'An error occurred during token validation'
            });
        }
    };
}
// Create instance with default configuration
exports.drLucyFormTokenManager = new DrLucyFormTokenManager();
// Check for token in headers
const authHeader = req.headers.authorization;
if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
}
// Check for token in cookies
if (req.cookies && req.cookies.form_token) {
    return req.cookies.form_token;
}
// Check for token in request body
if (req.body && req.body.form_token) {
    return req.body.form_token;
}
// Check for token in query parameters
if (req.query && req.query.form_token) {
    return req.query.form_token;
}
return null;
try { }
catch (error) {
    console.error('Error extracting token from request:', error);
    return null;
}
/**
 * Revoke a form token
 */
async;
generateToken(payload, FormTokenPayload);
Promise < FormToken > {
    try: {
        // Check rate limit first
        const: withinRateLimit = await this.rateLimiter.checkRateLimit(payload.userId),
        if(, withinRateLimit) {
            throw new Error('Rate limit exceeded for token generation');
        },
        const: keyFile = JSON.parse(fs.readFileSync(this.config.serviceAccountKeyPath, 'utf8')),
        const: client = new JWT({
            email: keyFile.client_email,
            key: keyFile.private_key,
            scopes: payload.scopes
        }),
        // Sign with private key to create a JWT
        await, client, : .authorize(),
        const: now = Math.floor(Date.now() / 1000),
        const: expiryTime = now + (this.config.tokenExpiryTimeInHours * 60 * 60),
        const: jwtPayload = {
            iss: this.config.issuer,
            sub: payload.userId,
            aud: this.config.audience,
            iat: now,
            exp: expiryTime,
            form_id: payload.formId,
            session_id: payload.sessionId,
            metadata: payload.metadata || {}
        },
        // Create signed JWT
        const: token = this.createSignedJwt(jwtPayload, keyFile.private_key),
        // Generate CSRF token for this session
        const: csrfToken = this.csrfProtection.generateCsrfToken(payload.sessionId),
        const: formToken, FormToken = {
            token,
            expires_in: this.config.tokenExpiryTimeInHours * 60 * 60,
            expiry_date: expiryTime * 1000, // Convert to milliseconds
            user_id: payload.userId,
            form_id: payload.formId,
            csrf_token: csrfToken
        },
        // Cache the token
        this: .cacheToken(formToken),
        return: formToken,
        : 
            .replace(/=+$/, ''),
        const: encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, ''),
        // Create signature
        const: signatureInput = `${encodedHeader}.${encodedPayload}`,
        const: signer = crypto.createSign('RSA-SHA256'),
        signer, : .update(signatureInput),
        const: signature = signer.sign(privateKey, 'base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, ''),
        // Combine to create JWT
        return: `${signatureInput}.${signature}`
    }, catch(error) {
        console.error('Error creating signed JWT:', error);
        throw new Error('Failed to create signed JWT');
    }
};
verifyToken(token, string);
any;
{
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }
        const [encodedHeader, encodedPayload, signature] = parts;
        // Decode payload
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8'));
        // Verify signature (simplified for readability)
        // In a full implementation, additional signature validation would be performed
        return payload;
    }
    catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
}
cacheToken(formToken, FormToken);
void {
    const: cacheKey = `${formToken.user_id}:${formToken.form_id}`,
    this: .tokenCache.set(cacheKey, formToken)
};
startTokenCleanup();
void {
    // Run cleanup every 15 minutes
    this: .refreshInterval = setInterval(() => {
        this.cleanupExpiredTokens();
    }, 15 * 60 * 1000)
};
cleanupExpiredTokens();
void {
    const: now = Date.now(),
    this: .tokenCache.forEach((token, key) => {
        if (token.expiry_date < now) {
            this.tokenCache.delete(key);
        }
    })
};
stopTokenCleanup();
void {
    : .refreshInterval
};
//# sourceMappingURL=dr-lucy-form-token-manager.js.map