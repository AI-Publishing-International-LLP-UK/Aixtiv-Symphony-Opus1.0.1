#!/bin/bash
echo "🛑 EMERGENCY NETWORK KILL ACTIVATED"

# Kill all network connections
sudo killall -9 node
sudo pkill -f "integration-gateway"

# Disable network interface temporarily
sudo ifconfig en0 down
sleep 5
sudo ifconfig en0 up

echo "✅ Network reset complete"
