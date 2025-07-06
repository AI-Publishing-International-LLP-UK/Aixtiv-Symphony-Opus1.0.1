/**
 * Cloudflare Pages Function for SallyPort Login
 * Endpoint: /api/sallyport/login
 */

// Simple crypto function for Cloudflare Pages
function generateSessionToken(credentials) {
    const payload = {
        email: credentials.email || 'test@2100.cool',
        timestamp: Date.now(),
        service: 'sallyport-auth'
    };
    
    // Simple hash generation using TextEncoder and crypto.subtle
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    });
}

function generateUserUuid(sessionToken) {
    const hash = sessionToken.substring(0, 12);
    return `user-${hash}`;
}

async function verifySession(sessionToken) {
    try {
        // Basic token validation
        if (!sessionToken || sessionToken.length < 32) {
            return {
                valid: false,
                message: 'Invalid token format',
                error: 'invalid_format'
            };
        }

        // Check SallyPort service
        const baseUrl = 'https://sallyport-cloudflare-auth-859242575175.us-west1.run.app';
        const response = await fetch(`${baseUrl}/api/admin`, {
            method: 'GET',
            headers: {
                'X-Session-Token': sessionToken,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
            return {
                valid: true,
                userUuid: generateUserUuid(sessionToken),
                email: 'authenticated@2100.cool',
                displayName: 'Authenticated User',
                role: 'user',
                permissions: ['read', 'write']
            };
        }

        return {
            valid: false,
            message: `Authentication failed with status: ${response.status}`,
            error: 'invalid_session'
        };
    } catch (error) {
        return {
            valid: false,
            message: `Authentication service error: ${error.message}`,
            error: 'service_error'
        };
    }
}

async function authenticate(credentials) {
    try {
        // Check if SallyPort service is healthy
        const baseUrl = 'https://sallyport-cloudflare-auth-859242575175.us-west1.run.app';
        const healthResponse = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000)
        });
        
        if (healthResponse.ok) {
            const sessionToken = await generateSessionToken(credentials);
            const verification = await verifySession(sessionToken);
            
            if (verification.valid) {
                return {
                    success: true,
                    sessionToken,
                    user: {
                        uuid: verification.userUuid,
                        email: verification.email,
                        displayName: verification.displayName,
                        role: verification.role,
                        permissions: verification.permissions
                    }
                };
            }
        }
        
        return {
            success: false,
            message: 'Authentication failed',
            error: 'invalid_credentials'
        };
    } catch (error) {
        return {
            success: false,
            message: `Authentication service error: ${error.message}`,
            error: 'service_error'
        };
    }
}

async function createTestSession(userType = 'user') {
    const credentials = {
        email: `test-${userType}@2100.cool`,
        userType
    };

    const sessionToken = await generateSessionToken(credentials);
    const verification = await verifySession(sessionToken);

    if (verification.valid) {
        const permissions = {
            'owner': ['read', 'write', 'admin', 'owner'],
            'admin': ['read', 'write', 'admin'],
            'user': ['read', 'write'],
            'guest': ['read']
        };

        return {
            success: true,
            sessionToken,
            user: {
                uuid: verification.userUuid,
                email: verification.email,
                displayName: verification.displayName,
                role: userType,
                permissions: permissions[userType] || permissions['user']
            }
        };
    }

    throw new Error('Failed to create test session');
}

export async function onRequestPost(context) {
    try {
        const { email, password, sessionToken } = await context.request.json();

        let authResult;

        if (sessionToken) {
            authResult = await verifySession(sessionToken);
            if (authResult.valid) {
                authResult.success = true;
            }
        } else if (email) {
            authResult = await authenticate({ email, password });
        } else {
            authResult = await createTestSession('user');
        }

        if (authResult.success || authResult.valid) {
            return new Response(JSON.stringify(authResult), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        } else {
            return new Response(JSON.stringify(authResult), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false,
            message: 'Authentication failed: ' + error.message,
            error: 'internal_error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
