#!/bin/bash

# Deployment Gateway Script
# This script runs API tests as part of the deployment gateway validation

set -e  # Exit on error

echo "=== ASOOS Deployment Gateway Validation ==="
echo "Running pre-deployment validation tests..."

# Variables
ENVIRONMENT=${1:-production}
ENVIRONMENT_FILE="ASOOS_API_Environment_${ENVIRONMENT}.json"
RESULTS_DIR="results/deployment-validation"
THRESHOLD=100  # Require 100% pass rate for deployment

# Create results directory
mkdir -p "$RESULTS_DIR"

# Ensure Newman is installed
if ! command -v newman &> /dev/null; then
    echo "Newman not found, installing..."
    npm install -g newman newman-reporter-htmlextra
fi

# If environment-specific file doesn't exist, use default
if [ ! -f "$ENVIRONMENT_FILE" ]; then
    echo "Environment file $ENVIRONMENT_FILE not found, using default environment."
    ENVIRONMENT_FILE="ASOOS_API_Environment.json"
    
    # For production deployment, we should have a production environment file
    if [ "$ENVIRONMENT" == "production" ]; then
        echo "⚠️ WARNING: No production environment file found. Using default may not be accurate."
    fi
fi

# Run the tests
echo "Running Newman deployment validation tests for environment: $ENVIRONMENT"
newman run ASOOS_API_Postman_Collection.json \
    --environment "$ENVIRONMENT_FILE" \
    --reporters cli,htmlextra,json \
    --reporter-htmlextra-export "$RESULTS_DIR/newman-report.html" \
    --reporter-json-export "$RESULTS_DIR/newman-results.json"

# Check test results
if [ -f "$RESULTS_DIR/newman-results.json" ]; then
    # Get test statistics
    TOTAL=$(jq '.run.stats.assertions.total' "$RESULTS_DIR/newman-results.json")
    FAILED=$(jq '.run.stats.assertions.failed' "$RESULTS_DIR/newman-results.json")
    
    if [ "$FAILED" -gt 0 ]; then
        PASS_PERCENTAGE=$(( (TOTAL - FAILED) * 100 / TOTAL ))
        echo "❌ API Tests failed with $FAILED failures out of $TOTAL tests."
        echo "Pass rate: $PASS_PERCENTAGE% (required: $THRESHOLD%)"
        echo "See $RESULTS_DIR/newman-report.html for details"
        echo "DEPLOYMENT GATEWAY VALIDATION FAILED. Deployment blocked."
        exit 1
    else
        echo "✅ All $TOTAL API Tests passed successfully!"
        echo "Pass rate: 100% (required: $THRESHOLD%)"
        echo "DEPLOYMENT GATEWAY VALIDATION PASSED. Proceeding with deployment..."
    fi
else
    echo "❌ Test results file not found!"
    exit 1
fi

# Additional deployment validations could be added here
# e.g., security scans, performance tests, etc.

echo "Deployment gateway validation complete."
echo "System is ready for deployment to $ENVIRONMENT."

