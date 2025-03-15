#!/bin/bash

# Strict error handling
set -euo pipefail

# Core directories
readonly VLS_SOLUTIONS_DIR="/Users/as/asoos/vls/solutions"
readonly DREAM_COMMANDER_DIR="${VLS_SOLUTIONS_DIR}/dream_commander"
readonly LOG_DIR="${VLS_SOLUTIONS_DIR}/logs"

# Logging function
log() {
    local level="$1"
    shift
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] $*" >&2
}

# Initialize Dream Commander
init_dream_commander() {
    if [[ ! -d "${DREAM_COMMANDER_DIR}" ]]; then
        log "ERROR" "Dream Commander directory not found at ${DREAM_COMMANDER_DIR}"
        return 1
    fi

    if [[ ! -d "${LOG_DIR}" ]]; then
        log "INFO" "Creating log directory at ${LOG_DIR}"
        mkdir -p "${LOG_DIR}"
    fi

    log "INFO" "Dream Commander initialized successfully"
    return 0
}

# Check dependencies
check_dependencies() {
    local missing_deps=()

    for dep in python3 jq curl openssl; do
        if ! command -v "${dep}" &> /dev/null; then
            missing_deps+=("${dep}")
        fi
    done

    if (( ${#missing_deps[@]} > 0 )); then
        log "ERROR" "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi

    log "INFO" "All dependencies satisfied"
    return 0
}

# Launch Dream Commander
launch_dream_commander() {
    local mode="${1:-primary}"

    log "INFO" "Launching Dream Commander in ${mode} mode"
    
    if [[ ! -x "${DREAM_COMMANDER_DIR}/launch.sh" ]]; then
        log "ERROR" "Dream Commander launch script not found or not executable"
        return 1
    fi

    cd "${DREAM_COMMANDER_DIR}" || {
        log "ERROR" "Failed to change to Dream Commander directory"
        return 1
    }

    ./launch.sh --mode "${mode}" || {
        log "ERROR" "Failed to launch Dream Commander"
        return 1
    }

    log "INFO" "Dream Commander launched successfully"
    return 0
}

# Main function
main() {
    local mode="primary"
    local verify_deps=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --mode)
                mode="$2"
                shift 2
                ;;
            --verify-dependencies)
                verify_deps=true
                shift
                ;;
            *)
                log "ERROR" "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    log "INFO" "Starting agent launch process"

    if [[ "${verify_deps}" == "true" ]]; then
        check_dependencies || exit 1
    fi
    
    init_dream_commander || {
        log "ERROR" "Failed to initialize Dream Commander"
        exit 1
    }

    launch_dream_commander "${mode}" || {
        log "ERROR" "Failed to launch Dream Commander"
        exit 1
    }

    log "INFO" "Agent launch process completed successfully"
}

# Execute main function
main "$@"
