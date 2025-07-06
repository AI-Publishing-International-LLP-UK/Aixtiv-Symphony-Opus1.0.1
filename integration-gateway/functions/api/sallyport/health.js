/**
 * Cloudflare Pages Function for SallyPort Health Check
 * Endpoint: /api/sallyport/health
 */

export async function onRequestGet() {
    try {
        // Check SallyPort service health
        const baseUrl = 'https://sallyport-cloudflare-auth-859242575175.us-west1.run.app';
        
        const response = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // 10 second timeout
            signal: AbortSignal.timeout(10000)
        });

        const health = {
            status: response.ok ? 'healthy' : 'unhealthy',
            service: 'sallyport-auth',
            timestamp: new Date().toISOString(),
            baseUrl: baseUrl,
            statusCode: response.status
        };

        if (response.ok) {
            const data = await response.json();
            health.details = data;
        }

        return new Response(JSON.stringify(health), {
            status: response.ok ? 200 : 503,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });

    } catch (error) {
        const errorResponse = {
            status: 'unhealthy',
            service: 'sallyport-auth',
            timestamp: new Date().toISOString(),
            error: error.message
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 503,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
