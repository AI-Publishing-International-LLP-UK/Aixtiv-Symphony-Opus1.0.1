#!/usr/bin/env node

/**
 * Integration Gateway Service Restart Validation
 * 
 * This script validates that the Integration Gateway can properly restart
 * with the SallyPort-Cloudflare bridge configuration enabled.
 */

require('dotenv').config();

const validationTests = [
    {
        name: 'Environment Configuration',
        test: () => process.env.NODE_ENV !== undefined,
        message: 'NODE_ENV is configured'
    },
    {
        name: 'Cloudflare Tunnel Enabled',
        test: () => process.env.CLOUDFLARE_TUNNEL_ENABLED === 'true',
        message: 'CLOUDFLARE_TUNNEL_ENABLED=true ✓'
    },
    {
        name: 'SallyPort Cloudflare Integration',
        test: () => process.env.SALLYPORT_CLOUDFLARE_ENABLED === 'true', 
        message: 'SALLYPORT_CLOUDFLARE_ENABLED=true ✓'
    },
    {
        name: 'Tunnel Configuration',
        test: () => process.env.CLOUDFLARE_TUNNEL_NAME && process.env.CLOUDFLARE_TUNNEL_PROTOCOL,
        message: `Tunnel: ${process.env.CLOUDFLARE_TUNNEL_NAME} (${process.env.CLOUDFLARE_TUNNEL_PROTOCOL}) ✓`
    },
    {
        name: 'Security Settings',
        test: () => process.env.CLOUDFLARE_SECURITY_LEVEL && process.env.CLOUDFLARE_CHALLENGE_TTL,
        message: `Security Level: ${process.env.CLOUDFLARE_SECURITY_LEVEL}, Challenge TTL: ${process.env.CLOUDFLARE_CHALLENGE_TTL}s ✓`
    },
    {
        name: 'SallyPort Bridge Mode',
        test: () => process.env.SALLYPORT_BRIDGE_ENABLED === 'true' && process.env.SALLYPORT_BRIDGE_MODE,
        message: `Bridge Mode: ${process.env.SALLYPORT_BRIDGE_MODE} ✓`
    },
    {
        name: 'Service Port Configuration',
        test: () => process.env.PORT || process.env.PORT === '8080',
        message: `Service Port: ${process.env.PORT || 8080} ✓`
    }
];

console.log('🔧 Integration Gateway Service Restart Validation');
console.log('================================================');
console.log('');

let allPassed = true;

validationTests.forEach((test, index) => {
    const passed = test.test();
    const status = passed ? '✅' : '❌';
    
    console.log(`${index + 1}. ${status} ${test.name}`);
    if (passed) {
        console.log(`   ${test.message}`);
    } else {
        console.log(`   Failed: ${test.name}`);
        allPassed = false;
    }
    console.log('');
});

console.log('================================================');
if (allPassed) {
    console.log('🎉 ALL VALIDATIONS PASSED!');
    console.log('');
    console.log('✅ SallyPort-Cloudflare bridge configuration is complete');
    console.log('✅ Integration Gateway is ready for restart');
    console.log('✅ Cloudflare routing and security settings are configured');
    console.log('');
    console.log('🚀 Ready to restart Integration Gateway service with new settings!');
    process.exit(0);
} else {
    console.log('❌ SOME VALIDATIONS FAILED!');
    console.log('Please check the configuration and fix any issues before restarting.');
    process.exit(1);
}
