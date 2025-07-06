#!/bin/bash

# SallyPort-Cloudflare E2E Test Runner Script
# Usage: ./run-sallyport-tests.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_BASE_URL="https://asoos.2100.cool"
TEST_TIMEOUT=10000
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/sallyport-cloudflare-routing-test.js"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL           Base URL for testing (default: $DEFAULT_BASE_URL)"
    echo "  -t, --token TOKEN       SallyPort authentication token"
    echo "  -T, --timeout TIMEOUT   Request timeout in milliseconds (default: $TEST_TIMEOUT)"
    echo "  -e, --env ENVIRONMENT   Test environment (development, staging, production)"
    echo "  -v, --verbose           Verbose output"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                          # Run with defaults"
    echo "  $0 -u https://staging.asoos.2100.cool      # Test staging environment"
    echo "  $0 -t abc123 -u https://prod.asoos.com     # Test with auth token"
    echo "  $0 -e production -v                        # Production tests with verbose output"
}

# Parse command line arguments
BASE_URL="$DEFAULT_BASE_URL"
TOKEN=""
ENVIRONMENT="development"
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -t|--token)
            TOKEN="$2"
            shift 2
            ;;
        -T|--timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate requirements
if [[ ! -f "$TEST_SCRIPT" ]]; then
    print_error "Test script not found: $TEST_SCRIPT"
    exit 1
fi

if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

# Print test configuration
print_status "Starting SallyPort-Cloudflare E2E Tests"
echo "----------------------------------------"
echo "Base URL: $BASE_URL"
echo "Environment: $ENVIRONMENT"
echo "Timeout: ${TEST_TIMEOUT}ms"
if [[ -n "$TOKEN" ]]; then
    echo "Auth Token: ***${TOKEN: -4}"
else
    echo "Auth Token: Not provided"
fi
echo "Verbose: $VERBOSE"
echo "----------------------------------------"

# Set environment variables
export TEST_BASE_URL="$BASE_URL"
export TEST_TIMEOUT="$TEST_TIMEOUT"
export NODE_ENV="$ENVIRONMENT"

if [[ -n "$TOKEN" ]]; then
    export SALLYPORT_TEST_TOKEN="$TOKEN"
fi

# Create reports directory if it doesn't exist
REPORTS_DIR="$SCRIPT_DIR/../reports"
mkdir -p "$REPORTS_DIR"

# Run the tests
print_status "Executing test suite..."
echo ""

if [[ "$VERBOSE" == "true" ]]; then
    # Run with full output
    node "$TEST_SCRIPT"
    TEST_EXIT_CODE=$?
else
    # Capture output and show summary
    OUTPUT=$(node "$TEST_SCRIPT" 2>&1)
    TEST_EXIT_CODE=$?
    
    # Show summary lines
    echo "$OUTPUT" | grep -E "\[(SUMMARY|TEST)\]" || true
fi

echo ""

# Process results
if [[ $TEST_EXIT_CODE -eq 0 ]]; then
    print_status "✅ All tests passed successfully!"
    
    # Show latest report
    LATEST_REPORT=$(ls -t "$REPORTS_DIR"/sallyport-cloudflare-e2e-*.json 2>/dev/null | head -1)
    if [[ -n "$LATEST_REPORT" ]]; then
        print_status "📊 Detailed report: $LATEST_REPORT"
    fi
    
else
    print_error "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
    
    # Show latest report for debugging
    LATEST_REPORT=$(ls -t "$REPORTS_DIR"/sallyport-cloudflare-e2e-*.json 2>/dev/null | head -1)
    if [[ -n "$LATEST_REPORT" ]]; then
        print_warning "📊 Check detailed report for debugging: $LATEST_REPORT"
        
        if command -v jq &> /dev/null; then
            print_warning "Failed tests summary:"
            jq -r '.summary | "Total: \(.totalTests), Passed: \(.passedTests), Failed: \(.failedTests), Success Rate: \(.successRate)%"' "$LATEST_REPORT" 2>/dev/null || true
        fi
    fi
fi

# Show log files if they exist
LOG_DIR="$SCRIPT_DIR/../../logs"
if [[ -d "$LOG_DIR" ]]; then
    RECENT_LOGS=$(find "$LOG_DIR" -name "*.log" -mmin -5 2>/dev/null)
    if [[ -n "$RECENT_LOGS" ]]; then
        print_status "📋 Recent log files:"
        echo "$RECENT_LOGS"
    fi
fi

print_status "Test execution completed."
exit $TEST_EXIT_CODE
