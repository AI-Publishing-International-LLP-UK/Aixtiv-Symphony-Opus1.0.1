#!/bin/bash

# deploy_all_batches.sh
# Script to deploy all domain batches to Firebase with delays between batches
# This script processes batch1.txt through batch25.txt sequentially

# Directory where the script and batch files are located
DIR="/Users/as/asoos/domain-management"
cd "$DIR" || { echo "Error: Cannot change to directory $DIR"; exit 1; }

# Log file for recording all operations
LOG_FILE="$DIR/batch_deployment_$(date +%Y%m%d_%H%M%S).log"

# Get delay time from .env file or use default 15 minutes
if [ -f "$DIR/.env" ]; then
    DELAY_MINUTES=$(grep BATCH_DELAY_MINUTES "$DIR/.env" | cut -d '=' -f2 | tr -d ' ')
    # Default to 15 minutes if not found or invalid
    if [[ ! "$DELAY_MINUTES" =~ ^[0-9]+$ ]]; then
        DELAY_MINUTES=15
    fi
else
    DELAY_MINUTES=15
fi

echo "===== Domain Batch Deployment Started at $(date) =====" | tee -a "$LOG_FILE"
echo "Using $DELAY_MINUTES minute delay between batches" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Count of successful and failed deployments
SUCCESS_COUNT=0
FAIL_COUNT=0

# Fetch GoDaddy API credentials from GCP Secret Manager
echo "Fetching GoDaddy API credentials from GCP Secret Manager..." | tee -a "$LOG_FILE"
GODADDY_CREDENTIALS=$(gcloud secrets versions access latest --secret="godaddy_api")

if [ -z "$GODADDY_CREDENTIALS" ]; then
    echo "Error: Failed to retrieve GoDaddy API credentials from GCP Secret Manager" | tee -a "$LOG_FILE"
    exit 1
fi

# Split the credentials from format "key:secret" into separate variables
export GODADDY_API_KEY=$(echo "$GODADDY_CREDENTIALS" | cut -d ':' -f 1)
export GODADDY_API_SECRET=$(echo "$GODADDY_CREDENTIALS" | cut -d ':' -f 2)

if [ -z "$GODADDY_API_KEY" ] || [ -z "$GODADDY_API_SECRET" ]; then
    echo "Error: Invalid credential format. Expected 'key:secret' format." | tee -a "$LOG_FILE"
    exit 1
fi

echo "GoDaddy API credentials successfully configured." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Process each batch file from 1 to 25
for i in {1..25}; do
    BATCH_FILE="batch$i.txt"
    
    # Check if batch file exists
    if [ ! -f "$BATCH_FILE" ]; then
        echo "Warning: Batch file $BATCH_FILE not found, skipping..." | tee -a "$LOG_FILE"
        continue
    fi
    
    # Count domains in this batch
    DOMAIN_COUNT=$(wc -l < "$BATCH_FILE")
    echo "===== Processing Batch $i ($DOMAIN_COUNT domains) at $(date) =====" | tee -a "$LOG_FILE"
    
    # Display domains in this batch
    echo "Domains in $BATCH_FILE:" | tee -a "$LOG_FILE"
    cat "$BATCH_FILE" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    # Deploy the batch
    echo "Deploying batch $i to specialty-domains..." | tee -a "$LOG_FILE"
    if GODADDY_API_KEY="$GODADDY_API_KEY" GODADDY_API_SECRET="$GODADDY_API_SECRET" node scripts/domain-all-in-one-cli.js batch-deploy -s specialty-domains "$BATCH_FILE" 2>&1 | tee -a "$LOG_FILE"; then
        echo "✓ Batch $i deployment completed successfully at $(date)" | tee -a "$LOG_FILE"
        ((SUCCESS_COUNT++))
    else
        echo "✗ Batch $i deployment failed at $(date)" | tee -a "$LOG_FILE"
        ((FAIL_COUNT++))
    fi
    
    echo "" | tee -a "$LOG_FILE"
    
    # Don't delay after the last batch
    if [ $i -lt 25 ]; then
        echo "Waiting $DELAY_MINUTES minutes before next batch..." | tee -a "$LOG_FILE"
        sleep $(($DELAY_MINUTES * 60))
    fi
done

# Print summary
echo "===== Domain Batch Deployment Completed at $(date) =====" | tee -a "$LOG_FILE"
echo "Summary:" | tee -a "$LOG_FILE"
echo "- Total batches processed: $((SUCCESS_COUNT + FAIL_COUNT))" | tee -a "$LOG_FILE"
echo "- Successful deployments: $SUCCESS_COUNT" | tee -a "$LOG_FILE"
echo "- Failed deployments: $FAIL_COUNT" | tee -a "$LOG_FILE"
echo "- Log file: $LOG_FILE" | tee -a "$LOG_FILE"

# Make the script executable
chmod +x deploy_all_batches.sh

echo "Script has made itself executable. Run with ./deploy_all_batches.sh"

