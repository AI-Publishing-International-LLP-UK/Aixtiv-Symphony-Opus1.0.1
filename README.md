# ASOOS API Testing Framework

A comprehensive testing framework for validating ASOOS API endpoints across different environments.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Setup](#setup)
- [Usage](#usage)
  - [Managing Authentication Tokens](#managing-authentication-tokens)
  - [Running Tests Locally](#running-tests-locally)
  - [Environment-Specific Testing](#environment-specific-testing)
- [CI/CD Integration](#cicd-integration)
  - [GitHub Actions](#github-actions)
  - [Jenkins](#jenkins)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Postman Collection](#postman-collection)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

The ASOOS API Testing Framework provides automated validation of API endpoints across development, staging, and production environments. It uses Postman collections with Newman for executing API tests, generates detailed reports, and integrates with CI/CD pipelines for continuous validation.

Key features:
- Environment-specific configurations
- Secure token management
- Test assertions for status codes and response validation
- Integration with CI/CD pipelines (GitHub Actions, Jenkins)
- Detailed test reports in multiple formats (CLI, HTML, JSON)

## Installation

### Prerequisites

- Node.js 14+ and npm
- Postman (for local development and testing)
- Newman CLI (installed automatically by the scripts when needed)

### Clone the Repository

```bash
git clone https://github.com/your-org/asoos-api-testing.git
cd asoos-api-testing
```

## Setup

1. **Install dependencies**

```bash
make setup
```

2. **Configure environment variables**

Create environment-specific configurations:

```bash
# Copy the template files
cp ASOOS_API_Environment.json ASOOS_API_Environment_dev.json
cp ASOOS_API_Environment.json ASOOS_API_Environment_production.json
```

3. **Set authentication tokens**

```bash
# For development environment
./set-api-token.sh dev your_dev_token_here

# For production environment
./set-api-token.sh production your_prod_token_here
```

## Usage

### Managing Authentication Tokens

Use the `set-api-token.sh` script to securely manage API tokens:

```bash
# Set token for development environment
./set-api-token.sh dev your_dev_token_here

# Set token for production environment
./set-api-token.sh production your_prod_token_here

# Get help about the script
./set-api-token.sh --help
```

The script automatically updates the respective environment file with your token and creates a backup before making any changes.

### Running Tests Locally

Use the provided scripts or Makefile to run tests:

```bash
# Using the gateway scripts directly
./integration-gateway/ci-gateway.sh dev

# Using make (recommended)
make test-dev
make test-prod
```

### Environment-Specific Testing

The framework supports multiple environments:

```bash
# Test against development environment
make test-dev

# Test against production environment
make test-prod

# Run specific test suites
make test-dev TESTS=health,status
```

## CI/CD Integration

### GitHub Actions

The repository includes a GitHub Actions workflow in `.github/workflows/api-integration-tests.yml` that runs API tests on:
- Pull requests to main/develop branches
- Pushes to main/develop branches

The workflow:
1. Sets up Node.js environment
2. Installs Newman and dependencies
3. Runs the API tests
4. Uploads test results as artifacts

### Jenkins

A `Jenkinsfile` is provided for Jenkins pipeline integration. The pipeline:
1. Checks out the repository
2. Sets up the Node.js environment
3. Runs the API tests
4. Publishes HTML reports
5. Fails the build if tests don't pass

## Configuration

### Environment Variables

The following environment variables can be used to configure the test runs:

| Variable | Description | Default |
|----------|-------------|---------|
| `API_ENV` | Target environment (dev, staging, prod) | `dev` |
| `REPORT_DIR` | Directory for test reports | `./reports` |
| `TEST_TIMEOUT` | Timeout for tests in milliseconds | `10000` |

### Postman Collection

The Postman collection (`ASOOS_API_Postman_Collection.json`) contains all test specifications:

- **Health Check**: Validates API health endpoint
- **Status Check**: Validates API status endpoint
- **API Documentation**: Validates API documentation endpoint

To modify test assertions or add new endpoints:
1. Import the collection into Postman
2. Make your changes
3. Export and replace the collection file

## Troubleshooting

### Common Issues

#### Line Ending Issues in Shell Scripts

If you encounter errors like `bad interpreter: /bin/bash^M`:

```bash
# Fix line endings
dos2unix *.sh
dos2unix integration-gateway/*.sh
```

#### Authentication Failures

If tests fail with 401 Unauthorized errors:

1. Verify your token is set correctly with `set-api-token.sh`
2. Check that the token is valid and not expired
3. Verify the token has the necessary permissions

#### Newman Not Found

If you get "newman command not found" errors:

```bash
# Install newman globally
npm install -g newman newman-reporter-html
```

### Debugging Tests

For more detailed output:

```bash
# Run with verbose logging
make test-dev VERBOSE=true

# Examine raw response data
make test-dev EXPORT_RESPONSES=true
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

---

For additional support, please contact the ASOOS API team.

# ASOOS API Testing

This repository contains API testing scripts and CI/CD integration for the ASOOS platform.

## Testing Components

- Postman Collection: `ASOOS_API_Postman_Collection.json`
- Environment Files: `ASOOS_API_Environment.json`
- CI/CD Integration:
  - GitHub Actions: `.github/workflows/api-integration-tests.yml`
  - Jenkins: `Jenkinsfile`
  - Integration Gateway: `integration-gateway/ci-gateway.sh`
  - Deployment Gateway: `integration-gateway/deployment-gateway.sh`

## Setup and Usage

### Local Testing

To run tests locally:

1. Install Newman: `npm install -g newman newman-reporter-htmlextra`
2. Execute: `./run_api_tests.sh`

### CI/CD Integration

#### GitHub Actions

Tests will automatically run on:
- Push to main or develop branches
- Pull requests to main or develop branches
- Manual trigger via GitHub Actions UI

#### Jenkins

The Jenkinsfile will:
- Set up the testing environment
- Run the Newman tests
- Process and publish results
- Fail the build if tests don't pass

#### Integration Gateway

Run integration tests during development:

```
./integration-gateway/ci-gateway.sh [environment]
```

Environment options: dev, staging, production (default: dev)

#### Deployment Gateway

Validate before deployment:

```
./integration-gateway/deployment-gateway.sh [environment]
```

Environment options: dev, staging, production (default: production)

## Test Results

Results are stored in:
- Integration testing: `results/`
- Deployment validation: `results/deployment-validation/`

HTML reports are available after test execution.

## Customization

To modify the API endpoints or test assertions, edit the Postman collection file.

# Aixtiv Symphony Opus Operating System (ASOOS)

## Overview

The Aixtiv Symphony Opus Operating System (ASOOS) is an advanced multi-tiered architecture designed to seamlessly integrate and orchestrate the 7 Opuses of the Aixtiv Symphony ecosystem. This system serves as the central backbone for all operations, providing a robust, scalable, and secure infrastructure for agent-driven operating processes.

## Architecture Principles

### Separation of Concerns
- **Modular Design**: Each component has a single, well-defined responsibility
- **Clear Boundaries**: Distinct separation between infrastructure, application logic, and presentation layers
- **Domain-Driven Design**: Business logic organized around real-world domains represented by the 7 Opuses

### Zero-Trust Security Model
- **Always Verify**: No implicit trust between system components
- **Least Privilege**: Components only have access to the resources they absolutely need
- **Defense in Depth**: Multiple security layers protecting critical assets

### Event-Driven Communication
- **Loose Coupling**: Services communicate through events, reducing dependencies
- **Asynchronous Processing**: Non-blocking operations for improved scalability
- **Central Event Bus**: Standardized message routing across all system components

### Infrastructure as Code
- **Reproducible Environments**: All infrastructure defined as code
- **Version Controlled**: Infrastructure changes tracked alongside application code
- **Automated Provisioning**: Consistent deployment across environments

### Observability First
- **Comprehensive Monitoring**: Real-time system health insights
- **Distributed Tracing**: End-to-end visibility into request flows
- **Centralized Logging**: Aggregated logs with correlation IDs

## Directory Structure

```
/Users/as/asoos/
├── infrastructure/           # Core infrastructure components
│   ├── core/                 # Fundamental infrastructure components
│   │   ├── network/          # Network configurations
│   │   └── security/         # Security policies and configurations
│   ├── platforms/            # Platform-specific configurations
│   └── secrets/              # Secret management infrastructure
│       ├── vault/            # Vault configuration
│       └── rotation/         # Secret rotation policies
│
├── backend/                  # Backend services and APIs
│   ├── services/             # Microservices implementations
│   ├── api/                  # API definitions
│   │   ├── graphql/          # GraphQL API specifications
│   │   ├── rest/             # REST API endpoints
│   │   └── grpc/             # gRPC service definitions
│   └── shared/               # Shared libraries and utilities
│       ├── utils/            # Utility functions and helpers
│       ├── models/           # Shared data models
│       └── interfaces/       # TypeScript interfaces
│
├── integration-gateway/      # Integration with external systems
│   ├── adapters/             # Service adapters
│   ├── connectors/           # External system connectors
│   ├── transformers/         # Data transformation logic
│   └── security/             # Integration security
│
├── opus/                     # Opus-specific components
│   ├── academy/              # Academy module (white-labeled)
│   ├── version-1.0.1/        # Opus 1 - AI-Driven Productivity
│   ├── version-2.0.1/        # Opus 2 - Community Wealth
│   └── version-3.0.1/        # Opus 3 - AI & The Law
│   └── ...                   # Additional Opus versions
│
├── frontend/                 # Frontend applications
│   ├── shared/               # Shared UI components
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # React hooks
│   │   ├── state/            # State management
│   │   └── utils/            # Frontend utilities
│   └── apps/                 # Frontend applications
│       ├── opus1/            # Opus 1 frontend
│       └── ...               # Additional Opus frontends
│
├── data/                     # Data management layer
│   ├── storage/              # Data storage configurations
│   ├── processing/           # Data processing pipelines
│   ├── analytics/            # Data analytics components
│   └── integration/          # Data integration tools
│
├── devops/                   # DevOps resources
│   ├── ci-cd/                # CI/CD configurations
│   ├── iac/                  # Infrastructure as Code templates
│   ├── deployment/           # Deployment configurations
│   └── testing/              # Test frameworks and configurations
│
└── secrets/                  # Secret management
    ├── environments/         # Environment-specific secrets
    ├── tiers/                # Security tier configurations
    ├── rotation/             # Secret rotation policies
    └── audit/                # Audit logging for secret access
```

## Security Model

The ASOOS security model implements a comprehensive approach to security, encompassing:

### Identity and Access Management
- **Role-Based Access Control**: Eight-tier security hierarchy from SAO (Super Admin Owner) to team-level roles
- **Just-in-Time Access**: Temporary elevated privileges with automatic expiration
- **Integration with External Identity Providers**: 
  - Dr. Grant's Authentication for user verification
  - Sally Port for secure access management
  - Dr. Match LinkedIn App for professional profile integration

### Data Protection
- **Encryption at Rest**: All sensitive data encrypted in storage
- **Encryption in Transit**: TLS for all service-to-service communication
- **Field-Level Encryption**: Extra protection for PII and sensitive data fields

### API Security
- **API Gateways**: Centralized authentication and authorization
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Request Validation**: Schema validation and input sanitization

### Audit and Compliance
- **Comprehensive Logging**: All security events logged with preservation of evidence
- **Non-Repudiation**: Cryptographic proof of actions performed
- **Compliance Frameworks**: Support for GDPR, HIPAA, SOC2, and other regulatory requirements

## Integration Patterns

ASOOS employs several integration patterns to ensure seamless operation across the entire system:

### Event-Driven Integration
- **EventBus**: Central event message bus for system-wide communication
- **Command/Query Responsibility Segregation (CQRS)**: Separate models for reading and writing data
- **Event Sourcing**: State changes captured as a sequence of events

### API-Led Connectivity
- **System APIs**: Core backend functionality exposed as reusable APIs
- **Process APIs**: Business processes orchestrating multiple System APIs
- **Experience APIs**: Tailored API endpoints for specific frontend applications

### Adapter Pattern
- **Legacy System Integration**: Adapters for existing systems
- **Third-Party Service Adapters**: Standardized interfaces for external services
- **Protocol Adapters**: Convert between different communication protocols

### User Analysis Integration
- **Serpew + Sentiment Analysis**: Understanding user context and intent
- **HOBMDIHO Datasets**: Behavioral analysis and personalization

## Guidelines for Developers

### Getting Started
1. Familiarize yourself with the ASOOS architecture and directory structure
2. Set up development environment with required dependencies
3. Follow the security practices outlined in the security model

### Development Workflow
1. **Feature Development**:
   - Create feature branch from development branch
   - Implement feature following architecture principles
   - Write tests covering new functionality
   - Submit PR for code review

2. **Code Organization**:
   - Place code in appropriate directories based on functionality
   - Maintain separation of concerns
   - Use dependency injection for component coupling
   - Follow established naming conventions

3. **Security Practices**:
   - Never hardcode secrets or credentials
   - Use the secret management system for all sensitive data
   - Apply principle of least privilege
   - Validate all input data

4. **Testing Requirements**:
   - Unit tests for individual components
   - Integration tests for component interactions
   - End-to-end tests for critical workflows
   - Performance tests for throughput and latency

### Event-Driven Development
1. **Event Definition**:
   - Define events with clear semantics
   - Version events for forward compatibility
   - Document event schemas

2. **Event Production**:
   - Publish events through the EventBus
   - Include correlation IDs for traceability
   - Add appropriate metadata for event processing

3. **Event Consumption**:
   - Subscribe to events using the EventBus
   - Implement idempotent event handlers
   - Handle failures gracefully with dead letter queues

## Key Features

### Academy as the Central UI/UX Hub
- White-labeled UI for each Opus
- Unified learning and operational platform
- Integration with Distinguished Pilots

### Event-Driven Architecture
- Real-time system updates
- Loose coupling between components
- Scalable and resilient communication

### Multi-Tier Security Model
- Defense in depth security approach
- Granular access control
- Comprehensive audit and compliance

### Observability and Monitoring
- End-to-end request tracing
- Centralized logging
- Real-time system metrics

### DevOps Integration
- CI/CD pipeline integration
- Infrastructure as Code
- Automated testing and deployment

## Conclusion

The ASOOS architecture provides a robust, secure, and scalable foundation for the Aixtiv Symphony ecosystem. By adhering to these architectural principles and guidelines, developers can create cohesive, maintainable, and high-quality components that work seamlessly within the larger system.

## Dr. Lucy Automation Testing

Dr. Lucy Automation is a next-generation AI-powered assistant dedicated to optimizing workflows, automating processes, and enhancing collaboration across teams. As a GitHub App, Dr. Lucy Automation helps manage repository activities and streamline development processes.

### Key Capabilities

- **Workflow Automation**: Manages GitHub Actions to streamline CI/CD pipelines, testing, and deployments
- **Task Management**: Automates routine tasks like issue triage, pull request reviews, and release scheduling
- **Intelligent Insights**: Provides actionable analytics from repository activity for smarter decision-making
- **API Integrations**: Extends functionality with OpenAI and other APIs for creative and analytical tasks

### Testing Process

To validate Dr. Lucy Automation functionality, we test the following workflows:

1. **Pull Request Automation**:
   - Auto-labeling PRs based on size and content
   - Providing automated code reviews with recommendations
   - Checking PR description completeness

2. **Issue Management**:
   - Welcoming users who open new issues
   - Automatically categorizing issues based on content
   - Applying appropriate labels (bug, enhancement, priority)

3. **Dependabot PR Handling**:
   - Auto-approving and merging minor and patch updates
   - Adding detailed information about dependency changes

The automated workflows are defined in `.github/workflows/dr-lucy-automation.yml` and are triggered by relevant GitHub events such as pull request activities, issue activities, and Dependabot alerts.
