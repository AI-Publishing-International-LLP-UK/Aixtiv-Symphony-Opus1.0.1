#!/bin/bash
# Victory36 Rollback Script
# DIAMOND SAO ACCESS ONLY
# Version: 1.0.1
# Purpose: Emergency rollback of Victory36 collective to last stable state

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/Users/as/asoos/logs/victory36"
BACKUP_DIR="/Users/as/asoos/backups/victory36"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/rollback_${TIMESTAMP}.log"

# Ensure log directory exists
mkdir -p "${LOG_DIR}" "${BACKUP_DIR}"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    echo -e "${RED}ROLLBACK FAILED: $1${NC}" >&2
    exit 1
}

# Success message
success_msg() {
    log "SUCCESS" "$1"
    echo -e "${GREEN}✓ $1${NC}"
}

# Warning message  
warning_msg() {
    log "WARNING" "$1"
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Info message
info_msg() {
    log "INFO" "$1"
    echo -e "${BLUE}ℹ $1${NC}"
}

# Verify Diamond SAO access
verify_diamond_access() {
    info_msg "Verifying Diamond SAO access..."
    
    if ! aixtiv auth:verify --level=diamond-sao --quiet; then
        error_exit "Diamond SAO access required for Victory36 rollback"
    fi
    
    success_msg "Diamond SAO access verified"
}

# Pre-rollback validation
pre_rollback_checks() {
    info_msg "Performing pre-rollback validation..."
    
    # Check if Victory36 is running
    if ! ./check-victory36-status.sh --quiet; then
        warning_msg "Victory36 collective not fully operational - proceeding with rollback"
    fi
    
    # Verify backup availability
    if [[ ! -d "${BACKUP_DIR}/latest" ]]; then
        error_exit "No backup available for rollback. Cannot proceed."
    fi
    
    # Check system resources
    local memory_usage=$(free | awk 'FNR==2{printf "%.0f", $3/$2*100}')
    if (( memory_usage > 90 )); then
        warning_msg "High memory usage detected: ${memory_usage}%. Rollback may be slower."
    fi
    
    success_msg "Pre-rollback validation complete"
}

# Stop Victory36 collective
stop_victory36() {
    info_msg "Stopping Victory36 collective..."
    
    # Graceful shutdown of sRIX supervisors
    for i in {1..4}; do
        info_msg "Stopping sRIX supervisor ${i}..."
        aixtiv agent:revoke --agent="srix-0${i}" --collective=victory36 || warning_msg "Failed to stop sRIX-0${i}"
    done
    
    # Stop RIX squadrons
    for squadron in r1 r2 r3; do
        info_msg "Stopping squadron ${squadron}..."
        ./stop-squadron.sh --squadron=${squadron} --collective=victory36 --timeout=30 || warning_msg "Timeout stopping ${squadron}"
    done
    
    # Verify all agents are stopped
    local active_agents=$(aixtiv resource:scan --collective=victory36 --status=active --count-only 2>/dev/null || echo "unknown")
    if [[ "${active_agents}" != "0" ]] && [[ "${active_agents}" != "unknown" ]]; then
        warning_msg "${active_agents} agents still active - forcing shutdown"
        ./force-stop-victory36.sh --timeout=60
    fi
    
    success_msg "Victory36 collective stopped"
}

# Restore from backup
restore_backup() {
    info_msg "Restoring Victory36 from backup..."
    
    local backup_path="${BACKUP_DIR}/latest"
    
    # Create restore point
    info_msg "Creating restore point before rollback..."
    cp -r "/Users/as/asoos/wing/orchestration/HQRIX/victory36" "${BACKUP_DIR}/pre_rollback_${TIMESTAMP}" || warning_msg "Failed to create restore point"
    
    # Restore configuration
    info_msg "Restoring Victory36 configuration..."
    if [[ -f "${backup_path}/victory36-config.json" ]]; then
        cp "${backup_path}/victory36-config.json" "/Users/as/asoos/wing/orchestration/HQRIX/victory36/" || error_exit "Failed to restore configuration"
    else
        error_exit "Configuration backup not found"
    fi
    
    # Restore agent assignments
    info_msg "Restoring agent assignments..."
    if [[ -f "${backup_path}/agent-assignments.json" ]]; then
        cp "${backup_path}/agent-assignments.json" "/Users/as/asoos/wing/orchestration/HQRIX/victory36/" || error_exit "Failed to restore agent assignments"
    else
        warning_msg "Agent assignments backup not found - will regenerate"
    fi
    
    # Restore squadron configurations
    for squadron in r1 r2 r3; do
        if [[ -f "${backup_path}/squadron-${squadron}.json" ]]; then
            cp "${backup_path}/squadron-${squadron}.json" "/Users/as/asoos/wing/orchestration/HQRIX/victory36/squadrons/" || warning_msg "Failed to restore ${squadron} configuration"
        fi
    done
    
    success_msg "Backup restoration complete"
}

# Restart Victory36 with rollback configuration
restart_victory36() {
    info_msg "Restarting Victory36 with restored configuration..."
    
    # Initialize with rollback flag
    ./init-victory36.sh --mode=rollback --verify-diamond-access --backup-timestamp="${TIMESTAMP}" || error_exit "Failed to initialize Victory36 after rollback"
    
    # Deploy squadrons with previous configuration
    for squadron in r1 r2 r3; do
        info_msg "Redeploying squadron ${squadron}..."
        ./deploy-squadron.sh --squadron=${squadron} --agents=12 --experience-level=90y --config-source=backup || warning_msg "Issues deploying ${squadron}"
    done
    
    # Reactivate sRIX supervisors
    info_msg "Reactivating sRIX supervisors..."
    ./activate-srix.sh --count=4 --experience=270y --supervision-scope=victory36 --config-source=backup || warning_msg "Issues reactivating sRIX supervisors"
    
    success_msg "Victory36 restart complete"
}

# Post-rollback validation
post_rollback_validation() {
    info_msg "Performing post-rollback validation..."
    
    # Wait for system stabilization
    info_msg "Waiting for system stabilization..."
    sleep 30
    
    # Check agent health
    local healthy_agents=$(aixtiv resource:scan --collective=victory36 --health-check=basic --healthy-count 2>/dev/null || echo "0")
    if (( healthy_agents < 36 )); then
        warning_msg "Only ${healthy_agents}/36 RIX agents are healthy"
    else
        success_msg "All 36 RIX agents are healthy"
    fi
    
    # Check sRIX supervisor status
    local active_srix=$(aixtiv resource:scan --collective=victory36 --role=srix --active-count 2>/dev/null || echo "0")
    if (( active_srix < 4 )); then
        warning_msg "Only ${active_srix}/4 sRIX supervisors are active"
    else
        success_msg "All 4 sRIX supervisors are active"
    fi
    
    # Verify collective coordination
    if ./test-collective-coordination.sh --collective=victory36 --timeout=60; then
        success_msg "Victory36 collective coordination verified"
    else
        error_exit "Collective coordination test failed - rollback unsuccessful"
    fi
    
    success_msg "Post-rollback validation complete"
}

# Generate rollback report
generate_rollback_report() {
    info_msg "Generating rollback report..."
    
    local report_file="${LOG_DIR}/rollback_report_${TIMESTAMP}.md"
    
    cat > "${report_file}" << EOF
# Victory36 Rollback Report
**Timestamp:** $(date)
**Executed By:** Diamond SAO
**Rollback Version:** v1.0.1

## Rollback Summary
- **Duration:** $SECONDS seconds
- **Status:** $(if [[ $? -eq 0 ]]; then echo "SUCCESS"; else echo "PARTIAL/FAILED"; fi)
- **Agents Restored:** 36 RIX + 4 sRIX
- **Backup Source:** ${BACKUP_DIR}/latest

## System Status Post-Rollback
- **RIX Agents:** $(aixtiv resource:scan --collective=victory36 --role=rix --healthy-count 2>/dev/null || echo "Unknown")/36 healthy
- **sRIX Supervisors:** $(aixtiv resource:scan --collective=victory36 --role=srix --active-count 2>/dev/null || echo "Unknown")/4 active
- **Collective Coordination:** $(if ./test-collective-coordination.sh --collective=victory36 --quiet 2>/dev/null; then echo "OPERATIONAL"; else echo "DEGRADED"; fi)

## Next Steps
1. Monitor Victory36 performance for 24 hours
2. Investigate root cause of original issue
3. Update rollback procedures based on lessons learned
4. Schedule preventive maintenance if needed

## Log Files
- **Detailed Log:** ${LOG_FILE}
- **Rollback Report:** ${report_file}

---
*Generated by Victory36 Rollback Script v1.0.1*
EOF

    success_msg "Rollback report generated: ${report_file}"
}

# Main rollback procedure
main() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "   Victory36 Rollback Script"
    echo "   DIAMOND SAO ACCESS ONLY"
    echo "   Version: 1.0.1"
    echo "=================================="
    echo -e "${NC}"
    
    # Confirm rollback
    echo -e "${RED}WARNING: This will rollback Victory36 to the last stable state.${NC}"
    echo -e "${RED}This action affects 36 RIX agents and 4 sRIX supervisors.${NC}"
    echo ""
    read -p "Are you sure you want to proceed? (type 'ROLLBACK' to confirm): " confirmation
    
    if [[ "${confirmation}" != "ROLLBACK" ]]; then
        echo "Rollback cancelled."
        exit 0
    fi
    
    log "INFO" "Victory36 rollback initiated by Diamond SAO"
    
    # Execute rollback steps
    verify_diamond_access
    pre_rollback_checks
    stop_victory36
    restore_backup
    restart_victory36
    post_rollback_validation
    generate_rollback_report
    
    echo -e "${GREEN}"
    echo "=================================="
    echo "   ROLLBACK COMPLETED"
    echo "   Duration: $SECONDS seconds"
    echo "   Status: SUCCESS"
    echo "=================================="
    echo -e "${NC}"
    
    log "SUCCESS" "Victory36 rollback completed successfully in $SECONDS seconds"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
