#!/bin/bash

# =========================================================
#       AIXTIV SYMPHONY OPTIMIZED DEPLOYMENT SCRIPT
#          WITH TIMEOUT FIX - SPLIT DEPLOYMENT
# =========================================================

# Define color codes
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamp function
timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

# Error handling function
handle_error() {
  local error_message=$1
  local recovery_action=$2
  echo -e "${RED}[$(timestamp)] ERROR: $error_message${NC}"
  
  if [ ! -z "$recovery_action" ]; then
    echo -e "${YELLOW}[$(timestamp)] Attempting recovery: $recovery_action${NC}"
    eval "$recovery_action"
  fi
  
  # Prompt user for what to do next
  echo -e "${YELLOW}[$(timestamp)] Deployment encountered an error.${NC}"
  echo -e "Options:"
  echo -e "  1. Continue anyway (may result in partial deployment)"
  echo -e "  2. Abort deployment"
  
  read -p "Enter choice (1 or 2): " choice
  
  if [ "$choice" != "1" ]; then
    echo -e "${RED}[$(timestamp)] Deployment aborted by user.${NC}"
    exit 1
  else
    echo -e "${YELLOW}[$(timestamp)] Continuing despite error...${NC}"
  fi
}

# Function to refresh Firebase token
refresh_firebase_token() {
  echo -e "${YELLOW}[$(timestamp)] Refreshing Firebase authentication token...${NC}"
  firebase logout
  firebase login --no-localhost
}

# Log start of deployment
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}             AIXTIV SYMPHONY DEPLOYMENT                  ${NC}"
echo -e "${BLUE}             WITH TIMEOUT FIX - SPLIT DEPLOYMENT         ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo -e "${YELLOW}[$(timestamp)] Starting optimized deployment process${NC}"

# Create deployment directory with timestamp
DEPLOY_DIR="/Users/as/asoos/deploy/fixed_asoos_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/public"
mkdir -p "$DEPLOY_DIR/functions"

echo -e "${GREEN}[$(timestamp)] Created deployment directory: $DEPLOY_DIR${NC}"

# Verify we're in the correct project
echo -e "${YELLOW}[$(timestamp)] Verifying Firebase project...${NC}"
PROJECT_ID=$(firebase use --json | jq -r '.current')
if [ "$PROJECT_ID" != "api-for-warp-drive" ]; then
  handle_error "Wrong Firebase project: $PROJECT_ID" "firebase use api-for-warp-drive"
fi
echo -e "${GREEN}[$(timestamp)] Using Firebase project: $PROJECT_ID${NC}"

# Capture original state
echo -e "${YELLOW}[$(timestamp)] Capturing original state...${NC}"
firebase use --json > "$DEPLOY_DIR/original_state.json"
cp "$DEPLOY_DIR/original_state.json" "$DEPLOY_DIR/original_state.backup.json"
echo -e "${GREEN}[$(timestamp)] Original state captured${NC}"

# Stage files for deployment
echo -e "${YELLOW}[$(timestamp)] Staging deployment files...${NC}"

