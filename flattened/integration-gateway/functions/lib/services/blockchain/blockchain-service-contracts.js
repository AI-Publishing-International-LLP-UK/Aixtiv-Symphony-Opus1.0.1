"use strict";
// src/interfaces/blockchain/BlockchainServiceContracts.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBlockchainService = exports.TransactionStatus = exports.BlockchainNetwork = void 0;
/**
 * Supported blockchain networks
 */
var BlockchainNetwork;
(function (BlockchainNetwork) {
    BlockchainNetwork["ETHEREUM"] = "ethereum";
    BlockchainNetwork["POLYGON"] = "polygon";
    BlockchainNetwork["BINANCE"] = "binance";
    BlockchainNetwork["SOLANA"] = "solana";
    BlockchainNetwork["AVALANCHE"] = "avalanche";
    BlockchainNetwork["ARBITRUM"] = "arbitrum";
    BlockchainNetwork["OPTIMISM"] = "optimism";
})(BlockchainNetwork || (exports.BlockchainNetwork = BlockchainNetwork = {}));
/**
 * Transaction status enum
 */
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["CONFIRMED"] = "confirmed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["DROPPED"] = "dropped";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
/**
 * Abstract base class for blockchain services
 */
class BaseBlockchainService {
    constructor() {
        this.networks = new Map();
    }
    isConnected(network) {
        return this.networks.has(network);
    }
    /**
     * Utility method to convert wei to ether
     */
    weiToEther(wei) {
        // 1 Ether = 10^18 Wei
        const weiValue = BigInt(wei);
        const etherValue = Number(weiValue) / 1e18;
        return etherValue.toString();
    }
    /**
     * Utility method to convert ether to wei
     */
    etherToWei(ether) {
        // 1 Ether = 10^18 Wei
        const etherValue = parseFloat(ether);
        const weiValue = BigInt(Math.floor(etherValue * 1e18));
        return weiValue.toString();
    }
}
exports.BaseBlockchainService = BaseBlockchainService;
exports.default = {
    BlockchainNetwork,
    TransactionStatus,
    BaseBlockchainService,
};
//# sourceMappingURL=blockchain-service-contracts.js.map