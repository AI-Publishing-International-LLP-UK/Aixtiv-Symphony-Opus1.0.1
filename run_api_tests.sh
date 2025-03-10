#!/bin/bash

# run_api_tests.sh - Run Postman collections using Newman against different environments
# Usage: ./run_api_tests.sh [environment]
# Example: ./run_api_tests.sh dev

# Set default environment if not provided
ENVIRONMENT=${1:-"dev"}
VALID_ENVIRONMENTS=(dev staging production)

# Check if the provided environment is valid
is_valid_env=false
for env in "${VALID_ENVIRONMENTS[@]}"; do
  if [[ "$ENVIRONMENT" == "$env" ]]; then
    is_valid_env=true
    break
  fi
done

if [[ "$is_valid_env" == "false" ]]; then
  echo "❌ Error: Invalid environment '$ENVIRONMENT'. Valid options are: ${VALID_ENVIRONMENTS[*]}"
  exit 1
fi

echo "\U0001F680 Running API tests against $ENVIRONMENT environment..."

# Collection and environment file paths
COLLECTION_FILE="ASOOS_API_Postman_Collection.json"
ENVIRONMENT_FILE="ASOOS_API_Environment_${ENVIRONMENT}.json"

# Support for custom environment file path if specified as second argument
if [[ -n "$2" && -f "$2" ]]; then
  echo "🔄 Using custom environment file: $2"
  ENVIRONMENT_FILE="$2"
fi

# Check if files exist
if [[ ! -f "$COLLECTION_FILE" ]]; then
  echo "❌ Error: Collection file '$COLLECTION_FILE' not found!"
  exit 1
fi

if [[ ! -f "$ENVIRONMENT_FILE" ]]; then
  echo "❌ Error: Environment file '$ENVIRONMENT_FILE' not found!"
  echo "📝 Available environment files:"
  find . -name "ASOOS_API_Environment_*.json" -exec basename {} \; | sed 's/^/   - /'
  exit 1
fi

# Validate JSON files to ensure they're properly formatted
echo "🔍 Validating JSON files..."
if ! jq empty "$COLLECTION_FILE" 2>/dev/null; then
  echo "❌ Error: Invalid JSON in collection file '$COLLECTION_FILE'"
  exit 1
fi

if ! jq empty "$ENVIRONMENT_FILE" 2>/dev/null; then
  echo "❌ Error: Invalid JSON in environment file '$ENVIRONMENT_FILE'"
  exit 1
fi

# Create results directory if it doesn't exist
RESULTS_DIR="newman-results/${ENVIRONMENT}"
mkdir -p "$RESULTS_DIR"

# Check if required tools are installed
if ! command -v jq &> /dev/null; then
  echo "⚙️ jq not found. Installing..."
  if command -v brew &> /dev/null; then
    brew install jq
  elif command -v apt-get &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y jq
  elif command -v yum &> /dev/null; then
    sudo yum install -y jq
  else
    echo "❌ Error: Unable to install jq. Please install it manually."
    exit 1
  fi
fi

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
  echo "⚙️ Newman not found. Installing..."
  npm install -g newman newman-reporter-htmlextra
fi

# Run Newman with the appropriate environment
echo "▶️ Executing tests with Newman..."
newman run "$COLLECTION_FILE" \
  --environment "$ENVIRONMENT_FILE" \
  --reporters cli,htmlextra,json \
  --reporter-htmlextra-export "$RESULTS_DIR/report.html" \
  --reporter-json-export "$RESULTS_DIR/report.json"

# Capture exit code
EXIT_CODE=$?

# Report results
if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✅ All API tests passed successfully!"
  echo "\U0001F4CA HTML report generated at: $RESULTS_DIR/report.html"
else
  echo "❌ Some tests failed! Check the report for details."
  echo "\U0001F4CA HTML report generated at: $RESULTS_DIR/report.html"
  
  # Parse JSON report to extract failing tests
  if [[ -f "$RESULTS_DIR/report.json" ]]; then
    FAILED_COUNT=$(jq '.run.stats.assertions.failed' "$RESULTS_DIR/report.json")
    if [[ $FAILED_COUNT -gt 0 ]]; then
      echo "\U0001F6A8 Failed tests summary:"
      jq -r '.run.executions[] | select(.assertions | map(select(.error)) | length > 0) | "   - \(.item.name): \(.assertions | map(select(.error)) | .[].error)"' "$RESULTS_DIR/report.json"
    fi
  fi
fi

# Return the exit code from Newman for CI/CD pipelines
exit $EXIT_CODE