# Copy necessary files to the deployment directory
cp -r /Users/as/asoos/functions/* "$DEPLOY_DIR/functions/"
cp -r /Users/as/asoos/public/* "$DEPLOY_DIR/public/"
cp /Users/as/asoos/firebase.json "$DEPLOY_DIR/"
cp /Users/as/asoos/.firebaserc "$DEPLOY_DIR/"

echo -e "${GREEN}[$(timestamp)] Files staged for deployment${NC}"

# Install dependencies in the functions directory
echo -e "${YELLOW}[$(timestamp)] Installing dependencies for Cloud Functions...${NC}"
cd "$DEPLOY_DIR/functions"
npm install firebase-admin firebase-functions --save

# Verify dependencies installation
if [ ! -d "node_modules" ] || [ ! -d "node_modules/firebase-admin" ] || [ ! -d "node_modules/firebase-functions" ]; then
  handle_error "Dependencies installation failed" "echo 'Attempting to install dependencies again'; npm install"
else
  echo -e "${GREEN}[$(timestamp)] Dependencies installed successfully${NC}"
fi

# Return to the deployment directory
cd "$DEPLOY_DIR"

# Create deployment script
cat > "$DEPLOY_DIR/deploy.sh" << 'EOF'
#!/bin/bash

# Define color codes
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timestamp function
timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

# Error handling function
handle_error() {
  local error_message=$1
  local recovery_action=$2
  echo -e "${RED}[$(timestamp)] ERROR: $error_message${NC}"
  
  if [ ! -z "$recovery_action" ]; then
    echo -e "${YELLOW}[$(timestamp)] Attempting recovery: $recovery_action${NC}"
    eval "$recovery_action"
  fi
  
  echo -e "${RED}[$(timestamp)] Deployment failed${NC}"
  exit 1
}

# Save original state
ORIGINAL_STATE="original_state.json"

# Verify we're in the correct directory
cd "$(dirname "$0")" || handle_error "Could not change to script directory"

# Validate deployment files before proceeding
echo -e "${YELLOW}[$(timestamp)] Validating deployment files...${NC}"
if [ ! -d "functions" ] || [ ! -d "public" ] || [ ! -f "firebase.json" ]; then
  handle_error "Missing required deployment files" "echo 'Check for functions/, public/ directories and firebase.json'"
  exit 1
fi

# Verify dependencies in the functions directory
echo -e "${YELLOW}[$(timestamp)] Verifying functions dependencies...${NC}"
cd functions
if [ ! -d "node_modules" ] || [ ! -d "node_modules/firebase-admin" ] || [ ! -d "node_modules/firebase-functions" ]; then
  echo -e "${YELLOW}[$(timestamp)] Dependencies missing, installing...${NC}"
  npm install firebase-admin firebase-functions --save
  if [ $? -ne 0 ]; then
    handle_error "Failed to install Firebase dependencies" "echo 'Try running npm install manually in the functions directory'"
    exit 1
  fi
fi
cd ..

# Verify Firebase CLI and dependencies
echo -e "${YELLOW}[$(timestamp)] Verifying Firebase CLI...${NC}"
if ! command -v firebase &> /dev/null; then
  handle_error "Firebase CLI not found" "echo 'Install Firebase CLI with: npm install -g firebase-tools'"
  exit 1
fi

# Show Firebase CLI version
firebase --version

# Dry run to verify deployment
echo -e "${YELLOW}[$(timestamp)] Verifying functions deployment...${NC}"
if ! firebase deploy --only functions --dry-run; then
  handle_error "Functions deployment verification failed" "echo 'No functions have been deployed'"
  exit 1
fi

# Deploy functions first
echo -e "${YELLOW}[$(timestamp)] Deploying Cloud Functions...${NC}"
if ! firebase deploy --only functions; then
  handle_error "Functions deployment failed" "echo 'Attempting to restore from $ORIGINAL_STATE' && cat $ORIGINAL_STATE"
  exit 1
fi

echo -e "${GREEN}[$(timestamp)] Functions deployed successfully${NC}"

# Small delay to ensure functions are fully deployed
echo -e "${YELLOW}[$(timestamp)] Waiting for functions deployment to complete...${NC}"
sleep 10

# Re-authenticate to refresh token before hosting deployment
echo -e "${YELLOW}[$(timestamp)] Refreshing authentication for hosting deployment...${NC}"
if ! firebase logout && firebase login --no-localhost; then
  echo -e "${YELLOW}[$(timestamp)] Authentication refresh failed, attempting to continue with existing token...${NC}"
fi

# Verify hosting deployment
echo -e "${YELLOW}[$(timestamp)] Verifying hosting deployment...${NC}"
if ! firebase deploy --only hosting --dry-run; then
  handle_error "Hosting deployment verification failed" "echo 'No hosting changes have been deployed'"
  exit 1
fi

# Deploy hosting
echo -e "${YELLOW}[$(timestamp)] Deploying hosting...${NC}"
if ! firebase deploy --only hosting; then
  handle_error "Hosting deployment failed" "echo 'Functions were deployed but hosting failed.'"
  exit 1
fi

echo -e "${GREEN}[$(timestamp)] All components deployed successfully!${NC}"
echo -e "Access at:"
echo -e "- Main site: https://asoos-2100-cool.web.app"
echo -e "- Symphony: https://symphony-asoos-2100.web.app"
echo -e "- Anthology: https://anthology-asoos-2100.web.app"

# Cleanup
rm -f original_state.json
EOF

# Make the deployment script executable
chmod +x "$DEPLOY_DIR/deploy.sh"

# Display instructions to execute the deployment
echo -e "${GREEN}[$(timestamp)] Deployment prepared successfully${NC}"
echo -e "${YELLOW}To execute the deployment:${NC}"
echo -e "  cd $DEPLOY_DIR"
echo -e "  ./deploy.sh"
echo -e ""
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}       FIXED DEPLOYMENT SCRIPT CREATED SUCCESSFULLY      ${NC}"
echo -e "${BLUE}=========================================================${NC}"

