#!/bin/bash

echo "==== 🛡 AI Secure Audit: macOS Security & Network Check ===="

# 1. List all active network interfaces
echo -e "\n🔌 Active Network Interfaces:"
ifconfig | grep -A1 "flags"

# 2. Check if any proxy settings are configured
echo -e "\n🌐 Proxy Configuration (System-wide):"
networksetup -listallnetworkservices | while read service; do
  if [[ "$service" != "" ]]; then
    echo "[$service]"
    networksetup -getwebproxy "$service"
    networksetup -getsecurewebproxy "$service"
    networksetup -getsocksfirewallproxy "$service"
    networksetup -getdnsservers "$service"
  fi
done

# 3. Show current DNS settings
echo -e "\n🧠 DNS Settings:"
scutil --dns | grep "nameserver\[[0-9]*\]"

# 4. Check for listening network ports and associated processes
echo -e "\n📡 Open Ports & Listening Services:"
sudo lsof -nP -iTCP -sTCP:LISTEN

# 5. List all login and launch agents/daemons
echo -e "\n🚀 Login Items and Launch Agents:"
echo "--- LaunchAgents (User):"
ls ~/Library/LaunchAgents
echo "--- LaunchAgents (System):"
ls /Library/LaunchAgents
echo "--- LaunchDaemons (System):"
ls /Library/LaunchDaemons

# 6. Check Kernel Extensions (KEXTs)
echo -e "\n🔩 Loaded Kernel Extensions (KEXTs):"
kextstat | grep -v com.apple

# 7. Show active Gatekeeper status
echo -e "\n🧷 Gatekeeper Status:"
spctl --status

# 8. Check for profiles (mobile device management or suspicious config profiles)
echo -e "\n🗂 Configuration Profiles:"
profiles list

echo -e "\n✅ Scan Complete. Please review any suspicious entries above."
echo "Tip: If you'd like a saved copy, run this with > secure_audit.txt at the end."

