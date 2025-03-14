#!/bin/bash
# Setup script for Dr. Memoria's Anthology project

# Create project structure
mkdir -p anthology/src/{core,platforms,automation,utils,models,config}
mkdir -p anthology/src/core/{generators,processors,validators}
mkdir -p anthology/src/platforms/{youtube,kindle,coursera}
mkdir -p anthology/src/automation/{workflows,integrations}
mkdir -p anthology/tests/{unit,integration}

# Create Python virtual environment
python -m venv anthology/venv
source anthology/venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

echo "Project structure created and dependencies installed."
echo "Activate the virtual environment with: source anthology/venv/bin/activate"

# Create requirements.txt file
cat > requirements.txt << 'EOF'
# Core dependencies
aiohttp==3.8.5
asyncio==3.4.3
openai==0.28.0
anthropic==0.3.6
google-api-python-client==2.97.0
google-auth-oauthlib==1.0.0
pinecone-client==2.2.2
firebase-admin==6.2.0
pydantic==2.3.0
python-dotenv==1.0.0

# Web framework
fastapi==0.103.1
uvicorn==0.23.2

# Testing
pytest==7.4.2
pytest-asyncio==0.21.1
pytest-mock==3.11.1

# Blockchain
web3==6.8.0
eth-account==0.8.0

# Utilities
tqdm==4.66.1
loguru==0.7.0
python-dateutil==2.8.2

# Publishing platforms
boto3==1.28.38  # For Kindle
google-auth-httplib2==0.1.0
google-auth-oauthlib==1.0.0
googleapis-common-protos==1.60.0
EOF

# Create .env template
cat > .env.template << 'EOF'
# API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=

# Blockchain Configuration
BLOCKCHAIN_PROVIDER_URL=
BLOCKCHAIN_PRIVATE_KEY=
CONTRACT_ADDRESS_CREATIVE_REGISTRY=

# YouTube API Configuration
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=

# Firebase Configuration
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Application Configuration
MAX_AI_CONTRIBUTION_PERCENTAGE=0.3
MIN_HUMAN_CONTRIBUTION_PERCENTAGE=0.7
EOF

# Create a basic setup.py file
cat > setup.py << 'EOF'
from setuptools import setup, find_packages

setup(
    name="dr-memoria-anthology",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "aiohttp",
        "asyncio",
        "openai",
        "anthropic",
        "pinecone-client",
        "firebase-admin",
        "pydantic",
        "python-dotenv",
    ],
    author="AI Publishing International LLP",
    author_email="pr@coaching2100.com",
    description="Dr. Memoria's Anthology AI Automated Publishing System",
)
EOF

# Create a README.md file
cat > README.md << 'EOF'
# Dr. Memoria's Anthology

An AI Automated Publishing system that implements the Roark 5.0 Authorship Model for human-AI collaborative content creation and multi-platform publishing.

## Setup

1. Clone this repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.template` to `.env` and fill in your API keys and configuration

## Development

- The core implementation is in the `anthology/src/core` directory
- Platform-specific publishing is in the `anthology/src/platforms` directory
- Integration with other systems is in the `anthology/src/automation` directory

## Running Tests

```bash
pytest tests/
```

## Features

- Content Generation Engine with Roark 5.0 Authorship Model
- Multi-Platform Publishing (YouTube, Kindle, Coursera)
- Blockchain verification and NFT creation
- Ethical AI validation and quality control
- Revenue tracking and distribution
EOF

echo "Project files created successfully."
