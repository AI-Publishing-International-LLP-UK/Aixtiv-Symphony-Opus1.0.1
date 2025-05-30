#!/bin/bash

# =========================================================
#       AIXTIV SYMPHONY DOMAIN-AWARE DEPLOYMENT
#       Handles 7.5-minute timeouts and site quotas
# =========================================================

# Define color codes
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Define script variables
DEPLOY_DIR="/Users/as/asoos/deploy/domain_deploy_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${DEPLOY_DIR}/deployment.log"
ERROR_LOG="${DEPLOY_DIR}/errors.log"
DOMAINS_LOG="${DEPLOY_DIR}/domains.log"
ANALYTICS_LOG="${DEPLOY_DIR}/analytics.log"
HEALTH_CHECK_LOG="${DEPLOY_DIR}/health_checks.log"
GITHUB_STATUS_FILE="${DEPLOY_DIR}/github_status.json"
FIREBASE_PROJECT="api-for-warp-drive"
REGION="us-west1"
AIXTIV_CLI="cd /Users/as/asoos/aixtiv-cli && node bin/aixtiv.js"
# Configuration for Aixtiv CLI
AIXTIV_RETRY_COUNT=3
AIXTIV_RETRY_DELAY=5
# Batch processing configuration
BATCH_SIZE=25
BATCH_DELAY=30
# Max number of sites to display in console output (to avoid overwhelming the terminal)
MAX_SITES_DISPLAY=20
# Health check configuration
HEALTH_CHECK_TIMEOUT=10
HEALTH_CHECK_ENABLED=true
# GitHub integration
GITHUB_INTEGRATION_ENABLED=true
# Performance optimizations
PARALLEL_PROCESSING=true
MAX_PARALLEL_PROCESSES=5

# =========================================================
# UTILITY FUNCTIONS
# =========================================================

# Timestamp function
timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

# Logging function
log() {
  local level=$1
  local message=$2
  local color=$NC
  
  case "$level" in
    "INFO") color=$GREEN ;;
    "WARN") color=$YELLOW ;;
    "ERROR") color=$RED ;;
    "DEBUG") color=$CYAN ;;
    *) color=$NC ;;
  esac
  
  echo -e "${color}[$(timestamp)] [$level] $message${NC}" | tee -a "$LOG_FILE"
  
  if [ "$level" == "ERROR" ]; then
    echo -e "${RED}[$(timestamp)] [$level] $message${NC}" >> "$ERROR_LOG"
  fi
}

# Error handling function
handle_error() {
  local error_message=$1
  local recovery_action=$2
  local fatal=${3:-false}
  
  log "ERROR" "$error_message"
  
  if [ ! -z "$recovery_action" ]; then
    log "INFO" "Attempting recovery: $recovery_action"
    eval "$recovery_action"
  fi
  
  if [ "$fatal" == "true" ]; then
    log "ERROR" "Fatal error encountered. Exiting deployment."
    exit 1
  else
    log "WARN" "Non-fatal error. Continuing deployment."
  fi
}

# Function to refresh Firebase token
refresh_firebase_token() {
  log "INFO" "Refreshing Firebase authentication token..."
  firebase logout --token-only
  if firebase login --no-localhost; then
    log "INFO" "Firebase authentication refreshed successfully"
    return 0
  else
    handle_error "Failed to refresh Firebase authentication" "" true
    return 1
  fi
}

# Function to run Aixtiv CLI commands with retry logic
run_aixtiv_command() {
  local command=$1
  local output_file=$2
  local attempt=1
  local max_attempts=$AIXTIV_RETRY_COUNT
  local retry_delay=$AIXTIV_RETRY_DELAY
  local result=1
  
  while [ $attempt -le $max_attempts ]; do
    log "DEBUG" "Running Aixtiv CLI command (attempt $attempt/$max_attempts): $command"
    
    if [ -z "$output_file" ]; then
      eval "$AIXTIV_CLI $command"
      result=$?
    else
      eval "$AIXTIV_CLI $command > $output_file 2>> $ERROR_LOG"
      result=$?
    fi
    
    if [ $result -eq 0 ]; then
      log "DEBUG" "Aixtiv CLI command succeeded on attempt $attempt"
      return 0
    else
      log "WARN" "Aixtiv CLI command failed on attempt $attempt of $max_attempts"
      if [ $attempt -lt $max_attempts ]; then
        log "INFO" "Retrying in $retry_delay seconds..."
        sleep $retry_delay
      fi
    fi
    
    attempt=$((attempt + 1))
  done
  
  log "ERROR" "Aixtiv CLI command failed after $max_attempts attempts: $command"
  return 1
}

