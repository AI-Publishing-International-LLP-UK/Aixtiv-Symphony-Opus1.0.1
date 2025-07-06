#!/bin/bash

# Integration Gateway Service Restart Script
# This script demonstrates how to restart the Integration Gateway service
# with the new SallyPort-Cloudflare bridge configuration

echo "🔧 Integration Gateway Service Restart"
echo "====================================="
echo ""

# Validate configuration first
echo "📋 Step 1: Validating configuration..."
if node validate-restart.js; then
    echo "✅ Configuration validation passed!"
else
    echo "❌ Configuration validation failed!"
    echo "Please check your .env file and try again."
    exit 1
fi

echo ""
echo "🛑 Step 2: Stopping existing service (if running)..."
# Kill any existing node processes for this service
pkill -f "node.*server.js" || echo "No existing service found"
pkill -f "node.*vision_lake_server.js" || echo "No existing vision lake server found"

echo ""
echo "🚀 Step 3: Starting Integration Gateway with new settings..."
echo "   - Cloudflare Tunnel: ENABLED"
echo "   - SallyPort Integration: ENABLED"
echo "   - Security Level: HIGH"
echo "   - Bridge Mode: SECURE"
echo ""

# Start the service in background
nohup node server.js > service.log 2>&1 &
SERVICE_PID=$!

# Wait a moment for startup
sleep 2

# Check if service started successfully
if ps -p $SERVICE_PID > /dev/null; then
    echo "✅ Integration Gateway started successfully!"
    echo "   Process ID: $SERVICE_PID"
    echo "   Log file: service.log"
    echo "   Service URL: http://localhost:8080"
    echo ""
    echo "🔍 Service endpoints:"
    echo "   Health Check: http://localhost:8080/health"
    echo "   Region Info: http://localhost:8080/region-info"
    echo "   MCP Discovery: http://localhost:8080/.well-known/mcp"
    echo ""
    echo "🎉 Service restart completed successfully!"
else
    echo "❌ Failed to start Integration Gateway service"
    echo "Check service.log for error details"
    exit 1
fi
