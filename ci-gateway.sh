#!/bin/bash
#
# ASOOS Integration Gateway - Test Runner
# This script serves as the main entry point for running integration tests.
# It validates the environment, sets up necessary configurations, and calls
# the run_api_tests.sh script with appropriate parameters.
#
# Usage: ./ci-gateway.sh <environment> [options]
#

set -eo pipefail

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
REPORT_DIR="test-reports"
VERBOSE=false

# Display banner
function show_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║             ASOOS API Integration Test Gateway            ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Display usage information
function show_usage() {
    echo -e "Usage: ${YELLOW}./ci-gateway.sh <environment> [options]${NC}"
    echo
    echo "Environments:"
    echo "  dev         Run tests against development environment (default)"
    echo "  staging     Run tests against staging environment"
    echo "  production  Run tests against production environment"
    echo
    echo "Options:"
    echo "  -h, --help     Display this help message"
    echo "  -v, --verbose  Display detailed output"
    echo "  -r, --report-dir DIR  Specify directory for test reports (default: test-reports)"
    echo
    echo "Examples:"
    echo "  ./ci-gateway.sh dev                 # Run tests on dev environment"
    echo "  ./ci-gateway.sh production -v       # Run tests on production with verbose output"
    echo "  ./ci-gateway.sh staging -r reports  # Run tests on staging and store reports in 'reports' directory"
    echo
}

# Parse command line arguments
function parse_args() {
    # First argument is the environment (if it doesn't start with -)
    if [[ $# -gt 0 && ! $1 == -* ]]; then
        ENVIRONMENT="$1"
        shift
    fi

    # Parse remaining options
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -r|--report-dir)
                REPORT_DIR="$2"
                shift 2
                ;;
            *)
                echo -e "${RED}Error: Unknown option $1${NC}"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Validate the environment
function validate_environment() {
    case "$ENVIRONMENT" in
        dev|development)
            ENVIRONMENT="dev"
            ENV_FILE="ASOOS_API_Environment_dev.json"
            ;;
        staging|stage)
            ENVIRONMENT="staging"
            ENV_FILE="ASOOS_API_Environment_staging.json"
            # Fall back to dev if staging doesn't exist
            if [[ ! -f "../$ENV_FILE" ]]; then
                echo -e "${YELLOW}Warning: Staging environment file not found, falling back to dev${NC}"
                ENV_FILE="ASOOS_API_Environment_dev.json"
            fi
            ;;
        prod|production)
            ENVIRONMENT="production"
            ENV_FILE="ASOOS_API_Environment_production.json"
            ;;
        *)
            echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
            echo "Valid environments are: dev, staging, production"
            exit 1
            ;;
    esac

    # Check if environment file exists
    if [[ ! -f "../$ENV_FILE" ]]; then
        echo -e "${RED}Error: Environment file '../$ENV_FILE' not found${NC}"
        echo "Please run the set-api-token.sh script to create environment files"
        exit 1
    fi
}

# Prepare the test environment
function prepare_environment() {
    echo -e "${BLUE}Preparing test environment: ${YELLOW}$ENVIRONMENT${NC}"

    # Create report directory if it doesn't exist
    mkdir -p "../$REPORT_DIR"
    
    # Check if Newman is installed
    if ! command -v newman &> /dev/null; then
        echo -e "${YELLOW}Newman not found. Installing...${NC}"
        npm install -g newman newman-reporter-htmlextra
    fi
}

# Run the integration tests
function run_tests() {
    echo -e "${BLUE}Running integration tests against ${YELLOW}$ENVIRONMENT${NC} environment"

    # Set verbosity flag
    VERBOSE_FLAG=""
    if [[ "$VERBOSE" == true ]]; then
        VERBOSE_FLAG="--verbose"
    fi

    # Navigate to parent directory and run the tests
    cd ..
    
    # Run the API tests
    if ./run_api_tests.sh "$ENVIRONMENT" "$REPORT_DIR" $VERBOSE_FLAG; then
        echo -e "${GREEN}✅ Integration tests completed successfully!${NC}"
        return 0
    else
        echo -e "${RED}❌ Integration tests failed!${NC}"
        return 1
    fi
}

# Main function
function main() {
    # Store the path of the script directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Change to script directory
    cd "$SCRIPT_DIR"

    show_banner
    parse_args "$@"
    validate_environment
    prepare_environment
    
    # Run the tests
    if run_tests; then
        echo -e "${GREEN}Integration gateway process completed successfully!${NC}"
        exit 0
    else
        echo -e "${RED}Integration gateway process failed!${NC}"
        # Display report location
        echo -e "Check the report at: ${YELLOW}$REPORT_DIR/report.html${NC}"
        exit 1
    fi
}

# Run main function passing all arguments
main "$@"

