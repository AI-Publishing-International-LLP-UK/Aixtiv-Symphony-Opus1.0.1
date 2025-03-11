#!/bin/bash

# Script to update secure credentials from environment variables
# This script updates the secure-credentials.json file with values from environment variables
# Usage: ./update-credentials.sh

# Exit on any error
set -e

# Function to check if an environment variable exists
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "Error: Required environment variable $1 is not set"
        return 1
    fi
    return 0
}

# Function to validate required environment variables
validate_environment() {
    local required_vars=(
        "GCP_KEY_ID"
        "GCP_PRIVATE_KEY"
        "GCP_CLIENT_ID"
        "FIREBASE_API_KEY"
        "FIREBASE_APP_ID"
        "FIREBASE_SENDER_ID"
        "DREAM_COMMANDER_API_KEY"
        "VISION_LAKE_API_KEY"
        "SERPEW_API_KEY"
        "HOBMDIHO_API_KEY"
        "STRIPE_PUBLIC_KEY"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "PAYPAL_CLIENT_ID"
        "PAYPAL_SECRET"
        "SUPER_ADMIN_UUID"
        "DREAM_COMMANDER_UUID"
        "JWT_SECRET"
        "COOKIE_SECRET"
    )

    local missing_vars=0
    for var in "${required_vars[@]}"; do
        if ! check_env_var "$var"; then
            missing_vars=$((missing_vars + 1))
        fi
    done

    if [ $missing_vars -gt 0 ]; then
        echo "Error: $missing_vars required environment variables are missing"
        exit 1
    fi
}

# Function to update the credentials file
update_credentials() {
    local credentials_file="secure-credentials.json"
    local template_file="day1-secure-credentials-template.json"

    # Check if template exists
    if [ ! -f "$template_file" ]; then
        echo "Error: Template file $template_file not found"
        exit 1
    }

    # Create or update credentials file
    cat > "$credentials_file" << EOF
{
    "gcp": {
        "keyId": "${GCP_KEY_ID}",
        "privateKey": "${GCP_PRIVATE_KEY}",
        "clientId": "${GCP_CLIENT_ID}"
    },
    "firebase": {
        "apiKey": "${FIREBASE_API_KEY}",
        "appId": "${FIREBASE_APP_ID}",
        "messagingSenderId": "${FIREBASE_SENDER_ID}"
    },
    "apiKeys": {
        "dreamCommander": "${DREAM_COMMANDER_API_KEY}",
        "visionLake": "${VISION_LAKE_API_KEY}",
        "serpew": "${SERPEW_API_KEY}",
        "hobmdiho": "${HOBMDIHO_API_KEY}"
    },
    "payment": {
        "stripe": {
            "publicKey": "${STRIPE_PUBLIC_KEY}",
            "secretKey": "${STRIPE_SECRET_KEY}",
            "webhookSecret": "${STRIPE_WEBHOOK_SECRET}"
        },
        "paypal": {
            "clientId": "${PAYPAL_CLIENT_ID}",
            "secret": "${PAYPAL_SECRET}"
        }
    },
    "entities": {
        "superAdminUuid": "${SUPER_ADMIN_UUID}",
        "dreamCommanderUuid": "${DREAM_COMMANDER_UUID}"
    },
    "auth": {
        "jwtSecret": "${JWT_SECRET}",
        "cookieSecret": "${COOKIE_SECRET}"
    }
}
EOF

    # Set secure permissions on credentials file
    chmod 600 "$credentials_file"

    echo "Successfully updated $credentials_file"
    echo "File permissions set to 600 (readable only by owner)"
}

# Main script execution
echo "Validating environment variables..."
validate_environment

echo "Updating credentials file..."
update_credentials

echo "Credentials update completed successfully"

