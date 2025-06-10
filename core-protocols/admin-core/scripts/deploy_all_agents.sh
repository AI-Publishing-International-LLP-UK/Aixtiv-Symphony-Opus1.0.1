#!/bin/bash

# Environment validation
if [[ -z "${PROJECT_ID}" ]]; then
    PROJECT_ID="api-for-warp-drive"
fi

if [[ -z "${REGION}" ]]; then
    REGION="us-west1"
fi

# Print configuration
echo "🔧 Deployment Configuration:"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "----------------------------"

# Environment Setup
export PROJECT_ID="${PROJECT_ID}"
export REGION="${REGION}"
export SERVICE_ACCOUNT="drlucyautomation@api-for-warp-drive.iam.gserviceaccount.com"

# Verify current credentials
echo "🔐 Verifying authentication..."
gcloud auth list

# Agent Deployment Configurations
# Format: agent:role:server:zone:specialty
AGENT_CONFIGS=(
"dr_lucy:r1-core:warpdrive01-prod:us-west1-b:research-development"
"dr_grant:r2-deploy:warpdrive01-prod:us-west1-b:security-deployment"
"dr_sabina:r3-engage:warpdrive01-prod:us-west1-b:customer-science"
"dr_claude:ai-leadership:mcp-server:us-west1-a:super-agent"
"dr_match:impact-legacy:coaching2100-instance:us-west1-a:communication-design"
"dr_burby:governance:coaching2100-instance:us-west1-a:risk-finance-law"
"dr_cypriot:human-ai:dev-vm:us-west1-b:interaction-specialist"
"dr_maria:elder-wisdom:dev-vm:us-west1-b:generational-knowledge"
"prof_lee:prompt-engine:dev-vm:us-west1-b:prompt-engineering"
"dr_memoria:publishing:dev-vm:us-west1-b:anthology-ai"
"dr_roark:leadership:dev-vm:us-west1-b:coaching-development"
)

# Function to deploy individual agent
deploy_agent() {
    local agent=$1
    local role=$2
    local server=$3
    local zone=$4
    local specialty=$5

    echo "\U0001F527 Deploying $agent with role $role..."

    # Create Vertex AI endpoint
    gcloud ai endpoints create \
        --region="$REGION" \
        --display-name="$agent-endpoint" \
        --project="$PROJECT_ID" \
        --network="projects/$PROJECT_ID/global/networks/default" \
        --machine-type="n1-standard-4" \
        --min-replica-count=1 \
        --max-replica-count=3 \
        --enable-access-logging \
        --labels="role=$role,server=$server,specialty=$specialty" || {
        echo "Failed to create endpoint for $agent"
        return 1
    }

    # Upload model to Vertex AI
    gcloud ai models upload \
        --region="$REGION" \
        --display-name="$agent-model" \
        --artifact-uri="gs://$PROJECT_ID-models/$agent" \
        --container-image-uri="us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-6:latest" || {
        echo "Failed to upload model for $agent"
        return 1
    }

    # Setup Ray cluster connection
    gcloud compute ssh $server --zone=$zone --command="ray start --head" || {
        echo "Failed to start Ray cluster for $agent"
        return 1
    }

    echo "✅ $agent deployed successfully"
}

# Setup communication and monitoring
setup_infrastructure() {
    local agent=$1
    
    echo "📡 Setting up infrastructure for $agent..."
    
    # Create Pub/Sub topics with valid names (only hyphens and alphanumeric)
        topic_name="$(echo "$agent" | tr '_' '-')-events"
        subscription_name="$(echo "$agent" | tr '_' '-')-subscription"
        gcloud pubsub topics create "$topic_name" || true
        gcloud pubsub subscriptions create "$subscription_name" --topic="$topic_name" || true
    
    # Check if Firestore database exists and create if needed
        if ! gcloud firestore databases describe 2>/dev/null; then
            gcloud firestore databases create --location="$REGION" || {
                echo "Failed to create Firestore database"
                return 1
            }
        fi
    
    # Setup monitoring using beta commands
        gcloud beta monitoring channels create \
            --display-name="$agent-monitoring" \
            --type="email" \
            --user-labels="agent=$agent" \
            --project="$PROJECT_ID" || true
}

# Main deployment function
deploy_all_agents() {
    echo "🚀 Starting full agent deployment..."
    
    # Verify environment
    gcloud config set project $PROJECT_ID
    gcloud config set compute/region $REGION
    
    for config in "${AGENT_CONFIGS[@]}"; do
        IFS=':' read -r agent role server zone specialty <<< "$config"
        
        echo "🔄 Processing $agent..."
        
        # Deploy agent
        deploy_agent "$agent" "$role" "$server" "$zone" "$specialty"
        
        # Setup infrastructure
        setup_infrastructure "$agent"
        
        echo "✨ $agent deployment complete"
    done
}

# Verify deployment
verify_deployment() {
    echo "🔍 Verifying deployment..."
    
    # Check endpoints
    echo "Checking Vertex AI endpoints..."
    gcloud ai endpoints list --region="$REGION"
    
    # Check compute instances
    echo "Checking compute instances..."
    gcloud compute instances list
    
    # Check Pub/Sub
    echo "Checking Pub/Sub topics..."
    gcloud pubsub topics list
}

# Main execution
main() {
    echo "🌟 Starting comprehensive deployment process..."
    
    # Deploy agents
    deploy_all_agents || {
        echo "❌ Deployment failed"
        exit 1
    }
    
    # Verify deployment
    verify_deployment || {
        echo "❌ Verification failed"
        exit 1
    }
    
    echo "✅ Full deployment completed successfully!"
}

# Execute main function
main

