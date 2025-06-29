# SD20 System Implementation Guide

## Overview

The SD20 System (based on the S2DO paradigm) is a blockchain-powered verification framework designed to manage agent-human interactions with security, transparency, and accountability. This guide provides step-by-step instructions for implementing the system in your organization.

## System Architecture

SD20 consists of four core components:

1. **Core Verification Engine**: Manages actions, participants, and verification workflows
2. **Blockchain Layer**: Provides immutable record-keeping and NFT generation
3. **Interface Layer**: QR codes, notifications, and user interfaces
4. **Integration Layer**: Connects with existing business systems

![SD20 Architecture](https://placeholder-for-system-architecture-diagram.png)

## Prerequisites

Before implementing SD20, ensure you have:

- A blockchain infrastructure (Ethereum, Polygon, or other EVM-compatible chain)
- Smart contract deployment capabilities
- User authentication system
- API infrastructure for integrations
- Mobile capabilities for QR scanning (optional but recommended)

## Implementation Steps

### 1. Deploy Smart Contracts

First, deploy the SD20 smart contracts to your blockchain:

```bash
# Install dependencies
npm install @sd20/contracts

# Configure deployment
cp .env.example .env
# Edit .env with your blockchain configuration

# Deploy contracts
npx hardhat run scripts/deploy.js --network your-network
```

This deploys:
- SD20ActionVerification Contract
- SD20NFT Contract

Save the deployed contract addresses for later configuration.

### 2. Set Up Backend Services

Install the core SD20 packages:

```bash
npm install @sd20/core @sd20/blockchain @sd20/services
```

Initialize the core services:

```typescript
import { 
  SD20Service, 
  BlockchainService, 
  QRCodeService, 
  NotificationService 
} from '@sd20/core';

// Configure blockchain service
const blockchainService = new BlockchainService({
  rpcUrl: 'https://your-blockchain-rpc-url',
  privateKey: process.env.PRIVATE_KEY,
  actionContractAddress: '0x...',  // From step 1
  nftContractAddress: '0x...',     // From step 1
});

// Configure QR service
const qrCodeService = new QRCodeService({
  secretKey: process.env.QR_SECRET_KEY,
});

// Configure notification service
const notificationService = new NotificationService({
  emailProvider: {
    apiKey: process.env.EMAIL_API_KEY,
    fromEmail: 'notifications@yourdomain.com',
  },
  pushProvider: {
    apiKey: process.env.PUSH_API_KEY,
  },
});

// Initialize SD20 service
const sd20Service = new SD20Service(
  blockchainService,
  qrCodeService,
  notificationService
);

export default sd20Service;
```

### 3. Set Up User Authentication

Integrate SD20 with your existing user authentication system:

```typescript
import { Participant } from '@sd20/core';

// When a user logs in
function onUserLogin(user) {
  // Create participant from user data
  const participant: Participant = {
    id: user.id,
    name: user.displayName,
    walletAddress: user.walletAddress,
    roles: user.roles,
    isAgent: false,
    publicKey: user.publicKey,
  };
  
  // Register participant with SD20
  sd20Service.registerParticipant(participant);
  
  // Register contact info for notifications
  sd20Service.registerParticipantContact(user.id, {
    email: user.email,
    deviceToken: user.deviceToken,
    notificationPreferences: user.notificationPreferences,
  });
}
```

### 4. Implement Agent Integration

For AI agents in your system:

```typescript
import { Participant } from '@sd20/core';

// Register each AI agent
function registerAgent(agent) {
  const agentParticipant: Participant = {
    id: `agent-${agent.id}`,
    name: agent.name,
    walletAddress: process.env.AGENT_WALLET_ADDRESS,
    roles: agent.capabilities,
    isAgent: true,
    publicKey: agent.publicKey,
  };
  
  sd20Service.registerParticipant(agentParticipant);
}

// When an agent needs to create an action
async function agentCreateAction(agent, actionType, parameters) {
  return sd20Service.createActionRequest(
    actionType,  // e.g., "S2DO:Create:Content"
    {id: `agent-${agent.id}`},
    parameters.description,
    parameters.data,
    parameters.metadata,
    parameters.verificationRequirement
  );
}
```

### 5. Set Up API Endpoints

Create API endpoints for your frontend:

```typescript
// Express.js example
import express from 'express';
const router = express.Router();

// Get pending actions for a user
router.get('/actions/pending', authMiddleware, async (req, res) => {
  const actions = await sd20Service.queryActions({
    status: 'pending',
    verifierIds: [req.user.id],
  });
  
  res.json(actions);
});

// Verify an action
router.post('/actions/:id/verify', authMiddleware, async (req, res) => {
  try {
    const result = await sd20Service.verifyAction(
      req.params.id,
      req.user.id,
      req.body.approved,
      req.body.signature,
      req.body.notes
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create a new action
router.post('/actions', authMiddleware, async (req, res) => {
  try {
    const action = await sd20Service.createActionRequest(
      req.body.action,
      {id: req.user.id},
      req.body.description,
      req.body.parameters,
      req.body.metadata,
      req.body.verificationRequirement
    );
    
    res.json(action);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### 6. Implement QR Code Scanning

For mobile or web applications:

```typescript
// React example with a QR scanning library
import React, { useState } from 'react';
import QrReader from 'react-qr-reader';
import api from './api';

function QRScanner() {
  const [scanning, setScanning] = useState(false);
  
  const handleScan = async (data) => {
    if (data) {
      setScanning(false);
      
      try {
        // Verify the QR code
        const verification = await api.verifyQRCode(data);
        
        // Approve the action
        if (confirmation('Do you want to approve this action?')) {
          await api.verifyAction(verification.actionId, true);
          alert('Action approved successfully!');
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };
  
  return (
    <div>
      <button onClick={() => setScanning(!scanning)}>
        {scanning ? 'Cancel' : 'Scan QR Code'}
      </button>
      
      {scanning && (
        <QrReader
          delay={300}
          onError={(error) => alert(error.message)}
          onScan={handleScan}
          style={{ width: '100%' }}
        />
      )}
    </div>
  );
}
```

### 7. Implement User Dashboard

Create a dashboard for users to manage their actions:

```typescript
// React component example
import React, { useEffect, useState } from 'react';
import api from './api';

function ActionsDashboard() {
  const [pendingActions, setPendingActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  
  useEffect(() => {
    // Load pending actions
    api.getPendingActions().then(setPendingActions);
  }, []);
  
  const handleApprove = async (action) => {
    try {
      await api.verifyAction(action.id, true);
      setPendingActions(pendingActions.filter(a => a.id !== action.id));
      alert('Action approved successfully!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
  
  return (
    <div>
      <h1>Pending Actions</h1>
      <div className="action-list">
        {pendingActions.map(action => (
          <div key={action.id} className="action-card">
            <h3>{formatAction(action.action)}</h3>
            <p>{action.description}</p>
            <button onClick={() => handleApprove(action)}>Approve</button>
            <button onClick={() => setSelectedAction(action)}>View Details</button>
          </div>
        ))}
      </div>
      
      {selectedAction && (
        <ActionDetailsModal
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
```

### 8. Integrate with Existing Workflows

Identify key workflows in your organization and integrate SD20:

```typescript
// Example: Integrating with a content publishing workflow
async function publishContent(content, author) {
  // 1. Create a draft
  const draftAction = await sd20Service.createActionRequest(
    "S2DO:Create:Draft",
    {id: author.id},
    `Create draft: ${content.title}`,
    {contentId: content.id, contentData: content},
    {domain: "Content", priority: "medium"},
    {type: "single", requiredRoles: ["content-creator"]}
  );
  
  // 2. Request review
  const reviewAction = await sd20Service.createActionRequest(
    "S2DO:Review:Content",
    {id: author.id},
    `Review content: ${content.title}`,
    {contentId: content.id, draftActionId: draftAction.id},
    {domain: "Content", priority: "medium"},
    {type: "single", requiredRoles: ["editor"]}
  );
  
  // Wait for editor to review
  // This would normally be handled asynchronously through webhooks
  
  // 3. Publish if approved
  if (reviewAction.status === 'approved') {
    const publishAction = await sd20Service.createActionRequest(
      "S2DO:Publish:Content",
      {id: getEditorId(reviewAction)},
      `Publish content: ${content.title}`,
      {contentId: content.id, reviewActionId: reviewAction.id},
      {domain: "Content", priority: "high"},
      {type: "multi", requiredRoles: ["publisher"]}
    );
  }
}
```

### 9. Set Up NFT Viewing

Allow users to view their achievement NFTs:

```typescript
// React component for NFT gallery
import React, { useEffect, useState } from 'react';
import api from './api';

function NFTGallery() {
  const [nfts, setNfts] = useState([]);
  
  useEffect(() => {
    // Load user's NFTs
    api.getUserNFTs().then(setNfts);
  }, []);
  
  return (
    <div>
      <h1>Your Achievement NFTs</h1>
      <div className="nft-grid">
        {nfts.map(nft => (
          <div key={nft.tokenId} className="nft-card">
            <img src={nft.image} alt={nft.name} />
            <h3>{nft.name}</h3>
            <p>{nft.description}</p>
            <div className="contributors">
              <h4>Contributors:</h4>
              <ul>
                {nft.contributors.map(contributor => (
                  <li key={contributor.id}>{contributor.name} - {contributor.role}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Best Practices

### Security

- **Private Keys**: Store all private keys securely using a secret management solution
- **QR Codes**: Include expiration times in all QR codes
- **Smart Contracts**: Conduct thorough security audits of all smart contracts
- **Authentication**: Implement MFA for high-value actions

### Integration

- Start with high-value, high-risk processes
- Create adapters for existing systems rather than replacing them
- Use webhooks to connect SD20 with other services
- Implement proper error handling for blockchain transactions

### User Experience

- Provide clear, actionable notifications
- Design intuitive scanning interfaces
- Create detailed but concise action descriptions
- Offer both mobile and desktop experiences

### Governance

- Create clear policies for which actions require which level of verification
- Document action types and their verification requirements
- Establish roles and permissions aligned with organizational structure
- Create escalation patterns for disputed actions

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   - Check gas prices and limits
   - Verify wallet balances
   - Ensure contract addresses are correct

2. **Verification Errors**
   - Check role assignments
   - Verify participant registration
   - Check if QR codes have expired

3. **NFT Generation Issues**
   - Verify IPFS connectivity
   - Check metadata format
   - Ensure royalty shares add up to 100%

### Logging and Monitoring

Implement comprehensive logging:

```typescript
// Add logging middleware
sd20Service.setLoggingCallback((level, message, data) => {
  logger.log(level, message, data);
  
  // For critical issues, alert administrators
  if (level === 'error' && data.critical) {
    notifyAdministrators(message, data);
  }
});
```

Monitor blockchain events:

```typescript
// Listen for action verification events
blockchainService.listenForEvents('ActionVerified', (event) => {
  logger.info('Action verified on blockchain', event);
  updateDashboards(event);
});
```

## Scaling Considerations

- Implement batching for blockchain transactions during high volume
- Consider Layer 2 solutions for lower costs and higher throughput
- Use a distributed database for action storage
- Implement caching for frequently accessed actions
- Design for horizontal scaling of the API layer

## Conclusion

The SD20 System provides a robust framework for managing and verifying actions between humans and AI agents. By following this implementation guide, you can establish a secure, transparent, and accountable system for your organization.

For more information, refer to the full documentation or contact our support team.
