# =============================================================================
# ASOOS API Testing Framework Makefile
# =============================================================================
#
# This Makefile provides convenient targets for managing the ASOOS API
# testing framework across development and production environments.
#
# Usage:
#   make <target>
#
# Examples:
#   make help              # Show available targets
#   make test-dev          # Run tests against dev environment
#   make test-prod         # Run tests against production environment
#   make token-dev         # Set development API token
#   make token-prod        # Set production API token
#   make clean             # Clean up generated files
#

.PHONY: help test-dev test-prod token-dev token-prod clean setup install-deps

# Set default shell to bash
SHELL := /bin/bash

# Default target
help:
	@echo "ASOOS API Testing Framework"
	@echo "=========================="
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Test Targets
test-dev: ## Run tests against development environment
	@echo "Running tests against development environment..."
	./integration-gateway/ci-gateway.sh dev

test-prod: ## Run tests against production environment
	@echo "Running tests against production environment..."
	./integration-gateway/ci-gateway.sh production

test-all: test-dev test-prod ## Run tests against all environments

# Token Management
token-dev: ## Set development API token (usage: make token-dev TOKEN=your_token)
	@if [ -z "$(TOKEN)" ]; then \
		echo "Error: TOKEN is required. Usage: make token-dev TOKEN=your_token"; \
		exit 1; \
	fi
	@echo "Setting development API token..."
	./set-api-token.sh dev $(TOKEN)

token-prod: ## Set production API token (usage: make token-prod TOKEN=your_token)
	@if [ -z "$(TOKEN)" ]; then \
		echo "Error: TOKEN is required. Usage: make token-prod TOKEN=your_token"; \
		exit 1; \
	fi
	@echo "Setting production API token..."
	./set-api-token.sh production $(TOKEN)

# Setup and Installation
setup: install-deps fix-line-endings ## Set up the testing environment (install dependencies and fix line endings)

install-deps: ## Install required dependencies
	@echo "Installing required dependencies..."
	@if ! command -v newman &> /dev/null; then \
		echo "Installing Newman..."; \
		npm install -g newman newman-reporter-htmlextra; \
	fi
	@if ! command -v dos2unix &> /dev/null; then \
		echo "Installing dos2unix..."; \
		if [[ "$$(uname)" == "Darwin" ]]; then \
			brew install dos2unix; \
		elif [[ "$$(uname)" == "Linux" ]]; then \
			sudo apt-get update && sudo apt-get install -y dos2unix; \
		else \
			echo "Unsupported OS. Please install dos2unix manually."; \
			exit 1; \
		fi \
	fi

fix-line-endings: ## Fix line endings for shell scripts
	@echo "Fixing line endings for shell scripts..."
	find . -name "*.sh" -exec dos2unix {} \;

# Generate Postman Collection
generate-collection: ## Generate the Postman collection
	@echo "Generating Postman collection..."
	python3 create_postman_collection.py

# CI/CD Integration
ci-validate: ## Validate the testing framework for CI/CD
	@echo "Validating testing framework for CI/CD..."
	./run_api_tests.sh

# Cleanup
clean: ## Clean up generated files
	@echo "Cleaning up generated files..."
	rm -rf results
	mkdir -p results
	@echo "Clean complete."

# Check environment health
check-env: ## Check the environment health
	@echo "Checking environment health..."
	@echo "Checking for required tools..."
	@command -v newman &> /dev/null && echo "✓ Newman installed" || echo "✗ Newman not installed"
	@command -v dos2unix &> /dev/null && echo "✓ dos2unix installed" || echo "✗ dos2unix not installed"
	@command -v python3 &> /dev/null && echo "✓ Python3 installed" || echo "✗ Python3 not installed"
	@echo ""
	@echo "Checking for required files..."
	@test -f ASOOS_API_Postman_Collection.json && echo "✓ Postman collection exists" || echo "✗ Postman collection missing"
	@test -f ASOOS_API_Environment_dev.json && echo "✓ Dev environment file exists" || echo "✗ Dev environment file missing"
	@test -f ASOOS_API_Environment_production.json && echo "✓ Production environment file exists" || echo "✗ Production environment file missing"

