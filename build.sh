#!/bin/bash

# Strict error handling
set -euo pipefail

# Component directories
readonly COMPONENTS=(
    "academy"
    "gift_shop"
    "pilot_lounge"
    "distinguished_pilots"
)

# Logging function
log() {
    local level="$1"
    shift
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] $*" >&2
}

# Initialize component directories
init_components() {
    for component in "${COMPONENTS[@]}"; do
        if [[ ! -d "${component}" ]]; then
            log "INFO" "Creating ${component} directory"
            mkdir -p "${component}"
        fi
    done
}

# Build individual component
build_component() {
    local component="$1"
    log "INFO" "Building ${component}..."
    
    if [[ ! -d "${component}" ]]; then
        log "ERROR" "Component directory ${component} not found"
        return 1
    fi

    # Add specific build steps for each component
    case "${component}" in
        "academy")
            log "INFO" "Building Academy training modules"
            # Add academy-specific build steps
            ;;
        "gift_shop")
            log "INFO" "Building Gift Shop inventory system"
            # Add gift shop-specific build steps
            ;;
        "pilot_lounge")
            log "INFO" "Building Pilot Lounge facilities"
            # Add pilot lounge-specific build steps
            ;;
        "distinguished_pilots")
            log "INFO" "Building Distinguished Pilots copilot system"
            # Add distinguished pilots-specific build steps
            ;;
        *)
            log "ERROR" "Unknown component: ${component}"
            return 1
            ;;
    esac

    log "INFO" "Successfully built ${component}"
    return 0
}

# Build all components
build_all() {
    local failed_components=()

    for component in "${COMPONENTS[@]}"; do
        if ! build_component "${component}"; then
            failed_components+=("${component}")
        fi
    done

    if (( ${#failed_components[@]} > 0 )); then
        log "ERROR" "Failed to build components: ${failed_components[*]}"
        return 1
    fi

    log "INFO" "All components built successfully"
    return 0
}

# Main function
main() {
    local component=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --component)
                component="$2"
                shift 2
                ;;
            *)
                log "ERROR" "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    init_components

    if [[ -n "${component}" ]]; then
        build_component "${component}" || exit 1
    else
        build_all || exit 1
    fi
}

# Execute main function
main "$@"