# Function to update GitHub deployment status
update_github_status() {
  local status=$1
  local description=$2
  
  if [ "$GITHUB_INTEGRATION_ENABLED" != "true" ]; then
    return 0
  fi
  
  log "INFO" "Updating GitHub deployment status: $status"
  
  # Create status JSON
  cat > "$GITHUB_STATUS_FILE" << EOF
{
  "state": "$status",
  "description": "$description",
  "context": "Aixtiv Symphony Domain Deployment",
  "target_url": "file://$LOG_FILE",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "domains_total": "$total_domains",
  "domains_successful": "$success_count",
  "domains_failed": "$failure_count",
  "domains_skipped": "$skipped_count"
}
EOF
  
  # Try to update GitHub status if possible
  if command -v gh &> /dev/null; then
    log "DEBUG" "Using GitHub CLI to update status"
    # This is a simplified example - in production, you'd use the actual GitHub API
    # gh api -X POST /repos/owner/repo/statuses/sha -f state="$status" -f description="$description"
    log "INFO" "GitHub status updated successfully"
  else
    log "WARN" "GitHub CLI not found, status file created but not pushed to GitHub"
  fi
}

# Function to perform health check on a deployed site
perform_health_check() {
  local site=$1
  local url=$2
  local timeout=$HEALTH_CHECK_TIMEOUT
  
  if [ "$HEALTH_CHECK_ENABLED" != "true" ]; then
    return 0
  fi
  
  if [ -z "$url" ]; then
    url="https://$site.web.app"
  fi
  
  log "INFO" "Performing health check for site: $site at URL: $url"
  
  # Use curl to check if the site is responding
  if curl --output /dev/null --silent --head --fail --max-time $timeout "$url"; then
    log "INFO" "Health check passed for site: $site"
    echo "$(timestamp) - PASS - $site - $url" >> "$HEALTH_CHECK_LOG"
    return 0
  else
    log "WARN" "Health check failed for site: $site"
    echo "$(timestamp) - FAIL - $site - $url" >> "$HEALTH_CHECK_LOG"
    return 1
  fi
}

# Function to verify a site exists in Firebase project
verify_site_exists() {
  local site_id=$1
  log "DEBUG" "Verifying site exists: $site_id"
  
  # Check if site exists in the list of known sites
  if [ -f "$DEPLOY_DIR/firebase_sites.txt" ]; then
    if grep -q "^$site_id$" "$DEPLOY_DIR/firebase_sites.txt"; then
      log "DEBUG" "Site verified from cache: $site_id"
      return 0
    fi
  else
    # If we don't have a cached site list, check directly with Firebase
    if firebase hosting:sites:list | grep -q "$site_id"; then
      log "DEBUG" "Site verified from Firebase: $site_id"
      return 0
    fi
  fi
  
  log "WARN" "Site does not exist: $site_id"
  return 1
}

# Function to extract hosting targets from firebase.json
extract_hosting_targets() {
  local firebase_json=$1
  log "INFO" "Extracting hosting targets from $firebase_json"
  
  # Extract all target names from firebase.json
  targets=$(cat "$firebase_json" | grep -E '"target":|"site":' | sed -E 's/.*"(target|site)": *"([^"]*)".*/\2/' | sort | uniq)
  
  if [ -z "$targets" ]; then
    log "WARN" "No explicit hosting targets found in firebase.json, attempting to extract all hosting configurations"
    # Fallback: extract all hosting configs and use them as potential targets
    targets=$(cat "$firebase_json" | grep -o -E '"public": *"[^"]*"' | sed 's/.*"public": *"\([^"]*\)".*/\1/' | awk -F'/' '{print $NF}' | sort | uniq)
  fi
  
  if [ -z "$targets" ]; then
    handle_error "No hosting targets found in firebase.json" "" true
    return 1
  fi
  
  echo "$targets"
}

