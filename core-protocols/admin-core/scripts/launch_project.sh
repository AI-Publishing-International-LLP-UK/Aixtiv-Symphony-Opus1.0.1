#!/bin/bash

# Exit on error
set -e

# Print status messages in color
print_status() {
    echo -e "\033[1;34m>>> $1\033[0m"
}

print_error() {
    echo -e "\033[1;31m>>> Error: $1\033[0m"
    exit 1
}

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
fi

# Install dependencies
install_dependencies() {
    print_status "Installing npm dependencies..."
    npm install || print_error "Failed to install dependencies"
}

# Setup environment file
setup_env() {
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            print_status "Creating .env file from .env.example..."
            cp .env.example .env || print_error "Failed to create .env file"
        else
            print_error ".env.example file not found"
        fi
    else
        print_status ".env file already exists, skipping..."
    fi
}

# Start development server
start_dev_server() {
    print_status "Starting development server..."
    npm run dev || print_error "Failed to start development server"
}

# Main execution
print_status "Starting project setup..."
install_dependencies
setup_env
start_dev_server

exit 0

