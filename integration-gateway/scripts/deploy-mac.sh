#!/bin/bash

# Import agent tracking utilities
source "$(dirname "$0")/../bin/agent-tracking.sh"

# Default agent ID if not set
AGENT_ID=${AGENT_ID:-"UNSPECIFIED_AGENT"}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print formatted messages
print_message() {
  local type=$1
  local message=$2
  
  case $type in
    "info")
      echo -e "${BLUE}[INFO]${NC} $message"
      ;;
    "success")
      echo -e "${GREEN}[SUCCESS]${NC} $message"
      ;;
    "warning")
      echo -e "${YELLOW}[WARNING]${NC} $message"
      ;;
    "error")
      echo -e "${RED}[ERROR]${NC} $message"
      ;;
  esac
}

# Detect operating system
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macos"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "linux"
  else
    echo "unknown"
  fi
}

OS=$(detect_os)
print_message "info" "Detected operating system: $OS"

log_agent_action "deploy_start" "Starting deployment process on $OS"

# Update packages based on OS
if [[ "$OS" == "macos" ]]; then
  print_message "info" "Checking Homebrew installation..."
  if ! command -v brew &> /dev/null; then
    print_message "warning" "Homebrew not found. You may want to install it for package management."
    print_message "info" "Visit https://brew.sh for installation instructions."
  else
    print_message "info" "Updating Homebrew packages..."
    log_agent_action "system_update" "Running brew update"
    brew update
    print_message "success" "Homebrew packages updated successfully."
  fi
elif [[ "$OS" == "linux" ]]; then
  print_message "info" "Updating system packages..."
  log_agent_action "system_update" "Running apt-get update"
  sudo apt-get update
  print_message "success" "System packages updated successfully."
else
  print_message "warning" "Unknown operating system. Skipping package updates."
fi

# Install Node.js dependencies
print_message "info" "Installing npm dependencies..."
log_agent_action "dependency_install" "Running npm install"
npm install
print_message "success" "npm dependencies installed successfully."

# Get the application directory
APP_DIR=$(pwd)
print_message "info" "Application directory: $APP_DIR"

# Setup service based on OS
if [[ "$OS" == "macos" ]]; then
  print_message "info" "Setting up launchd service for macOS..."
  log_agent_action "service_setup" "Creating LaunchAgent for macOS"
  
  # Create LaunchAgent directory if it doesn't exist
  LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
  mkdir -p "$LAUNCH_AGENTS_DIR"
  
  PLIST_FILE="$LAUNCH_AGENTS_DIR/com.aixtiv.warpdriveapi.plist"
  
  # Create the plist file
  cat > "$PLIST_FILE" << EOL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.aixtiv.warpdriveapi</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/npm</string>
        <string>start</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${APP_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>AGENT_ID</key>
        <string>${AGENT_ID}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>${HOME}/Library/Logs/warp-drive-api.log</string>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/warp-drive-api.log</string>
</dict>
</plist>
EOL
  
  # Load the LaunchAgent
  print_message "info" "Loading the LaunchAgent..."
  launchctl unload "$PLIST_FILE" 2>/dev/null
  launchctl load -w "$PLIST_FILE"
  
  print_message "success" "LaunchAgent created and loaded successfully."
  print_message "info" "Log file location: ${HOME}/Library/Logs/warp-drive-api.log"
  
elif [[ "$OS" == "linux" ]]; then
  print_message "info" "Setting up systemd service for Linux..."
  log_agent_action "service_setup" "Creating systemd service file"
  
  sudo tee /etc/systemd/system/warp-drive-api.service << EOL
[Unit]
Description=Warp Drive API Service
After=network.target

[Service]
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/npm start
Restart=always
User=root
Environment=GOOGLE_APPLICATION_CREDENTIALS=${APP_DIR}/service-account-key.json
Environment=AGENT_ID=${AGENT_ID}

[Install]
WantedBy=multi-user.target
EOL
  
  # Reload systemd and start service
  print_message "info" "Reloading systemd daemon..."
  log_agent_action "service_reload" "Reloading systemd daemon"
  sudo systemctl daemon-reload
  
  print_message "info" "Enabling warp-drive-api service..."
  log_agent_action "service_enable" "Enabling warp-drive-api service"
  sudo systemctl enable warp-drive-api
  
  print_message "info" "Restarting warp-drive-api service..."
  log_agent_action "service_restart" "Restarting warp-drive-api service"
  sudo systemctl restart warp-drive-api
  
  # Show service status
  print_message "info" "Checking warp-drive-api service status..."
  log_agent_action "service_status" "Checking warp-drive-api service status"
  systemctl status warp-drive-api
  
  print_message "success" "Systemd service setup complete."
else
  print_message "warning" "Unknown operating system. Skipping service setup."
  print_message "info" "You'll need to manually start the application with 'npm start'."
fi

# For macOS, provide option to run directly
if [[ "$OS" == "macos" ]]; then
  print_message "info" "You can also run the application directly using 'npm start' in the application directory."
  
  read -p "Would you like to start the application now? (y/n): " answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    print_message "info" "Starting the application..."
    npm start
  else
    print_message "info" "The application can be started later using 'npm start' or it will start automatically on system boot."
  fi
fi

log_agent_action "deploy_complete" "Deployment completed successfully on $OS"
print_message "success" "Deployment completed successfully on $OS!"

