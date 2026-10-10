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
  index?: number;
  height: number;
  block_id?: string;
  blockId?: string;
  hash: string;
  block_hash?: string;
  blockHash?: string;
  previousHash: string;
  previous_hash?: string;
  merkleRoot: string;
  merkle_root?: string;
  timestamp: string | number;
  nonce: number;
  difficulty: number;
  transactions: any[];
  transactionCount: number;
  transaction_count?: number;
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
