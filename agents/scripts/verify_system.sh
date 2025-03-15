#!/bin/bash

# Set strict error handling
set -euo pipefail
IFS=$'\n\t'

# Script constants
readonly LOG_DIR="agents/logs"
readonly CONFIG_DIR="agents/config"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly LOG_FILE="${LOG_DIR}/verify_system_${TIMESTAMP}.log"
readonly VERIFICATION_REPORT="${LOG_DIR}/verification_report_${TIMESTAMP}.json"

# Function for structured logging
log() {
    local level=$1
    shift
    local message=$*
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Initialize reporting
init_report() {
    cat > "${VERIFICATION_REPORT}" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "system_checks": [],
    "agent_checks": [],
    "security_checks": [],
    "network_checks": [],
    "overall_status": "pending"
}
EOF
}

# Add check result to report
add_to_report() {
    local check_type=$1
    local check_name=$2
    local status=$3
    local message=$4

    local temp_file=$(mktemp)
    jq --arg type "${check_type}" \
       --arg name "${check_name}" \
       --arg status "${status}" \
       --arg msg "${message}" \
       ".${check_type}_checks += [{\"name\": \$name, \"status\": \$status, \"message\": \$msg}]" \
       "${VERIFICATION_REPORT}" > "${temp_file}"
    mv "${temp_file}" "${VERIFICATION_REPORT}"
}

# Verify system configuration
verify_system_config() {
    log "INFO" "Verifying system configuration..."
    
    # Check required directories
    local required_dirs=("${LOG_DIR}" "${CONFIG_DIR}")
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "${dir}" ]]; then
            add_to_report "system" "directory_check" "failed" "Required directory not found: ${dir}"
            return 1
        fi
    done
    
    add_to_report "system" "directory_check" "passed" "All required directories present"
    return 0
}

# Verify agent health
verify_agents() {
    log "INFO" "Verifying agent health..."
    
    # Read active agents
    local active_agents=($(ps aux | grep "[p]ython3 -m asoos.agents" | awk '{print $NF}'))
    
    if [[ ${#active_agents[@]} -eq 0 ]]; then
        add_to_report "agent" "active_agents" "failed" "No active agents found"
        return 1
    fi
    
    # Check each agent's health
    for agent in "${active_agents[@]}"; do
        if ! curl -s "http://localhost:8080/health/${agent}" | jq -e '.status == "healthy"' &> /dev/null; then
            add_to_report "agent" "${agent}_health" "failed" "Agent health check failed"
            return 1
        fi
        add_to_report "agent" "${agent}_health" "passed" "Agent is healthy"
    done
    
    return 0
}

# Verify security configuration
verify_security() {
    log "INFO" "Verifying security configuration..."
    
    # Check SSL certificates
    if [[ ! -f "${CONFIG_DIR}/security/ssl/server.crt" ]]; then
        add_to_report "security" "ssl_check" "failed" "SSL certificate not found"
        return 1
    fi
    
    # Verify certificate validity
    local cert_end_date=$(openssl x509 -enddate -noout -in "${CONFIG_DIR}/security/ssl/server.crt" | cut -d= -f2)
    local cert_end_epoch=$(date -d "${cert_end_date}" +%s)
    local current_epoch=$(date +%s)
    
    if [[ ${cert_end_epoch} -lt ${current_epoch} ]]; then
        add_to_report "security" "ssl_validity" "failed" "SSL certificate has expired"
        return 1
    fi
    
    add_to_report "security" "ssl_check" "passed" "SSL configuration is valid"
    return 0
}

# Verify network connectivity
verify_network() {
    log "INFO" "Verifying network connectivity..."
    
    # Check internal communication
    if ! nc -z localhost 8080 &> /dev/null; then
        add_to_report "network" "internal_comm" "failed" "Internal communication port not accessible"
        return 1
    fi
    
    add_to_report "network" "internal_comm" "passed" "Network connectivity verified"
    return 0
}

# Update overall status
update_overall_status() {
    local failed_checks=$(jq '[.[]_checks[] | select(.status == "failed")] | length' "${VERIFICATION_REPORT}")
    
    if [[ ${failed_checks} -eq 0 ]]; then
        jq '.overall_status = "passed"' "${VERIFICATION_REPORT}" > "${VERIFICATION_REPORT}.tmp"
    else
        jq '.overall_status = "failed"' "${VERIFICATION_REPORT}" > "${VERIFICATION_REPORT}.tmp"
    fi
    mv "${VERIFICATION_REPORT}.tmp" "${VERIFICATION_REPORT}"
}

# Main execution
main() {
    local comprehensive=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --comprehensive)
                comprehensive=true
                shift
                ;;
            *)
                log "ERROR" "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    # Initialize verification report
    init_report

    # Run verifications
    verify_system_config
    verify_agents
    verify_security
    verify_network

    if ${comprehensive}; then
        # Additional comprehensive checks can be added here
        log "INFO" "Running comprehensive verification..."
    fi

    # Update overall status
    update_overall_status

    # Output final report
    log "INFO" "Verification complete. Report saved to: ${VERIFICATION_REPORT}"
    cat "${VERIFICATION_REPORT}"
}

main "$@"

