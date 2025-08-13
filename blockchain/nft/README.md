# ASOOS NFT Ecosystem

This directory contains the NFT (Non-Fungible Token) infrastructure for the ASOOS blockchain system.

## Collections

### Progenesis Collection (`progenesis-collection/`)
AI-generated intellectual property and creative assets:
- Unique AI-generated artwork
- Procedural content creation
- Intellectual property tokens
- Creative commons assets

### Achievement Tokens (`achievement-tokens/`)
Performance and milestone NFTs for agent recognition:
- **Pilot Badges:** RIX, CRX, qRIX achievement badges
- **Completion Certificates:** Course and training completion NFTs  
- **Mastery Tokens:** Elite 11 and Mastery 33 special recognition

### Marketplaces (`marketplaces/`)
Trading platforms and marketplace integrations:
- Internal ASOOS marketplace
- External marketplace integrations (OpenSea, etc.)
- Auction and dynamic pricing systems
- Cross-chain marketplace support

## Usage

Use the main NFT minting script:
```bash
# Mint pilot achievement badge
../mint-nft.sh --type pilot-badge --agent RIX-001 --achievement mastery-33

# Mint course completion certificate  
../mint-nft.sh --type completion-cert --agent CRX-042 --achievement advanced-strategy

# Batch mint from CSV
../mint-nft.sh --batch pilot-achievements.csv --type pilot-badge
```

## Integration

- **Agent Orchestration:** Automatic NFT minting on achievement milestones
- **Wing System:** Integration with 20,000,000 agent achievement tracking
- **SallyPort Authentication:** Secure minting and ownership verification
- **Victory36 Protection:** Advanced security for high-value NFT operations
