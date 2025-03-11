#!/bin/bash

# set-api-token.sh - Script to securely update API tokens in environment files
# Usage: ./set-api-token.sh [environment] [token]
# Example: ./set-api-token.sh dev your_dev_token_here

# Display help message
show_help() {
    echo "Usage: $0 [environment] [token]"
    echo "Updates the API token in the specified environment configuration file."
    echo ""
    echo "Arguments:"
    echo "  environment    Environment name: 'dev' or 'production'"
    echo "  token          The API token value (without 'Bearer' prefix)"
    echo ""
    echo "Examples:"
    echo "  $0 dev your_dev_token_here"
    echo "  $0 production your_production_token_here"
    echo ""
    exit 0
}

# Display error message and exit
show_error() {
    echo "ERROR: $1" >&2
    echo "Use '$0 --help' for usage information." >&2
    exit 1
}

# Check if help is requested
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
fi

# Validate arguments
if [[ $# -ne 2 ]]; then
    show_error "This script requires exactly two arguments: environment and token."
fi

# Set variables
ENV=$1
TOKEN=$2
CURRENT_DIR=$(pwd)

# Validate environment
case "$ENV" in
    dev|development)
        ENV_FILE="$CURRENT_DIR/ASOOS_API_Environment_dev.json"
        ENV_NAME="development"
        ;;
    prod|production)
        ENV_FILE="$CURRENT_DIR/ASOOS_API_Environment_production.json"
        ENV_NAME="production"
        ;;
    *)
        show_error "Invalid environment. Use 'dev' or 'production'."
        ;;
esac

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    show_error "Environment file not found: $ENV_FILE"
fi

# Create a backup
BACKUP_FILE="${ENV_FILE}.bak"
cp "$ENV_FILE" "$BACKUP_FILE"
if [[ $? -ne 0 ]]; then
    show_error "Failed to create backup file: $BACKUP_FILE"
fi

echo "Creating backup: $BACKUP_FILE"

# Update token in the file
# Add Bearer prefix if not already included
if [[ ! "$TOKEN" == Bearer* ]]; then
    TOKEN="Bearer $TOKEN"
fi

# Use different methods depending on operating system
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|\"authToken\": \"[^\"]*\"|\"authToken\": \"$TOKEN\"|g" "$ENV_FILE"
else
    # Linux
    sed -i "s|\"authToken\": \"[^\"]*\"|\"authToken\": \"$TOKEN\"|g" "$ENV_FILE"
fi

if [[ $? -ne 0 ]]; then
    echo "WARNING: Failed to update token. Restoring backup..."
    cp "$BACKUP_FILE" "$ENV_FILE"
    show_error "Token update failed. Original file has been restored."
fi

# Verify update
if grep -q "\"authToken\": \"$TOKEN\"" "$ENV_FILE"; then
    echo "✅ Successfully updated API token in $ENV_NAME environment."
    echo "Token is now set to: $TOKEN"
else
    echo "WARNING: Token update verification failed. Restoring backup..."
    cp "$BACKUP_FILE" "$ENV_FILE"
    show_error "Failed to verify token update. Original file has been restored."
fi

# Success message
echo ""
echo "You can now run tests against the $ENV_NAME environment with:"
echo "./integration-gateway/ci-gateway.sh $ENV"
echo ""
