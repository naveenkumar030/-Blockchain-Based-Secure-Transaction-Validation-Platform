/**
 * SecureChain: TypeScript Data Models and Interfaces
 * Blockchain-Based Secure Transaction Validation Platform
 */

export type TransactionStatus = 'PENDING' | 'VALIDATED' | 'RECORDED' | 'REJECTED' | 'TAMPERED';

export type BlockStatus = 'COMMITTED' | 'VERIFIED' | 'TAMPERED';

export interface BlockchainTransaction {
  id: string;
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  payloadHash: string;
  signature: string;
  publicKey: string;
  timestamp: string;
  status: TransactionStatus;
  blockHeight?: number;
  blockHash?: string;
}

export interface BlockchainBlock {
  height: number;
  hash: string;
  previousHash: string;
  merkleRoot: string;
  timestamp: string;
  nonce: number;
  difficulty: number;
  transactions: BlockchainTransaction[];
  transactionCount: number;
  status: BlockStatus;
  validatorAddress: string;
}

export interface ChainValidationResult {
  isValid: boolean;
  totalBlocks: number;
  verifiedBlocks: number;
  corruptedBlockIndices: number[];
  timestamp: string;
  lastVerifiedHash: string;
  details: string;
}

export interface NodeStatus {
  nodeId: string;
  peerAddress: string;
  status: 'ONLINE' | 'SYNCING' | 'OFFLINE';
  currentHeight: number;
  latencyMs: number;
  lastHeartbeat: string;
}

export interface ChainSummaryMetrics {
  totalBlocks: number;
  totalTransactions: number;
  pendingTransactions: number;
  chainIntegrityPercent: number;
  activeNodes: number;
  lastBlockHash: string;
}
