#!/bin/bash

# ASOOS Secret Migration Script
# Migrates secrets from filesystem to GCP Secret Manager
# 
# Usage: ./migrate-secrets-to-secret-manager.sh [project-id]

set -e

PROJECT_ID=${1:-"your-gcp-project-id"}
REGION="us-west1"

echo "🔐 ASOOS Secret Migration to GCP Secret Manager"
echo "================================================"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo "❌ Error: Not authenticated with gcloud. Run 'gcloud auth login' first."
    exit 1
fi

# Function to create secret in Secret Manager
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    echo "📝 Creating secret: $secret_name"
    
    # Check if secret already exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        echo "   ⚠️  Secret $secret_name already exists, adding new version..."
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --data-file=- \
            --project="$PROJECT_ID"
    else
        echo "   ✨ Creating new secret $secret_name..."
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --data-file=- \
            --project="$PROJECT_ID" \
            --replication-policy="user-managed" \
            --locations="$REGION"
    fi
    
    echo "   ✅ Secret $secret_name created/updated"
    echo ""
}

# High Priority Secrets to Migrate
echo "🚨 HIGH PRIORITY SECRETS"
echo "========================="

# Read from .env.secrets if it exists
if [ -f ".env.secrets" ]; then
    echo "📖 Reading secrets from .env.secrets file..."
    
    # Extract OpenAI keys
    OPENAI_KEYS=$(grep -E "^export.*OPENAI.*=" .env.secrets | head -3)
    if [ ! -z "$OPENAI_KEYS" ]; then
        echo "Found OpenAI API keys - these need manual migration due to sensitivity"
        echo "Run: echo 'your-actual-openai-key' | gcloud secrets create openai-api-key --data-file=-"
    fi
    
    # Extract Anthropic keys  
    ANTHROPIC_KEYS=$(grep -E "^export.*ANTHROPIC.*=" .env.secrets | head -3)
    if [ ! -z "$ANTHROPIC_KEYS" ]; then
        echo "Found Anthropic API keys - these need manual migration due to sensitivity"
        echo "Run: echo 'your-actual-anthropic-key' | gcloud secrets create anthropic-api-key --data-file=-"
    fi
    
    # Extract GitHub tokens
    GITHUB_TOKENS=$(grep -E "^export.*GITHUB.*=" .env.secrets | head -3)
    if [ ! -z "$GITHUB_TOKENS" ]; then
        echo "Found GitHub tokens - these need manual migration due to sensitivity"
        echo "Run: echo 'your-actual-github-token' | gcloud secrets create github-token --data-file=-"
    fi
    
else
    echo "⚠️  .env.secrets file not found"
fi

echo ""
echo "🔧 MANUAL MIGRATION COMMANDS"
echo "============================="
echo "For security, manually run these commands with your actual secret values:"
echo ""

# Generate commands for common secrets
cat << 'EOF'
# OpenAI API Key
echo "sk-proj-your-actual-openai-key" | gcloud secrets create openai-api-key --data-file=- --project=PROJECT_ID

# Anthropic API Key  
echo "sk-ant-your-actual-anthropic-key" | gcloud secrets create anthropic-api-key --data-file=- --project=PROJECT_ID

# GitHub Token
echo "your-actual-github-token" | gcloud secrets create github-token --data-file=- --project=PROJECT_ID

# GoDaddy API Credentials
echo "your-actual-godaddy-api-key" | gcloud secrets create godaddy-api-key --data-file=- --project=PROJECT_ID
echo "your-actual-godaddy-secret" | gcloud secrets create godaddy-api-secret --data-file=- --project=PROJECT_ID

# Daily.ai API Key
echo "your-actual-daily-api-key" | gcloud secrets create daily-api-key --data-file=- --project=PROJECT_ID

# Pinecone API Key
echo "pcsk_your-actual-pinecone-key" | gcloud secrets create pinecone-api-key --data-file=- --project=PROJECT_ID

# Cloudflare API Token
echo "your-actual-cloudflare-token" | gcloud secrets create cloudflare-api-token --data-file=- --project=PROJECT_ID

# JWT Secret (generate a new one)
echo "$(openssl rand -base64 64)" | gcloud secrets create jwt-secret --data-file=- --project=PROJECT_ID

# Stripe Keys
echo "sk_test_your-actual-stripe-key" | gcloud secrets create stripe-secret-key --data-file=- --project=PROJECT_ID
echo "whsec_your-actual-webhook-secret" | gcloud secrets create stripe-webhook-secret --data-file=- --project=PROJECT_ID

EOF

echo "Replace PROJECT_ID with your actual GCP project ID: $PROJECT_ID"
echo ""

echo "🧹 CLEANUP RECOMMENDATIONS"
echo "=========================="
echo "After migrating secrets to Secret Manager:"
echo ""
echo "1. Clear sensitive values from filesystem:"
echo "   > .env.secrets"  # Clear the file
echo "   rm .env.bak*     # Remove backup files with real secrets"
echo ""
echo "2. Update your applications to use Secret Manager:"
echo "   - Replace hardcoded values with Secret Manager API calls"
echo "   - Use environment variables like: \${SECRET_MANAGER:secret-name}"
echo ""
echo "3. Update deployment scripts:"
echo "   - Configure services to fetch secrets from Secret Manager"
echo "   - Set up proper IAM permissions for secret access"
echo ""

echo "🔍 VERIFICATION"
echo "==============="
echo "List all secrets in your project:"
echo "gcloud secrets list --project=$PROJECT_ID"
echo ""

echo "📊 ACCESS CONTROL SETUP"
echo "======================="
echo "Grant your services access to secrets:"
echo "gcloud secrets add-iam-policy-binding SECRET_NAME \\"
echo "    --member='serviceAccount:your-service@$PROJECT_ID.iam.gserviceaccount.com' \\"
echo "    --role='roles/secretmanager.secretAccessor' \\"
echo "    --project=$PROJECT_ID"
echo ""

echo "✅ Migration script completed!"
echo "⚠️  Remember: Manually migrate the actual secret values using the commands above"
echo "🔒 Always verify secrets are properly stored before deleting from filesystem"