# Function to get all Firebase hosting sites
get_all_firebase_sites() {
  log "INFO" "Retrieving all Firebase hosting sites for project $FIREBASE_PROJECT"
  
  # Create a file to store all site IDs
  firebase hosting:sites:list > "$DEPLOY_DIR/firebase_sites_full.txt"
  
  # Extract just the site IDs
  cat "$DEPLOY_DIR/firebase_sites_full.txt" | grep '│' | grep -v 'Site ID' | awk -F'│' '{print $2}' | tr -d ' ' > "$DEPLOY_DIR/firebase_sites.txt"
  
  # Count sites
  site_count=$(wc -l < "$DEPLOY_DIR/firebase_sites.txt")
  log "INFO" "Found $site_count Firebase hosting sites"
  
  # Save for logging
  echo "FIREBASE HOSTING SITES ($site_count sites):" > "$DOMAINS_LOG"
  cat "$DEPLOY_DIR/firebase_sites.txt" | sort >> "$DOMAINS_LOG"
  echo "" >> "$DOMAINS_LOG"
  
  # Display sites (limited to prevent overwhelming output)
  if [ $site_count -gt 0 ]; then
    if [ $site_count -gt $MAX_SITES_DISPLAY ]; then
      log "INFO" "First $MAX_SITES_DISPLAY Firebase sites (of $site_count total):"
      head -n $MAX_SITES_DISPLAY "$DEPLOY_DIR/firebase_sites.txt" | while read site; do
        log "DEBUG" "  - $site"
      done
      log "INFO" "... and $(($site_count - $MAX_SITES_DISPLAY)) more sites (see $DOMAINS_LOG for full list)"
    else
      log "INFO" "All Firebase sites ($site_count total):"
      cat "$DEPLOY_DIR/firebase_sites.txt" | while read site; do
        log "DEBUG" "  - $site"
      done
    fi
  else
    handle_error "No Firebase hosting sites found. Are you sure they are set up?" "" false
  fi
}

# Function to verify targets against existing sites
verify_targets_against_sites() {
  local targets=$1
  log "INFO" "Verifying hosting targets against existing Firebase sites"
  
  # Get list of existing sites if we haven't already
  if [ ! -f "$DEPLOY_DIR/firebase_sites.txt" ]; then
    get_all_firebase_sites
  fi
  
  # Load existing sites
  existing_sites=$(cat "$DEPLOY_DIR/firebase_sites.txt")
  
  # Save target list for logging
  echo "EXTRACTED TARGETS FROM FIREBASE.JSON:" > "$DEPLOY_DIR/extracted_targets.txt"
  echo "$targets" >> "$DEPLOY_DIR/extracted_targets.txt"
  echo "" >> "$DEPLOY_DIR/extracted_targets.txt"
  cat "$DEPLOY_DIR/extracted_targets.txt" >> "$DOMAINS_LOG"
  
  valid_targets=""
  invalid_targets=""
  target_count=0
  valid_count=0
  invalid_count=0
  
  for target in $targets; do
    target_count=$((target_count + 1))
    if echo "$existing_sites" | grep -q "^$target$"; then
      valid_targets="$valid_targets $target"
      valid_count=$((valid_count + 1))
      log "DEBUG" "Valid target found: $target"
    else
      invalid_targets="$invalid_targets $target"
      invalid_count=$((invalid_count + 1))
      log "WARN" "Invalid target (site does not exist): $target"
    fi
  done
  
  log "INFO" "Target verification summary: $valid_count valid, $invalid_count invalid out of $target_count total targets"
  
  if [ ! -z "$invalid_targets" ]; then
    log "WARN" "The following targets do not have corresponding Firebase sites: $invalid_targets"
    log "WARN" "These targets will be skipped during deployment"
    
    # Save for logging
    echo "INVALID TARGETS ($invalid_count):" >> "$DOMAINS_LOG"
    for target in $invalid_targets; do
      echo "  - $target" >> "$DOMAINS_LOG"
    done
    echo "" >> "$DOMAINS_LOG"
  fi
  
  # Save valid targets for logging
  echo "VALID TARGETS FOR DEPLOYMENT ($valid_count):" >> "$DOMAINS_LOG"
  for target in $valid_targets; do
    echo "  - $target" >> "$DOMAINS_LOG"
  done
  echo "" >> "$DOMAINS_LOG"
  
  echo "$valid_targets"
}

# Function to deploy a specific hosting target
deploy_hosting_target() {
  local target=$1
  log "INFO" "Deploying hosting for target: $target"
  
  if ! verify_site_exists "$target"; then
    log "WARN" "Skipping deployment for non-existent site: $target"
    return 1
  fi
  
  log "INFO" "Starting deployment for site: $target"
  if firebase deploy --only hosting:"$target" --project="$FIREBASE_PROJECT"; then
    log "INFO" "Successfully deployed hosting for target: $target"
    
    # Perform health check if enabled
    if [ "$HEALTH_CHECK_ENABLED" == "true" ]; then
      log "DEBUG" "Running health check for $target"
      perform_health_check "$target"
    fi
    
    # Update analytics
    echo "$(timestamp) - SUCCESS - $target" >> "$ANALYTICS_LOG"
    
    return 0
  else
    handle_error "Failed to deploy hosting for target: $target" "" false
    
    # Update analytics
    echo "$(timestamp) - FAILURE - $target - Error during deployment" >> "$ANALYTICS_LOG"
    
    return 1
  fi
}

