const { UnifiedWallet } = require('@aixtiv/unified-wallet');
const { TokenExchange } = require('@aixtiv/token-exchange');
const { RewardMarketplace } = require('@aixtiv/reward-marketplace');

class EnhancedWalletOperations {
  constructor(config) {
    this.wallet = new UnifiedWallet(config);
    this.exchange = new TokenExchange({
      walletId: config.walletId,
      supportedTypes: ['NFT', 'AIReward', 'Certificate']
    });
    this.marketplace = new RewardMarketplace({
      walletId: config.walletId,
      rewardTypes: ['training', 'compute', 'access']
    });
  }

  async transferNFT(fromWallet, toWallet, nftId) {
    const nft = await this.wallet.getNFTDetails(nftId);
    const validationResult = await this.validateTransferability(nft, fromWallet, toWallet);

    if (!validationResult.transferable) {
      throw new Error(`NFT transfer restricted: ${JSON.stringify(validationResult.reason)}`);
    }

    return this.exchange.transferAsset({
      type: 'NFT',
      assetId: nftId,
      from: fromWallet,
      to: toWallet,
      verification: {
        requireSignature: true,
        notifyParties: true
      }
    });
  }

  async exchangeTokens(fromToken, toToken, amount) {
    return this.exchange.convertTokens({
      from: {
        type: fromToken.type,
        amount: amount
      },
      to: {
        type: toToken.type,
        rate: await this.exchange.getExchangeRate(fromToken.type, toToken.type)
      },
      verification: {
        validateBalance: true,
        enforceMinimum: true
      }
    });
  }

  async redeemRewards(rewards, forBenefit) {
    return this.marketplace.redeemTokens({
      rewards: rewards.map(reward => ({
        type: reward.type,
        amount: reward.amount,
        validation: {
          expiry: reward.expiry,
          source: reward.source
        }
      })),
      benefit: {
        type: forBenefit.type,
        duration: forBenefit.duration,
        level: forBenefit.level
      },
      processing: {
        immediate: true,
        notifyOnCompletion: true
      }
    });
  }

  async checkBenefitEligibility(pilotId, benefitType) {
    return this.marketplace.checkEligibility({
      pilot: pilotId,
      benefitType: benefitType,
      criteria: {
        minimumRank: true,
        rewardBalance: true,
        activeStatus: true
      }
    });
  }
}

module.exports = EnhancedWalletOperations;

