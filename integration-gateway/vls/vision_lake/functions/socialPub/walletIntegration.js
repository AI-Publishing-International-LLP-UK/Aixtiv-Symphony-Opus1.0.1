const { UnifiedWallet } = require('@aixtiv/unified-wallet');
const { SocialPubAPI } = require('@2100/social-pub-sdk');
const { NFTShowcase } = require('@2100/nft-showcase');

class WalletShowcaseIntegration {
  constructor(config) {
    this.wallet = new UnifiedWallet({
      walletId: config.walletId,
      type: config.type, // 'agent', 'subscriber', 'publisher'
      accessToken: config.accessToken,
      endpoint: process.env.UNIFIED_WALLET_ENDPOINT
    });

    this.socialPub = new SocialPubAPI({
      pubId: config.pubId,
      accessToken: config.socialPubToken,
      endpoint: process.env.SOCIAL_PUB_ENDPOINT
    });

    this.showcase = new NFTShowcase({
      showcaseId: config.showcaseId,
      endpoint: process.env.NFT_SHOWCASE_ENDPOINT
    });

    this.acesWall = {
      topPilots: [],
      addPilot: function(pilot) {
        if (pilot.rank <= 10) this.topPilots.push(pilot);
      },
      jrAces: [],
      addJrPilot: function(pilot) {
        if (pilot.experienceYears < 5 && pilot.rank <= 30) this.jrAces.push(pilot);
      }
    };
  }

  async updateAcesWall(pilotData) {
    if (pilotData.rank <= 10) this.acesWall.addPilot(pilotData);
    else if (pilotData.experienceYears < 5 && pilotData.rank <= 30) this.acesWall.addJrPilot(pilotData);
  }

  async setupAgentProfile(agentData) {
    const profile = await this.socialPub.createProfile({
      type: 'agent',
      name: agentData.name,
      description: agentData.description,
      specializations: agentData.specializations,
      certifications: agentData.certifications,
      socialLinks: agentData.socialLinks
    });

    return profile;
  }

  async showcaseAchievements(achievements) {
    const nftGallery = await this.showcase.createGallery({
      owner: this.wallet.address,
      type: 'agent_achievements',
      display: {
        layout: 'certification_wall',
        theme: 'vision_lake'
      }
    });

    for (const achievement of achievements) {
      await this.showcase.addNFT({
        galleryId: nftGallery.id,
        nft: {
          tokenId: achievement.nftId,
          type: achievement.type,
          metadata: {
            title: achievement.title,
            description: achievement.description,
            issuer: achievement.issuer,
            dateEarned: achievement.timestamp,
            category: achievement.category,
            aiRewards: achievement.rewards
          },
          artwork: achievement.artwork,
          certification: achievement.certification
        }
      });
    }

    return nftGallery;
  }

  async syncWalletWithShowcase() {
    const nfts = await this.wallet.getNFTs();
    const certifications = nfts.filter(nft => 
      nft.type === 'ExpertLevel' || 
      nft.type === 'SolutionCertificate' || 
      nft.type === 'LifecycleCertificate' || 
      nft.type === 'KnowledgeApplication'
    );

    return this.showcaseAchievements(certifications);
  }

  async getPublicProfile() {
    const profile = await this.socialPub.getProfile(this.wallet.address);
    const gallery = await this.showcase.getGallery(profile.galleryId);
    
    return {
      profile: {
        name: profile.name,
        type: profile.type,
        specializations: profile.specializations,
        certifications: profile.certifications,
        socialLinks: profile.socialLinks
      },
      achievements: {
        total: gallery.nfts.length,
        categories: gallery.categories,
        highlighted: gallery.featured
      },
      stats: {
        expertiseLevels: profile.expertiseLevels,
        totalAIRewards: profile.aiRewards,
        contributionScore: profile.contributionScore
      }
    };
  }

  async interactWithCommunity(interaction) {
    return this.socialPub.createInteraction({
      type: interaction.type,
      content: interaction.content,
      attachments: interaction.attachments,
      visibility: interaction.visibility || 'public',
      tags: [...interaction.tags, '2100pub', 'visionlake']
    });
  }

  async peerRecognition(agent, recognizedBy) {
    return this.socialPub.createInteraction({
      type: 'peer_recognition',
      content: `Recognition from ${recognizedBy.name}: "${agent.name} is outstanding in ${agent.specialties}!"`,
      tags: ['peer-recognition', 'endorsement', 'team-spirit']
    });
  }

  async communityChallenge(challenge) {
    return this.socialPub.createInteraction({
      type: 'community_challenge',
      content: challenge.description,
      attachments: challenge.rewardDetails,
      visibility: 'public',
      tags: ['community', 'challenge', 'competitive']
    });
  }
}

module.exports = WalletShowcaseIntegration;

