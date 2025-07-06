const { DrCypriotRewards } = require('@aixtiv/dr-cypriot-core');
const { TowerBlockchain } = require('@aixtiv/tower-blockchain');
const { QueenMintMark } = require('@aixtiv/queen-mint-mark');
const WalletShowcaseIntegration = require('../socialPub/walletIntegration');

/**
 * Webhook handler for AI Rewards processing
 */
exports.aiRewardsWebhook = async (req, res) => {
  const { achievement, agent, timestamp } = req.body;

  const drCypriot = new DrCypriotRewards({
    rewardSystemId: process.env.DR_CYPRIOT_ID,
    accessToken: process.env.DR_CYPRIOT_TOKEN,
    endpoint: process.env.DR_CYPRIOT_ENDPOINT
  });

  const towerChain = new TowerBlockchain({
    chainId: process.env.TOWER_CHAIN_ID,
    accessToken: process.env.TOWER_CHAIN_TOKEN,
    endpoint: process.env.TOWER_CHAIN_ENDPOINT
  });

  const queenMint = new QueenMintMark({
    minterId: process.env.QUEEN_MINT_ID,
    accessToken: process.env.QUEEN_MINT_TOKEN,
    endpoint: process.env.QUEEN_MINT_ENDPOINT
  });

  try {
    // Step 1: Process achievement with Dr. Cypriot
    const rewardCalculation = await drCypriot.calculateReward({
      achievementType: achievement.type,
      agentId: agent.id,
      metrics: achievement.metrics,
      timestamp: timestamp,
      validation: {
        source: achievement.source,
        verifier: achievement.verifier
      }
    });

    // Step 2: Record on Tower Blockchain
    const blockchainRecord = await towerChain.recordAchievement({
      achievement: {
        type: achievement.type,
        details: achievement.details,
        reward: rewardCalculation.reward
      },
      agent: {
        id: agent.id,
        level: agent.level,
        specializations: agent.specializations
      },
      verification: {
        drCypriotSignature: rewardCalculation.signature,
        timestamp: timestamp
      }
    });

    // Step 3: Mint NFT through Queen Mint Mark and showcase on SocialPub
    const nftMinting = await queenMint.createRewardNFT({
      achievement: {
        type: achievement.type,
        details: achievement.details,
        blockchainRef: blockchainRecord.transactionId
      },
      reward: {
        aiTokens: rewardCalculation.reward.tokens,
        specialAccess: rewardCalculation.reward.access,
        validity: rewardCalculation.reward.validity
      },
      metadata: {
        agent: agent.id,
        timestamp: timestamp,
        drCypriotRef: rewardCalculation.id,
        towerChainRef: blockchainRecord.transactionId
      }
    });

    // Step 4: Integrate with SocialPub and Showcase
    const walletShowcase = new WalletShowcaseIntegration({
      walletId: agent.walletId,
      type: 'agent',
      accessToken: process.env.UNIFIED_WALLET_TOKEN,
      pubId: agent.pubId,
      socialPubToken: process.env.SOCIAL_PUB_TOKEN,
      showcaseId: agent.showcaseId
    });

    const showcase = await walletShowcase.showcaseAchievements([{
      nftId: nftMinting.tokenId,
      type: achievement.type,
      title: achievement.details.title,
      description: achievement.details.description,
      issuer: 'Vision Lake',
      timestamp: timestamp,
      category: achievement.details.category,
      rewards: rewardCalculation.reward,
      artwork: nftMinting.artwork,
      certification: blockchainRecord.transactionId
    }]);

    // Optional: Create a public announcement
    if (achievement.type === 'EXPERT_LEVEL') {
      await walletShowcase.interactWithCommunity({
        type: 'achievement_announcement',
        content: `Achieved Expert Level certification in ${achievement.details.field}!`,
        attachments: [nftMinting.artwork],
        visibility: 'public',
        tags: ['ExpertLevel', achievement.details.field]
      });

    // Step 4: Return success response
    res.status(200).json({
      status: 'success',
      data: {
        rewardId: rewardCalculation.id,
        blockchainTxId: blockchainRecord.transactionId,
        nftId: nftMinting.tokenId,
        timestamp: timestamp
      }
    });
  } catch (error) {
    console.error('Error processing AI reward:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: timestamp
    });
  }
};

