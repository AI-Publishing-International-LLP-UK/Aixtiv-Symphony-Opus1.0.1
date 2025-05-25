#!/bin/bash

# Environment variables
export PROJECT_ID="api-for-warp-drive"
export REGION="us-west1"

echo "🔍 Starting comprehensive deployment verification..."

# Function to check Vertex AI endpoints
check_vertex_endpoints() {
    echo "\n📡 Checking Vertex AI endpoints..."
    gcloud ai endpoints list \
        --region=$REGION \
        --format="table(displayName,state,deployedModels.id,createTime)"
}

# Function to check server status
check_servers() {
    echo "\\n\U0001F4BB Verifying server status..."
    SERVERS=(
        "mcp-server:us-west1-a"
        "warpdrive01-prod:us-west1-b"
        "coaching2100-instance:us-west1-a"
        "dev-vm:us-west1-b"
    )
    
    for server_config in "${SERVERS[@]}"; do
        IFS=':' read -r server zone <<< "$server_config"
        echo "Checking $server in $zone..."
        gcloud compute instances describe $server --zone=$zone \
            --format="table(name,status,machineType.basename(),networkInterfaces[0].networkIP)"
    done
}

# Function to check Ray clusters
check_ray_clusters() {
    echo "\n🌟 Verifying Ray clusters..."
    SERVERS=(
        "mcp-server:us-west1-a"
        "warpdrive01-prod:us-west1-b"
    )

    for server_config in "${SERVERS[@]}"; do
        IFS=':' read -r server zone <<< "$server_config"
        echo "Checking Ray cluster on $server..."
        gcloud compute ssh $server --zone=$zone --command="ray status" 2>/dev/null || echo "Could not connect to Ray cluster on $server"
    done
}

# Function to check agent-specific services
check_agent_services() {
    local agent=$1
    echo "\n🤖 Checking services for $agent..."
    
    # Check Pub/Sub topics
    echo "Checking Pub/Sub topics..."
    gcloud pubsub topics list --filter="name:$agent"
    
    # Check Firestore collections
    echo "Checking Firestore collections..."
    gcloud firestore indexes composite list --filter="collectionId:$agent" 2>/dev/null || echo "No composite indexes found for $agent"
}

# Function to verify all agents
verify_all_agents() {
    AGENTS=(
        "dr_claude:super-agent"
        "dr_lucy:r1-core"
        "dr_grant:r2-deploy"
        "dr_sabina:r3-engage"
        "dr_match:impact-legacy"
        "dr_burby:governance"
        "dr_cypriot:human-ai"
        "dr_maria:elder-wisdom"
        "prof_lee:prompt-engine"
        "dr_memoria:publishing"
        "dr_roark:leadership"
    )

    for agent_config in "${AGENTS[@]}"; do
        IFS=':' read -r agent role <<< "$agent_config"
        echo "\n✨ Verifying $agent ($role)..."
        check_agent_services $agent
    done
}

# Main verification
main() {
    echo "🚀 Starting comprehensive verification..."
    
    # Check Vertex AI endpoints
    check_vertex_endpoints
    
    # Check server status
    check_servers
    
    # Check Ray clusters
    check_ray_clusters
    
    # Verify all agents
    verify_all_agents
    
    echo "\n✅ Verification complete! System ready for assignments."
}

# Execute main function
main