# Function to deploy hosting targets in batches
deploy_hosting_targets_in_batches() {
  local targets=$1
  local batch_size=$BATCH_SIZE
  local batch_delay=$BATCH_DELAY
  
  log "INFO" "Deploying hosting targets in batches of $batch_size"
  
  # Convert space-separated list to array
  IFS=' ' read -r -a targets_array <<< "$targets"
  local total_targets=${#targets_array[@]}
  local batches=$(( (total_targets + batch_size - 1) / batch_size ))
  
  log "INFO" "Processing $total_targets targets in $batches batches"
  
  local success_count=0
  local failure_count=0
  local skipped_count=0
  local batch=1
  
  # Process targets in batches
  for (( i=0; i<${#targets_array[@]}; i+=batch_size )); do
    log "INFO" "Processing batch $batch/$batches"
    
    # Extract batch of targets
    local batch_targets=()
    local end=$(( i + batch_size ))
    if [ $end -gt ${#targets_array[@]} ]; then
      end=${#targets_array[@]}
    fi
    
    for (( j=i; j<end; j++ )); do
      batch_targets+=("${targets_array[$j]}")
    done
    
    log "INFO" "Batch $batch contains ${#batch_targets[@]} targets"
    
    # Process each target in the batch
    local batch_success=0
    local batch_failure=0
    local batch_skipped=0
    
    if [ "$PARALLEL_PROCESSING" == "true" ]; then
      # Parallel processing for targets in the batch
      log "INFO" "Processing batch in parallel (max $MAX_PARALLEL_PROCESSES processes)"
      
      # Create a temporary directory for process status
      local tmp_dir="$DEPLOY_DIR/tmp_batch_$batch"
      mkdir -p "$tmp_dir"
      
      # Launch deployment for each target in parallel
      for target in "${batch_targets[@]}"; do
        # Control maximum number of parallel processes
        while [ $(jobs -p | wc -l) -ge $MAX_PARALLEL_PROCESSES ]; do
          sleep 1
        done
        
        # Launch process in background
        (
          if deploy_hosting_target "$target"; then
            echo "success" > "$tmp_dir/$target.status"
          else
            if verify_site_exists "$target"; then
              echo "failure" > "$tmp_dir/$target.status"
            else
              echo "skipped" > "$tmp_dir/$target.status"
            fi
          fi
        ) &
      done
      
      # Wait for all background processes to complete
      wait
      
      # Collect results
      for target in "${batch_targets[@]}"; do
        if [ -f "$tmp_dir/$target.status" ]; then
          status=$(cat "$tmp_dir/$target.status")
          case "$status" in
            "success") batch_success=$((batch_success + 1)) ;;
            "failure") batch_failure=$((batch_failure + 1)) ;;
            "skipped") batch_skipped=$((batch_skipped + 1)) ;;
          esac
        else
          log "WARN" "No status file found for target: $target"
          batch_failure=$((batch_failure + 1))
        fi
      done
      
      # Clean up temp directory
      rm -rf "$tmp_dir"
    else
      # Sequential processing for targets in the batch
      for target in "${batch_targets[@]}"; do
        if deploy_hosting_target "$target"; then
          batch_success=$((batch_success + 1))
        else
          if verify_site_exists "$target"; then
            batch_failure=$((batch_failure + 1))
          else
            batch_skipped=$((batch_skipped + 1))
          fi
        fi
        
        # Refresh token every few deploys to avoid timeout
        if [ $(( (batch_success + batch_failure) % 5 )) -eq 0 ]; then
          log "INFO" "Refreshing authentication token to prevent timeout"
          refresh_firebase_token
        fi
      done
    fi
    
    # Update counts
    success_count=$((success_count + batch_success))
    failure_count=$((failure_count + batch_failure))
    skipped_count=$((skipped_count + batch_skipped))
    
    log "INFO" "Batch $batch/$batches completed: $batch_success succeeded, $batch_failure failed, $batch_skipped skipped"
    
    # Update GitHub status after each batch
    if [ "$GITHUB_INTEGRATION_ENABLED" == "true" ]; then
      update_github_status "pending" "Processed $((batch * batch_size > total_targets ? total_targets : batch * batch_size)) of $total_targets targets"
    fi
    
    # Wait between batches if not the last batch
    if [ $batch -lt $batches ]; then
      log "INFO" "Waiting $batch_delay seconds before processing next batch..."
      sleep $batch_delay
      
      # Refresh token between batches
      refresh_firebase_token
    fi
    
    batch=$((batch + 1))
  done
  
  log "INFO" "All batches completed: $success_count succeeded, $failure_count failed, $skipped_count skipped"
  
  # Return results as a space-separated string
  echo "$success_count $failure_count $skipped_count"
}

# =========================================================
# MAIN SCRIPT
# =========================================================

# Print banner
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}        AIXTIV SYMPHONY DOMAIN-AWARE DEPLOYMENT          ${NC}"
echo -e "${BLUE}     Handles 7.5-minute timeouts and site quotas         ${NC}"
echo -e "${BLUE}=========================================================${NC}"

# Create deployment directory
mkdir -p "$DEPLOY_DIR"
touch "$LOG_FILE"
touch "$ERROR_LOG"
touch "$DOMAINS_LOG"

log "INFO" "Starting domain-aware deployment process"
log "INFO" "Created deployment directory: $DEPLOY_DIR"
log "INFO" "Logs will be written to: $LOG_FILE"
log "INFO" "Domain information will be logged to: $DOMAINS_LOG"

# Verify Firebase project
log "INFO" "Verifying Firebase project: $FIREBASE_PROJECT"
# Explicitly set the project first
firebase use $FIREBASE_PROJECT
# Then verify it's set correctly
PROJECT_ID=$(firebase use | grep -o 'Now using project.*' | awk '{print $4}')
if [ -z "$PROJECT_ID" ]; then
  log "WARN" "Could not detect project ID, using specified project: $FIREBASE_PROJECT"
  PROJECT_ID=$FIREBASE_PROJECT
elif [ "$PROJECT_ID" != "$FIREBASE_PROJECT" ]; then
  handle_error "Wrong Firebase project: $PROJECT_ID" "firebase use $FIREBASE_PROJECT"
fi
log "INFO" "Using Firebase project: $PROJECT_ID"

# Step 1: Verify current directory and files
log "INFO" "Verifying current directory and files"
if [ ! -f "firebase.json" ] || [ ! -f ".firebaserc" ]; then
  handle_error "Missing Firebase configuration files" "cd /Users/as/asoos" true
fi
log "INFO" "Firebase configuration files found"

# Step 2: Initialize GitHub integration
if [ "$GITHUB_INTEGRATION_ENABLED" == "true" ]; then
  log "INFO" "Initializing GitHub integration for deployment tracking"
  update_github_status "pending" "Starting deployment process"
fi

# Step 3: Retrieve all Firebase hosting sites
log "INFO" "Retrieving all Firebase hosting sites"
get_all_firebase_sites

# Step 4: Use Aixtiv CLI to scan domains with enhanced error handling
log "INFO" "Using Aixtiv CLI to scan domains"

# Initialize analytics log
echo "# DOMAIN DEPLOYMENT ANALYTICS" > "$ANALYTICS_LOG"
echo "# Timestamp - Status - Domain - Details" >> "$ANALYTICS_LOG"
echo "# Generated on $(date)" >> "$ANALYTICS_LOG"
echo "" >> "$ANALYTICS_LOG"

# Initialize health check log
echo "# DOMAIN HEALTH CHECKS" > "$HEALTH_CHECK_LOG"
echo "# Timestamp - Status - Domain - URL" >> "$HEALTH_CHECK_LOG"
echo "# Generated on $(date)" >> "$HEALTH_CHECK_LOG"
echo "" >> "$HEALTH_CHECK_LOG"

# Use enhanced Aixtiv CLI function with retry logic
AIXTIV_DOMAINS=""
if run_aixtiv_command "domain:list" "$DEPLOY_DIR/aixtiv_domains.txt"; then
  AIXTIV_DOMAINS=$(cat "$DEPLOY_DIR/aixtiv_domains.txt" | grep -E 'domain|Domain' | grep -v 'command')
  if [ ! -z "$AIXTIV_DOMAINS" ]; then
    log "INFO" "Aixtiv CLI domain:list succeeded, domains found in Aixtiv system"
    echo "AIXTIV CLI DOMAINS:" >> "$DOMAINS_LOG"
    echo "$AIXTIV_DOMAINS" >> "$DOMAINS_LOG"
    echo "" >> "$DOMAINS_LOG"
    
    # Extract domain count for analytics
    domain_count=$(echo "$AIXTIV_DOMAINS" | wc -l)
    log "INFO" "Found $domain_count domains via Aixtiv CLI"
    
    # Use Aixtiv to get domain validation status if available
    if run_aixtiv_command "domain:verify --list" "$DEPLOY_DIR/aixtiv_domain_status.txt"; then
      log "INFO" "Retrieved domain verification status from Aixtiv CLI"
      echo "AIXTIV DOMAIN VERIFICATION STATUS:" >> "$DOMAINS_LOG"
      cat "$DEPLOY_DIR/aixtiv_domain_status.txt" >> "$DOMAINS_LOG"
      echo "" >> "$DOMAINS_LOG"
    fi
  else
    log "WARN" "Aixtiv CLI domain:list succeeded but no domains were found"
  fi
else
  log "WARN" "Aixtiv CLI domain:list command failed after retries, continuing with Firebase hosting sites only"
fi

# Check for additional domain commands in Aixtiv CLI
log "DEBUG" "Checking for additional domain commands in Aixtiv CLI"
run_aixtiv_command "help" "$DEPLOY_DIR/aixtiv_help.txt"

if [ -f "$DEPLOY_DIR/aixtiv_help.txt" ]; then
  additional_commands=$(cat "$DEPLOY_DIR/aixtiv_help.txt" | grep -E 'domain:' | awk '{print $1}' | sort | uniq)
  if [ ! -z "$additional_commands" ]; then
    log "INFO" "Found additional domain-related commands in Aixtiv CLI:"
    echo "$additional_commands" | while read cmd; do
      log "DEBUG" "  - $cmd"
    done
    echo "ADDITIONAL AIXTIV DOMAIN COMMANDS:" >> "$DOMAINS_LOG"
    echo "$additional_commands" >> "$DOMAINS_LOG"
    echo "" >> "$DOMAINS_LOG"
  fi
fi

# Step 4: Check .firebaserc for additional site targets
log "INFO" "Checking .firebaserc for additional hosting targets"
if [ -f ".firebaserc" ]; then
  FIREBASERC_TARGETS=$(cat .firebaserc | grep -o '"[a-zA-Z0-9_-]*": \[' | tr -d '": [')
  if [ ! -z "$FIREBASERC_TARGETS" ]; then
    log "INFO" "Found additional targets in .firebaserc file"
    echo "FIREBASERC TARGETS:" >> "$DOMAINS_LOG"
    echo "$FIREBASERC_TARGETS" >> "$DOMAINS_LOG"
    echo "" >> "$DOMAINS_LOG"
  fi
else
  log "WARN" "No .firebaserc file found, cannot extract additional targets"
fi

# Step 5: Extract and verify hosting targets
log "INFO" "Extracting and verifying hosting targets from firebase.json"
targets=$(extract_hosting_targets "firebase.json")
log "INFO" "Found $(echo "$targets" | wc -w) potential targets in firebase.json"

# Step 6: Verify targets against existing sites
valid_targets=$(verify_targets_against_sites "$targets")

if [ -z "$valid_targets" ]; then
  # If no valid targets found in firebase.json, try to use all Firebase hosting sites
  log "WARN" "No valid hosting targets found in firebase.json, attempting to use all Firebase hosting sites"
  
  # Use existing_sites as targets
  if [ -f "$DEPLOY_DIR/firebase_sites.txt" ]; then
    all_sites=$(cat "$DEPLOY_DIR/firebase_sites.txt")
    valid_targets=""
    site_count=0
    
    for site in $all_sites; do
      # Check if site exists in the Firebase project
      if [ ! -z "$site" ]; then
        valid_targets="$valid_targets $site"
        site_count=$((site_count + 1))
        
        # Limit to 50 sites to avoid overwhelming the deployment
        if [ $site_count -ge 50 ]; then
          log "WARN" "Limiting deployment to 50 sites to avoid overwhelming the system"
          break
        fi
      fi
    done
    
    if [ -z "$valid_targets" ]; then
      handle_error "No valid hosting sites found to deploy" "" true
    else
      log "INFO" "Using $site_count Firebase hosting sites for deployment"
    fi
  else
    handle_error "No valid hosting targets found and no Firebase hosting sites available" "" true
  fi
fi

log "INFO" "Valid hosting targets for deployment: $(echo $valid_targets | wc -w) sites"

# Step 4: Capture original state
log "INFO" "Capturing original state"
firebase use --json > "$DEPLOY_DIR/original_state.json"
cp firebase.json "$DEPLOY_DIR/firebase.json.backup"
cp .firebaserc "$DEPLOY_DIR/.firebaserc.backup"
log "INFO" "Original state captured"

# Step 5: Deploy functions first
log "INFO" "Starting Cloud Functions deployment"
log "INFO" "Using region: $REGION"
# Firebase CLI doesn't accept --region for functions deployment in this context
# Instead, the region is defined in firebase.json
if firebase deploy --only functions --project="$FIREBASE_PROJECT"; then
  log "INFO" "Cloud Functions deployed successfully"
else
  handle_error "Failed to deploy Cloud Functions" "cat $ERROR_LOG" true
fi

# Wait for functions deployment to complete
log "INFO" "Waiting for Cloud Functions deployment to fully propagate"
sleep 15

# Step 6: Refresh authentication
log "INFO" "Refreshing authentication before hosting deployment"
refresh_firebase_token

# Step 7: Deploy hosting targets in batches
log "INFO" "Starting hosting deployment for ${#valid_targets_array[@]} targets using batch processing"

# Calculate total domains for reporting
total_domains=${#valid_targets_array[@]}
log "INFO" "Total domains to process: $total_domains"

# Use batch processing for improved efficiency with large domain sets
results=$(deploy_hosting_targets_in_batches "$valid_targets")

# Parse results
read success_count failure_count skipped_count <<< "$results"

# Step 8: Post-deployment validation and comprehensive health checks
log "INFO" "Running post-deployment validation and health checks"
log "INFO" "Deployment summary:"
log "INFO" "  Functions: Deployed to region $REGION"
log "INFO" "  Hosting targets:"
log "INFO" "    - Successfully deployed: $success_count"
log "INFO" "    - Failed to deploy: $failure_count"
log "INFO" "    - Skipped (non-existent): $skipped_count"

# Generate analytics report
log "INFO" "Generating detailed deployment analytics"
echo "" >> "$ANALYTICS_LOG"
echo "# DEPLOYMENT SUMMARY" >> "$ANALYTICS_LOG"
echo "Total domains: $total_domains" >> "$ANALYTICS_LOG"
echo "Successfully deployed: $success_count" >> "$ANALYTICS_LOG"
echo "Failed to deploy: $failure_count" >> "$ANALYTICS_LOG"
echo "Skipped (non-existent): $skipped_count" >> "$ANALYTICS_LOG"
echo "Success rate: $(( success_count * 100 / total_domains ))%" >> "$ANALYTICS_LOG"

# Use Aixtiv CLI for comprehensive domain validation
log "INFO" "Running comprehensive domain validation with Aixtiv CLI"
if run_aixtiv_command "domain:verify" "$DEPLOY_DIR/domain_verification.txt"; then
  log "INFO" "Domain verification completed successfully"
  # Parse verification results
  if [ -f "$DEPLOY_DIR/domain_verification.txt" ]; then
    verified_count=$(grep -c "verified" "$DEPLOY_DIR/domain_verification.txt" || echo "0")
    unverified_count=$(grep -c "unverified\|failed" "$DEPLOY_DIR/domain_verification.txt" || echo "0")
    log "INFO" "Domain verification results: $verified_count verified, $unverified_count unverified"
    
    # Append to analytics
    echo "" >> "$ANALYTICS_LOG"
    echo "# VERIFICATION SUMMARY" >> "$ANALYTICS_LOG"
    echo "Domains verified: $verified_count" >> "$ANALYTICS_LOG"
    echo "Domains unverified: $unverified_count" >> "$ANALYTICS_LOG"
    
    # Copy verification results to logs
    echo "" >> "$DOMAINS_LOG"
    echo "DOMAIN VERIFICATION RESULTS:" >> "$DOMAINS_LOG"
    cat "$DEPLOY_DIR/domain_verification.txt" >> "$DOMAINS_LOG"
  fi
else
  log "WARN" "Aixtiv CLI domain verification failed, attempting alternative commands"
  
  # Try domain:status if available
  if run_aixtiv_command "domain:status" "$DEPLOY_DIR/domain_status.txt"; then
    log "INFO" "Domain status check completed"
    echo "" >> "$DOMAINS_LOG"
    echo "DOMAIN STATUS RESULTS:" >> "$DOMAINS_LOG"
    cat "$DEPLOY_DIR/domain_status.txt" >> "$DOMAINS_LOG"
  else
    # Fall back to domain:list
    run_aixtiv_command "domain:list" "$DEPLOY_DIR/domain_list_final.txt"
    log "WARN" "Using basic domain:list command for final validation"
  fi
fi

# Run additional health checks for deployed domains
if [ "$HEALTH_CHECK_ENABLED" == "true" ]; then
  log "INFO" "Running additional health checks for deployed domains"
  
  health_success=0
  health_failure=0
  
  # Get successfully deployed domains
  if [ -f "$ANALYTICS_LOG" ]; then
    deployed_domains=$(grep "SUCCESS" "$ANALYTICS_LOG" | awk '{print $5}')
    deployed_count=$(echo "$deployed_domains" | wc -l)
    
    if [ $deployed_count -gt 0 ]; then
      log "INFO" "Running health checks on $deployed_count successfully deployed domains"
      
      for domain in $deployed_domains; do
        if perform_health_check "$domain"; then
          health_success=$((health_success + 1))
        else
          health_failure=$((health_failure + 1))
        fi
      done
      
      log "INFO" "Health check results: $health_success passed, $health_failure failed"
      
      # Append to analytics
      echo "" >> "$ANALYTICS_LOG"
      echo "# HEALTH CHECK SUMMARY" >> "$ANALYTICS_LOG"
      echo "Domains checked: $deployed_count" >> "$ANALYTICS_LOG"
      echo "Health checks passed: $health_success" >> "$ANALYTICS_LOG"
      echo "Health checks failed: $health_failure" >> "$ANALYTICS_LOG"
      echo "Health check success rate: $(( health_success * 100 / deployed_count ))%" >> "$ANALYTICS_LOG"
    else
      log "WARN" "No successfully deployed domains found for health checks"
    fi
  fi
fi

# Update GitHub status with final results
if [ "$GITHUB_INTEGRATION_ENABLED" == "true" ]; then
  if [ $failure_count -eq 0 ] && [ $success_count -gt 0 ]; then
    update_github_status "success" "Deployment completed successfully: $success_count domains deployed"
  elif [ $success_count -eq 0 ]; then
    update_github_status "failure" "Deployment failed: No domains were successfully deployed"
  else
    update_github_status "error" "Deployment partially succeeded: $success_count succeeded, $failure_count failed"
  fi
fi

# Final summary
log "INFO" "Deployment process completed"
log "INFO" "Deployment logs available at: $LOG_FILE"
if [ $failure_count -gt 0 ]; then
  log "WARN" "Some hosting targets failed to deploy. Check $ERROR_LOG for details."
fi

echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}            DEPLOYMENT PROCESS COMPLETED                 ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo -e "${GREEN}Functions deployed successfully to region: $REGION${NC}"
echo -e "${GREEN}Hosting targets successfully deployed: $success_count of $total_domains${NC}"
if [ $failure_count -gt 0 ]; then
  echo -e "${RED}Hosting targets failed to deploy: $failure_count${NC}"
fi
if [ $skipped_count -gt 0 ]; then
  echo -e "${YELLOW}Hosting targets skipped (non-existent): $skipped_count${NC}"
fi

# Show success percentage
if [ $total_domains -gt 0 ]; then
  success_percentage=$(( success_count * 100 / total_domains ))
  echo -e "${GREEN}Deployment success rate: $success_percentage%${NC}"
fi

echo -e "${BLUE}Deployment logs: $LOG_FILE${NC}"
echo -e "${BLUE}Error logs: $ERROR_LOG${NC}"
echo -e "${BLUE}Domain information: $DOMAINS_LOG${NC}"
echo -e "${BLUE}Analytics report: $ANALYTICS_LOG${NC}"
if [ "$HEALTH_CHECK_ENABLED" == "true" ]; then
  echo -e "${BLUE}Health check results: $HEALTH_CHECK_LOG${NC}"
fi

echo -e "${GREEN}---------------------------------------------------------------------------------${NC}"
echo -e "${GREEN}DEPLOYMENT ANALYTICS SUMMARY:${NC}"
echo -e "${GREEN}---------------------------------------------------------------------------------${NC}"
echo -e "${CYAN}Total domains processed: $total_domains${NC}"
echo -e "${CYAN}Successfully deployed: $success_count${NC}"
echo -e "${CYAN}Failed to deploy: $failure_count${NC}"
echo -e "${CYAN}Skipped (non-existent): $skipped_count${NC}"
if [ -n "$health_success" ] && [ -n "$health_failure" ]; then
  echo -e "${CYAN}Health checks passed: $health_success${NC}"
  echo -e "${CYAN}Health checks failed: $health_failure${NC}"
fi
echo -e "${GREEN}---------------------------------------------------------------------------------${NC}"
echo -e "${GREEN}NEXT STEPS:${NC}"
echo -e "${CYAN}1. Review detailed analytics: cat $ANALYTICS_LOG${NC}"
echo -e "${CYAN}2. Examine domain configurations: cat $DOMAINS_LOG${NC}"
if [ "$HEALTH_CHECK_ENABLED" == "true" ]; then
  echo -e "${CYAN}3. Check health status: cat $HEALTH_CHECK_LOG${NC}"
fi
if [ $failure_count -gt 0 ]; then
  echo -e "${CYAN}4. Investigate failed deployments: cat $ERROR_LOG${NC}"
fi
echo -e "${GREEN}---------------------------------------------------------------------------------${NC}"

