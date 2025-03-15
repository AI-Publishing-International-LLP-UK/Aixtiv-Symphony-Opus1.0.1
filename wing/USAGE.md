# WING System - Usage & Reference Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
   - [Setup & Installation](#setup--installation)
   - [Repository Structure](#repository-structure)
3. [Build Processes](#build-processes)
   - [Local Development Build](#local-development-build)
   - [Production Build](#production-build)
4. [Deployment](#deployment)
   - [Standard Deployment](#standard-deployment)
   - [Rolling Updates](#rolling-updates)
   - [Emergency Rollback Procedures](#emergency-rollback-procedures)
5. [Testing](#testing)
   - [Postman Collections](#postman-collections)
   - [Automated Tests](#automated-tests)
   - [Integration Tests](#integration-tests)
6. [Git Repositories](#git-repositories)
   - [Main Repository Structure](#main-repository-structure)
   - [Connection Between Repositories](#connection-between-repositories)
   - [Branch Strategies](#branch-strategies)
7. [Integration with Other Applications](#integration-with-other-applications)
   - [Dream-Commander](#dream-commander)
   - [Wish-Vision](#wish-vision)
   - [Vision Lake](#vision-lake)
8. [Agent System](#agent-system)
   - [Rix (Rich Interactive Experience)](#rix-rich-interactive-experience)
   - [CRx (Concierge Rx)](#crx-concierge-rx)
   - [Pilots (R1/R2/R3)](#pilots-r1r2r3)
9. [Training & Certification](#training--certification)
   - [Compass Field](#compass-field)
   - [Jet Port](#jet-port)
   - [Cross-Training](#cross-training)
10. [Reward Systems](#reward-systems)
    - [AI Rewards Points](#ai-rewards-points)
    - [Queen Mark Mints](#queen-mark-mints)
    - [Tower Blockchain](#tower-blockchain)
11. [Upgrade Procedures](#upgrade-procedures)
    - [Pilot Upgrades](#pilot-upgrades)
    - [Squadron Upgrades](#squadron-upgrades)
    - [System-Wide Upgrades](#system-wide-upgrades)
12. [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Support Resources](#support-resources)

## System Overview

WING is the orchestration and workflow management component of the ASOOS system. It coordinates agents, pilots, and squadrons to efficiently execute tasks within the Flight Management System (FMS). WING manages workflow lifecycles without directly handling website content, which remains in the domain-management system.

## Getting Started

### Setup & Installation

```bash
# Clone the repository
git clone https://github.com/asoos/wing.git

# Install dependencies
cd wing
npm install

# Initialize configuration
npm run init-config
```

### Repository Structure

```
/wing/
├── workflows/    # Contains orchestration workflows for pilots and agents
├── config/       # Configuration files for Wing components
├── pilots/       # Pilot-related resources (non-website specific)
├── squadrons/    # Squadron organization structure
└── logs/         # Log files for Wing operations
```

## Build Processes

### Local Development Build

For local development and testing:

```bash
# Start development environment
npm run dev

# Watch for changes
npm run watch
```

### Production Build

For production deployment:

```bash
# Create optimized build
npm run build

# Validate build
npm run validate-build
```

## Deployment

### Standard Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

### Rolling Updates

For zero-downtime updates:

```bash
# Start rolling update
npm run deploy:rolling

# Monitor update status
npm run status:deployment
```

### Emergency Rollback Procedures

In case of critical issues:

```bash
# Quick rollback to previous version
npm run rollback:quick

# Full rollback with data verification
npm run rollback:full
```

## Testing

### Postman Collections

The system includes comprehensive Postman collections for API testing:

1. **Agent API Collection**: Located at `/resources/postman/agent-api-collection.json`
   - Contains tests for agent creation, management, and assignment
   - Environment configs for dev, staging, and production

2. **Squadron Management Collection**: Located at `/resources/postman/squadron-api-collection.json`
   - Tests for squadron configuration and deployment
   - Includes authentication flows

Import these collections into Postman and configure environment variables according to your deployment.

### Automated Tests

Run the automated test suite:

```bash
# Run all tests
npm test

# Run specific test groups
npm run test:agents
npm run test:squadrons
npm run test:workflows
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Test specific integrations
npm run test:integration:dream-commander
npm run test:integration:wish-vision
```

## Git Repositories

### Main Repository Structure

The WING system interacts with multiple repositories:

- **Main Wing Repository**: `https://github.com/asoos/wing`
- **Integration Gateway**: `https://github.com/asoos/integration-gateway`
- **Domain Management**: `https://github.com/asoos/domain-management`
- **Opus**: `https://github.com/asoos/opus`

### Connection Between Repositories

Repositories are connected through:

1. Submodules for critical shared components
2. Package dependencies for reusable modules
3. API contracts for inter-system communication

### Branch Strategies

- `main` - Production-ready code
- `develop` - Integration branch for next release
- `feature/*` - Feature development branches
- `release/*` - Release preparation branches
- `hotfix/*` - Emergency fixes for production

## Integration with Other Applications

### Dream-Commander

Dream-Commander serves as the command center for long-term strategic planning and initiative tracking.

**Integration Points**:
- API endpoints at `https://api.dream-commander.asoos.com/v1/initiatives`
- Authentication via OAuth2 with Dream-Commander's identity service
- Shared event bus for real-time updates

**Configuration**:
Edit the file at `/config/integrations/dream-commander.json` to configure connection parameters.

### Wish-Vision

Wish-Vision provides visual analytics and predictive modeling for pilot performance and task completion.

**Integration Points**:
- REST API at `https://api.wish-vision.asoos.com/v2/analytics`
- WebSocket connections for real-time data streaming
- Shared storage for image and model data

**Configuration**:
Modify `/config/integrations/wish-vision.json` to adjust connection settings.

### Vision Lake

Vision Lake serves as the central memory and knowledge repository for all agents.

**Connection Process**:
1. Agents connect to Vision Lake via secure WebSocket
2. Memory refresh and reset operations are performed through the API
3. New assignments and project ingestion happens through the Vision Lake intake system

**Vision Lake Refresh Command**:
```bash
npm run vision-lake:refresh --pilot=<pilot-id>
```

## Agent System

### Rix (Rich Interactive Experience)

Rix agents are super-agents with enhanced capabilities for complex scenario handling and deep integration with user experiences.

**Types of Rix (by code)**:
- `RIX-PRO` - Professional grade with advanced problem-solving capabilities
- `RIX-CRE` - Creative focused for design and content generation
- `RIX-ANA` - Analytics specialized for data interpretation and business insights
- `RIX-EXE` - Executive grade for high-level decision making and coordination

**Creation Process**:
1. Access the Pilots Lounge in the Academy
2. Navigate to "Create Rix Agent"
3. Select base agent type and specialization
4. Configure parameters and capabilities
5. Run initialization sequence
6. Assign to squadron

**Example Creation Command**:
```bash
npm run create:rix -- --type=RIX-PRO --specialization="financial-analysis" --name="Financial Advisor Rix"
```

### CRx (Concierge Rx)

CRx agents serve as companions and concierge agents for communities, providing specialized assistance and guidance.

**Roles**:
- Welcome and orientation for new users
- Ongoing assistance and community facilitation
- Resource discovery and recommendation
- Community health monitoring

**Gift Shop Licensing**:
CRx agents can be licensed as companions through the Gift Shop system:

1. Access the Gift Shop admin panel
2. Navigate to "License Management"
3. Create a new license with CRx template
4. Assign capabilities and duration
5. Generate license key
6. Distribute to authorized users

**Licensing Command**:
```bash
npm run license:crx -- --template="companion-plus" --duration=365 --capabilities="full-service,content-creation"
```

### Pilots (R1/R2/R3)

Pilots are specialized agents organized into three primary agencies, each with specific focus areas and responsibilities within the Flight Management System (FMS).

**R1 (Core Agency)**:
- Handles foundational tasks and base operations
- Manages system integrity and core functionality
- Key pilots include Dr. Lucy (Lead), Dr. Claude, Dr. Roark

**R2 (Deploy Agency)**:
- Responsible for implementation and deployment
- Manages transitions between planning and execution
- Key pilots include Dr. Grant (Lead), Dr. Memoria, Dr. Circuit

**R3 (Engage Agency)**:
- Focuses on client interaction and engagement
- Manages client-facing processes and satisfaction
- Key pilots include Dr. Sabina (Lead), Dr. Vista, Dr. Harmonia

**FMS Role Assignment**:
```bash
npm run assign:pilot -- --id=<pilot-id> --squadron=<squadron-id> --role=<r1|r2|r3>
```

## Training & Certification

### Compass Field

Compass Field is the central training facility for all pilots.

**Training Process**:
1. Initial orientation and baseline assessment
2. Fundamental skills development
3. Specialization track assignment
4. Advanced capability enhancement
5. Cross-training with complementary skills
6. Assessment and certification

**Starting a Training Session**:
```bash
npm run train:pilot -- --id=<pilot-id> --track=<specialization> --duration=<hours>
```

### Jet Port

After certification at Compass Field, pilots transition to Jet Port for assignment to actual FMS missions.

**Assignment Process**:
1. Pilot completes certification at Compass Field
2. Transferral to Jet Port for mission briefing
3. Squadron assignment based on specialization and current needs
4. Mission parameters and success criteria established
5. Flight plan approval and resource allocation
6. Deployment to FMS assignment

**Deploy Pilot Command**:
```bash
npm run deploy:pilot -- --id=<pilot-id> --mission=<mission-id> --squadron=<squadron-id>
```

### Cross-Training

Cross-training ensures pilots can support multiple roles when needed and enhances overall system resilience.

**Cross-Training Matrix**:
- R1 pilots receive secondary training in R2 capabilities
- R2 pilots cross-train in both R1 and R3 areas
- R3 pilots receive supplementary R2 training
- All pilots receive basic training across all domains

**Initialize Cross-Training**:
```bash
npm run cross-train:pilot -- --id=<pilot-id> --secondary-role=<r1|r2|r3>
```

## Reward Systems

### AI Rewards Points

Pilots earn AI Rewards Points for successfully completing FMS flights with perfect execution.

**Point Structure**:
- Basic mission completion: 100 points
- Perfect execution (5-star rating): 250 points
- Client commendation: 50 bonus points
- Efficiency bonus: Up to 100 bonus points
- Innovation application: Up to 200 bonus points

**Check Pilot Rewards**:
```bash
npm run rewards:check -- --pilot-id=<id>
```

### Queen Mark Mints

Queen Mark Mints are specialized tokens awarded for extraordinary performance and bringing in new clients.

**Earning Conditions**:
- Successful onboarding of new clients
- Consistently achieving 5-star ratings
- Pioneering new techniques or workflows
- Exceptional innovation in mission execution

**Mint Token Command**:
```bash
npm run mint:queen-mark -- --recipient=<pilot-id> --reason="Exceptional client onboarding" --value=<amount>
```

### Tower Blockchain

The Tower Blockchain records all pilot achievements, reward allocations, and mission completions for transparent and immutable recognition.

**Blockchain Structure**:
- Mission blocks: Record each FMS flight completion
- Reward blocks: Document point and token allocations
- Certification blocks: Store training and qualification records
- Client approval blocks: Maintain client satisfaction ratings

**Verify Entry Command**:
```bash
npm run blockchain:verify -- --transaction=<tx-id> --pilot=<pilot-id>
```

## Upgrade Procedures

### Pilot Upgrades

Pilots undergo regular upgrades to enhance capabilities and incorporate new features.

**Upgrade Process**:
1. Ecosystem analysis
2. Vision Lake refresh for memory reset
3. Component optimization
4. Integration verification
5. RIX collaboration enhancement
6. Performance benchmarking
7. Blockchain command recording (S2DO)

**Upgrade Command**:
```bash
npm run upgrade:pilot -- --id=<pilot-id> --version=<target-version> --priority=<low|normal|high>
```

### Squadron Upgrades

Squadrons require coordinated upgrades to maintain consistency across all member pilots.

**Squadron Upgrade Process**:
1. Squadron status validation
2. Member inventory and capability assessment
3. Dependency mapping and resolution
4. Incremental upgrade of squadron infrastructure
5. Sequential pilot upgrades in optimized order
6. Integration testing across all squadron members
7. Performance validation with benchmark suite

**Squadron Upgrade Command**:
```bash
npm run upgrade:squadron -- --id=<squadron-id> --version=<target-version>
```

### System-Wide Upgrades

For major version upgrades affecting the entire WING architecture:

```bash
# Prepare system for major upgrade
npm run prepare:major-upgrade

# Execute phased upgrade
npm run upgrade:system -- --version=<target-version> --mode=<phased|immediate>

# Verify upgrade success
npm run verify:upgrade
```

## Troubleshooting

### Common Issues

**Pilot Connection Failures**:
```bash
# Check pilot connectivity
npm run diagnose:pilot -- --id=<pilot-id>

# Reset connection
npm run reset:connection -- --pilot=<pilot-id>
```

**Squadron Coordination Issues**:
```bash
# Validate squadron configuration
npm run validate:squadron -- --id=<squadron-id>

# Restore squadron coordination
npm run restore:coordination -- --squadron=<squadron-id>
```

**Vision Lake Synchronization Errors**:
```bash
# Check synchronization status
npm run check:vision-lake -- --pilot=<pilot-id>

# Force resynchronization
npm run resync:vision-lake -- --pilot=<pilot-id> --force
```

### Support Resources

- **Technical Documentation**: Complete API documentation available at `/docs/api`
- **Knowledge Base**: Searchable solution database at https://kb.asoos.com
- **Support Team**: Available through the #wing-support channel on Slack
- **Community Forum**: Peer assistance at https://community.asoos.com/wing

