// Test file for BaseGateway.js

const BaseGateway = require('./BaseGateway');

async function testGateway() {
    try {
        console.log('Testing BaseGateway...');
        
        // Create a new gateway instance
        const gateway = new BaseGateway();
        
        // Initialize the gateway
        await gateway.initialize();
        
        // Create a secure connection
        const connection = await gateway.createSecureConnection('https://api.example.com');
        
        // Get connection status
        const status = gateway.getConnectionStatus();
        console.log('Gateway Status:', status);
        
        // Process a health check request
        const healthResponse = await gateway.processRequest({ type: 'health_check' });
        console.log('Health Check Response:', healthResponse);
        
        // Shutdown the gateway
        await gateway.shutdown();
        
        console.log('BaseGateway test completed successfully');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testGateway();
