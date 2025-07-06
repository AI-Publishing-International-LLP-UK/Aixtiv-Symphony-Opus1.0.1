#!/usr/bin/env node

/**
 * Test script for Cloudflare OAuth2 service
 */

const cloudflareService = require('./src/services/cloudflare-oauth.js');

async function testCloudflareOAuth2() {
    try {
        console.log('🔐 Testing Cloudflare OAuth2 service...');
        
        // Initialize the service
        console.log('1. Initializing service...');
        await cloudflareService.initialize();
        console.log('✅ Service initialized successfully');
        
        // Test token verification
        console.log('2. Verifying token...');
        const tokenInfo = await cloudflareService.verifyToken();
        console.log('✅ Token verified:', tokenInfo.status);
        
        // List zones to ensure access
        console.log('3. Listing zones...');
        const zones = await cloudflareService.listZones();
        console.log(`✅ Found ${zones.length} zone(s)`);
        
        for (const zone of zones) {
            console.log(`   - ${zone.name} (${zone.id})`);
        }
        
        // Auto-discover zone ID for 2100.cool if needed
        if (zones.length > 0) {
            const mainZone = zones.find(z => z.name === '2100.cool');
            if (mainZone) {
                console.log('4. Discovering zone ID for 2100.cool...');
                const zoneId = await cloudflareService.discoverZoneId('2100.cool');
                console.log('✅ Zone ID discovered and stored:', zoneId);
            } else {
                console.log('4. Domain 2100.cool not found in account zones');
            }
        }
        
        console.log('🎉 OAuth2 service test complete!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Service test failed:', error.message);
        process.exit(1);
    }
}

testCloudflareOAuth2();
