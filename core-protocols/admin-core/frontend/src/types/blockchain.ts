import type { SecurityLevel, ProtectionLevel } from './security';

export type BlockchainEndpoint = {
    url: string;
    networkId: string;
    provider: string;
};

export interface BlockchainConfig {
    network: NetworkType;
    consensus: ConsensusType;
    security: BlockchainSecurity;
    performance: BlockchainPerformance;
}

export enum NetworkType {
    MAINNET = 'mainnet',
    TESTNET = 'testnet',
    DEVNET = 'devnet'
}

export enum ConsensusType {
    POW = 'proof-of-work',
    POS = 'proof-of-stake',
    DPOS = 'delegated-proof-of-stake'
}

export interface BlockchainSecurity {
    securityLevel: SecurityLevel;
    protectionLevel: ProtectionLevel;
    encryption: EncryptionConfig;
}

export interface EncryptionConfig {
    algorithm: string;
    keyLength: number;
    mode: string;
}

export interface BlockchainPerformance {
    blockTime: number;
    transactionsPerSecond: number;
    maxBlockSize: number;
}
