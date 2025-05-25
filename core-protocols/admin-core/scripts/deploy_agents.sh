#!/bin/bash

# Enable strict mode
set -euo pipefail

# Environment Variables
export INITIAL_CLIENT_COUNT=6
export MAX_CLIENTS=12
export MIN_CLIENTS=3
export SCALE_UP_THRESHOLD=0.75
export SCALE_DOWN_THRESHOLD=0.25

# Constants
readonly REQUIRED_MEMORY=2560  # MB per agent
readonly REQUIRED_CPU=1        # CPU cores per agent
readonly MAX_RETRIES=3
readonly LOG_FILE="./deploy_agents.log"

# Logging function
log() {
    local level=$1
    shift
    local message=$*
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    # Ensure log message gets printed even if log file write fails
    echo "[$timestamp] [$level] $message"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE" 2>/dev/null || true
}


# Resource check function
check_resources() {
    local agent_name=$1
    local required_mem=$REQUIRED_MEMORY
    local required_cpu=$REQUIRED_CPU
    
    log "INFO" "Checking resources for agent: $agent_name"
    
    # Get available resources (example command - adjust based on your environment)
    local available_mem
    available_mem=$(free -m | awk '/^Mem:/{print $4}')
    local available_cpu
    available_cpu=$(nproc --all)
    
    if [ "$available_mem" -lt "$required_mem" ] || [ "$available_cpu" -lt "$required_cpu" ]; then
        log "ERROR" "Insufficient resources for $pair_name. Required: ${required_mem}MB RAM, ${required_cpu} CPU. Available: ${available_mem}MB RAM, ${available_cpu} CPU"
        return 1
    fi
    return 0
}

# Deployment function for a single agent
deploy_agent() {
    local agent_name=$1
    local retry_count=0
    
    while [ "$retry_count" -lt "$MAX_RETRIES" ]; do
        if gcloud ai-platform models create "$agent_name" --region=us-west1; then
            log "INFO" "Successfully deployed $agent_name"
            return 0
        fi
        retry_count=$((retry_count + 1))
        log "WARN" "Retry $retry_count/$MAX_RETRIES for $agent_name"
        sleep 5
    done
    
    log "ERROR" "Failed to deploy $agent_name after $MAX_RETRIES attempts"
    return 1
}

# Function to deploy a single agent
deploy_single_agent() {
    local agent_name="$1"
    if [[ -z "$agent_name" ]]; then
        echo "Usage: $0 <agent_name>"
        echo "Available agents:"
        echo "- professor_lee"
        echo "- memoria"
        echo "- lucy"
        echo "- grant"
        echo "- sabina"
        echo "- dr_cypriot"
        exit 1
    fi

    # Validate agent name
    case "$agent_name" in
        "professor_lee"|"memoria"|"lucy"|"grant"|"sabina"|"dr_cypriot")
            log "INFO" "Deploying single agent: $agent_name"
            deploy_agent "$agent_name"
            log "INFO" "Deployment completed for $agent_name"
            ;;
        *)
            echo "Error: Invalid agent name '$agent_name'"
            echo "Available agents:"
            echo "- professor_lee"
            echo "- memoria"
            echo "- lucy"
            echo "- grant"
            echo "- sabina"
            echo "- dr_cypriot"
            exit 1
            ;;
    esac
}

# Status check function
check_deployment_status() {
    local agent_name=$1
    if gcloud ai-platform models describe "$agent_name" --region=us-west1 | grep -q "state: DEPLOYED"; then
        log "INFO" "$agent_name is successfully deployed and running"
        return 0
    fi
    log "ERROR" "$agent_name deployment verification failed"
    return 1
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up resources..."
    # Add cleanup logic here
}


# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    deploy_single_agent "$1"
fi
