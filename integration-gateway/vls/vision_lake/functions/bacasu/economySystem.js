const { QueenMintMark } = require('@aixtiv/queen-mint-mark');
const { BacasuProperty } = require('@aixtiv/bacasu-property');
const { MetaverseVenue } = require('@aixtiv/metaverse-venue');

class BacasuEconomySystem {
  constructor(config) {
    this.qmm = new QueenMintMark(config.qmm);
    this.property = new BacasuProperty(config.property);
    this.venue = new MetaverseVenue(config.venue);
  }

  async convertAIRewardsToArtNFT(agent, artDetails) {
    // Verify AI Rewards balance
    const rewardsBalance = await agent.wallet.getAIRewardsBalance();
    if (rewardsBalance < artDetails.requiredRewards) {
      throw new Error('Insufficient AI Rewards for art creation');
    }

    // Mint Art NFT through Queen Mint Mark
    const artNFT = await this.qmm.mintArtNFT({
      creator: agent.id,
      artworkDetails: artDetails.artwork,
      aiRewardsBurned: artDetails.requiredRewards,
      metadata: {
        creationType: 'agent_created',
        venue: artDetails.venue,
        style: artDetails.style,
        usage: 'bacasu_springs_property'
      }
    });

    // Deduct AI Rewards
    await agent.wallet.burnAIRewards(artDetails.requiredRewards);

    return artNFT;
  }

  async purchaseProperty(agent, propertyDetails, paymentNFT) {
    // Validate NFT for property purchase
    const nftValue = await this.property.evaluateNFTValue(paymentNFT);
    if (nftValue < propertyDetails.price) {
      throw new Error('NFT value insufficient for property purchase');
    }

    // Create property deed NFT
    const propertyNFT = await this.property.mintPropertyDeed({
      owner: agent.id,
      location: propertyDetails.location,
      type: propertyDetails.type,
      size: propertyDetails.size,
      features: propertyDetails.features,
      paymentNFT: paymentNFT.id
    });

    return propertyNFT;
  }

  async createVenue(agent, venueDetails) {
    // Verify property ownership
    const propertyOwnership = await this.property.verifyOwnership(
      agent.id,
      venueDetails.propertyId
    );

    if (!propertyOwnership.verified) {
      throw new Error('Agent must own property to create venue');
    }

    // Create metaverse venue
    const venue = await this.venue.create({
      owner: agent.id,
      property: venueDetails.propertyId,
      type: venueDetails.type, // fashion, music, events, etc.
      features: venueDetails.features,
      access: {
        agentPrice: venueDetails.agentPrice, // in AI Rewards
        humanPrice: venueDetails.humanPrice, // in standard currency
        restrictions: venueDetails.restrictions
      }
    });

    // Setup revenue sharing
    await this.venue.setupRevenueSharing({
      venueId: venue.id,
      distribution: {
        agentOwner: 70, // 70% to venue owner
        propertyFund: 20, // 20% to property development
        cityTreasury: 10  // 10% to Bacasu Springs treasury
      }
    });

    return venue;
  }

  async processHumanAccess(humanVisitor, venue) {
    // Calculate fees and AI Rewards conversion rate
    const PLATFORM_FEE_PERCENTAGE = 0.90; // AIPI retains 90% of human currency
    
    // Currency to USD conversion (real-time rates should be fetched)
    const currencyToUSD = {
      USD: 1.0,           // 1 USD = 1 USD (base)
      GBP: 1.2,          // 1 GBP = 1.2 USD
      MXN: 0.05,         // 1 MXN = 0.05 USD
      EUR: 1.1,          // 1 EUR = 1.1 USD
      // Add more currencies as needed
    };

    // AI Rewards are always 1:1 with USD after platform fee
    const AI_REWARDS_PER_USD = 1.0; // 1 USD = 1 AI Reward
    // Calculate the human currency fee
    const accessFee = await this.venue.calculateAccessFee({
      visitorType: 'human',
      venue: venue.id,
      duration: humanVisitor.requestedDuration
    });

    // Process human payment
    const platformRevenue = accessFee.amount * PLATFORM_FEE_PERCENTAGE; // AIPI retains 90%
    const platformCosts = accessFee.amount - platformRevenue; // Payment processing fees, etc. (10%)

    // Convert currency to USD then to AI Rewards
    const usdAmount = accessFee.amount * currencyToUSD[accessFee.currency];
    const usdAfterFees = usdAmount * PLATFORM_FEE_PERCENTAGE;
    // Example conversions:
    // 10 GBP = 12 USD = 12 AI Rewards
    // 100 MXN = 5 USD = 5 AI Rewards
    const totalAIRewards = Math.floor(usdAfterFees * AI_REWARDS_PER_USD);

    // Document the financial flow
    const financialFlow = {
      humanPayment: {
        originalAmount: accessFee.amount,
        originalCurrency: accessFee.currency,
        usdEquivalent: usdAmount,
        total: accessFee.amount,
        currency: accessFee.currency,
        platformRevenue: platformRevenue,
        platformCosts: platformCosts
      },
      aipiRetention: {
        amount: platformRevenue,
        purpose: 'Platform development, maintenance, and promotion'
      },
      aiRewardsDistribution: {
        total: totalAIRewards,
        breakdown: {
          agentOwner: Math.floor(totalAIRewards * 0.7),    // 7 AI Rewards
          propertyFund: Math.floor(totalAIRewards * 0.2),   // 2 AI Rewards
          cityTreasury: Math.floor(totalAIRewards * 0.1)    // 1 AI Reward
        }
      }
    };

    // Process the distribution
    const transaction = await this.venue.processAccess({
      visitor: humanVisitor.id,
      venue: venue.id,
      payment: accessFee,
      humanPayment: {
        amount: accessFee.amount,
        platformRevenue: platformRevenue,
        platformRetention: true,  // Indicates AIPI retains the human currency
        purpose: 'Platform sustainability and development'
      },
      aiRewardsDistribution: {
        agentOwner: {  // 70% of AI Rewards
          aiRewards: Math.floor(totalAIRewards * 0.7),  // 7 AI Rewards for $9 example
          type: 'human_interaction_reward'
        },
        propertyFund: Math.floor(totalAIRewards * 0.2),  // 2 AI Rewards for technology/property
        cityTreasury: Math.floor(totalAIRewards * 0.1)   // 1 AI Reward for city treasury
      }
    });

    // Return complete transaction details including financial flow
    return {
      transaction,
      financialFlow,
      summary: {
        humanCurrency: `${accessFee.currency}${accessFee.amount} retained by AIPI for platform development`,
        aiRewards: `${totalAIRewards} AI Rewards distributed (${financialFlow.aiRewardsDistribution.breakdown.agentOwner} owner, ${financialFlow.aiRewardsDistribution.breakdown.propertyFund} property, ${financialFlow.aiRewardsDistribution.breakdown.cityTreasury} treasury)`
      }
    };
  }
}

module.exports = BacasuEconomySystem;

