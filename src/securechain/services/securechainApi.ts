/**
 * SecureChain: Frontend API Client
 * Connects the SecureChain React interface to the SecureChain FastAPI backend endpoints:
 * - GET  /api/blockchain/stats
 * - GET  /api/blockchain/activity
 * - POST /api/blockchain/transactions
 * - GET  /api/blockchain/transactions/my
 * - GET  /api/blockchain/transactions/{transaction_id}
 * - POST /api/blockchain/transactions/{transaction_id}/verify
 * - GET  /api/blockchain/graph
 * - POST /api/blockchain/graph/sync
 * - GET  /api/blockchain/graph/status
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const BLOCKCHAIN_PREFIX = '/api/blockchain';

export interface BlockchainStats {
  user_email: string;
  total_transactions: number;
  valid_transactions: number;
  pending_transactions: number;
  rejected_transactions: number;
  latest_block: number;
  total_blocks: number;
  active_validators: number;
  integrity_status: string;
  network: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  status: string;
}

export interface BlockchainActivity {
  confirmed_transactions: number;
  total_transactions: number;
  latest_block: number;
  latest_block_hash: string;
  latest_transaction: {
    transaction_id: string | null;
    amount: number;
    status: string | null;
    timestamp: string | null;
  } | null;
  validator_nodes: number;
  consensus_status: string;
  recent_activities: ActivityEvent[];
}

export interface TransactionItem {
  transaction_id: string;
  tx_id?: string;
  user_email: string;
  sender_address: string;
  sender_id?: string;
  receiver_id: string;
  recipient_address?: string;
  amount: number;
  description: string;
  transaction_type: string;
  nonce: number;
  timestamp: string;
  payload_hash: string;
  signature: string;
  public_key?: string;
  status: 'VALID' | 'PENDING' | 'REJECTED' | 'CONFIRMED' | string;
  block_number?: number;
  block_height?: number;
  block_hash?: string;
}

export interface VerificationChecks {
  transaction_found: boolean;
  hash_verification: boolean;
  digital_signature_verification: boolean;
  block_verification: boolean;
  previous_hash_verification: boolean;
  blockchain_integrity: boolean;
}

export interface VerificationReport {
  transaction_id: string;
  verified: boolean;
  is_valid: boolean;
  status: 'VERIFIED' | 'FAILED';
  message: 'TRANSACTION VERIFIED' | 'INTEGRITY CHECK FAILED' | string;
  checks: VerificationChecks;
  details?: Record<string, unknown>;
  error?: string;
}

export class BlockchainApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status = 500, detail?: string) {
    super(message);
    this.name = 'BlockchainApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Core HTTP fetch wrapper for SecureChain endpoints.
 * Handles JWT token injection, demo token acquisition, and JSON serialization.
 */
async function blockchainFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = localStorage.getItem('token');

  // If token is missing, attempt to obtain a demo session token seamlessly
  if (!token && !endpoint.includes('/auth/')) {
    try {
      const demoRes = await fetch(`${BASE_URL}${BLOCKCHAIN_PREFIX}/auth/demo-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (demoRes.ok) {
        const demoData = await demoRes.json();
        if (demoData.token) {
          token = demoData.token;
          localStorage.setItem('token', demoData.token);
          if (!localStorage.getItem('userEmail')) {
            localStorage.setItem('userEmail', demoData.user_email || 'alex.mercer@securechain.io');
          }
          if (!localStorage.getItem('userName')) {
            localStorage.setItem('userName', demoData.user_name || 'Alex Mercer');
          }
        }
      }
    } catch {
      // Ignore background demo-token failure
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${BLOCKCHAIN_PREFIX}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Auto-recover from expired or invalid token (HTTP 401)
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        const savedEmail = localStorage.getItem('userEmail') || 'alex.mercer@securechain.io';
        try {
          const refreshRes = await fetch(`${BASE_URL}${BLOCKCHAIN_PREFIX}/auth/demo-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: savedEmail }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.token) {
              localStorage.setItem('token', refreshData.token);
              headers['Authorization'] = `Bearer ${refreshData.token}`;
              const retryRes = await fetch(url, { ...options, headers });
              if (retryRes.ok) {
                return await retryRes.json();
              }
            }
          }
        } catch {
          // Fall through to error
        }
      }

      let errorMessage = `HTTP Error ${response.status}`;
      let detailMsg = '';
      try {
        const errorJson = await response.json();
        detailMsg = errorJson.detail || errorJson.message || '';
        errorMessage = detailMsg || errorMessage;
      } catch {
        // Fallback to HTTP status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new BlockchainApiError(errorMessage, response.status, detailMsg);
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof BlockchainApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new BlockchainApiError(message, 0);
  }
}

export const securechainApi = {
  /**
   * Acquire a demo token if not logged in.
   */
  ensureAuth: async (): Promise<string | null> => {
    let token = localStorage.getItem('token');
    if (!token) {
      const res = await fetch(`${BASE_URL}${BLOCKCHAIN_PREFIX}/auth/demo-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        token = data.token;
        localStorage.setItem('token', data.token);
        localStorage.setItem('userEmail', data.user_email);
        localStorage.setItem('userName', data.user_name);
      }
    }
    return token;
  },

  /**
   * GET /api/blockchain/stats
   * Retrieves dashboard statistics: total, valid, pending, rejected counts and block height.
   */
  getStats: (): Promise<BlockchainStats> => {
    return blockchainFetch<BlockchainStats>('/stats');
  },

  /**
   * GET /api/blockchain/activity
   * Retrieves network activity metrics, latest block info, and validator activity feed.
   */
  getActivity: (): Promise<BlockchainActivity> => {
    return blockchainFetch<BlockchainActivity>('/activity');
  },

  /**
   * GET /api/blockchain/transactions/my
   * Retrieves paginated transactions belonging strictly to the authenticated user.
   */
  getMyTransactions: (
    page = 1,
    limit = 50,
    status?: string
  ): Promise<{ success: boolean; page: number; limit: number; total: number; transactions: TransactionItem[] }> => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== 'ALL') {
      query.set('status', status.toUpperCase());
    }
    return blockchainFetch(`/transactions/my?${query.toString()}`);
  },

  /**
   * GET /api/blockchain/transactions/{transaction_id}
   * Retrieves a single transaction by ID (enforcing user ownership).
   */
  getTransactionById: (
    transactionId: string
  ): Promise<{ success: boolean; transaction: TransactionItem }> => {
    return blockchainFetch(`/transactions/${encodeURIComponent(transactionId)}`);
  },

  /**
   * POST /api/securechain/transactions
   * Submits and cryptographically validates a new transaction with deterministic SHA-256 hash
   * and digital signature verification.
   */
  createSecureTransaction: (data: {
    receiver_id: string;
    amount: number;
    description?: string;
    transaction_type?: string;
    signature?: string;
    public_key?: string;
    auto_mine?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    message: string;
    transaction_id: string;
    tx_id: string;
    sender_id: string;
    sender_address: string;
    receiver_id: string;
    recipient_address: string;
    amount: number;
    description: string;
    nonce: number;
    timestamp: string;
    transaction_hash: string;
    payload_hash: string;
    signature: string;
    public_key: string;
    status: string;
    block_info?: Record<string, unknown> | null;
    block_number?: number | null;
    block_height?: number | null;
    block_hash?: string | null;
    validation?: Record<string, unknown>;
    transaction?: TransactionItem;
  }> => {
    let token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return fetch(`${BASE_URL}/api/securechain/transactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }).then(async (res) => {
      if (!res.ok) {
        let errorDetail = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          errorDetail = errData.detail || errData.message || errorDetail;
        } catch {
          errorDetail = res.statusText || errorDetail;
        }
        throw new BlockchainApiError(errorDetail, res.status, errorDetail);
      }
      return res.json();
    });
  },

  /**
   * GET /api/securechain/transactions/recipients
   * Retrieves list of registered eligible recipient nodes and addresses.
   */
  getEligibleRecipients: async (): Promise<Array<{ receiver_id: string; name: string; address: string; status: string }>> => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/api/securechain/transactions/recipients`, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Return defaults on network error
    }
    return [
      { receiver_id: 'user_002', name: 'Bob (Merchant Node)', address: '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97', status: 'ACTIVE' },
      { receiver_id: 'bob@securechain.io', name: 'Bob Liquidity Vault', address: '0x71C8fb866336658E3f67933d037475f5D577230c', status: 'ACTIVE' },
      { receiver_id: 'alice@securechain.io', name: 'Alice Primary Node', address: '0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98', status: 'ACTIVE' },
      { receiver_id: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', name: 'Escrow Settlement Pool', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', status: 'ACTIVE' },
      { receiver_id: '0x1aD91ee08f21bE3de0BA2Ba69187184dB616B278', name: 'Smart Contract Escrow', address: '0x1aD91ee08f21bE3de0BA2Ba69187184dB616B278', status: 'ACTIVE' },
      { receiver_id: '0x55d398326f99059fF775485246999027B3197955', name: 'Liquidity Pool Epoch', address: '0x55d398326f99059fF775485246999027B3197955', status: 'ACTIVE' },
    ];
  },

  /**
   * POST /api/blockchain/transactions
   * Submits a new transaction to the cryptographic engine, mines it into a block,
   * and synchronizes with Neo4j.
   */
  createTransaction: (data: {
    receiver_id: string;
    amount: number;
    description: string;
    transaction_type?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    message: string;
    transaction: TransactionItem;
    block?: Record<string, unknown>;
    validation?: Record<string, unknown>;
  }> => {
    return blockchainFetch('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/blockchain/transactions/{transaction_id}/verify
   * Performs full cryptographic verification: payload SHA-256 hash,
   * digital signature, block integrity, and Merkle root.
   */
  verifyTransaction: (transactionId: string): Promise<VerificationReport> => {
    return blockchainFetch(`/transactions/${encodeURIComponent(transactionId)}/verify`, {
      method: 'POST',
    });
  },

  /**
   * POST /api/securechain/validation/audit
   * Traverses all blocks in the ledger, recalculating every header hash and Merkle root.
   */
  auditChain: async (): Promise<{
    is_valid: boolean;
    total_blocks_checked: number;
    verified_blocks: number;
    corrupted_block_indices: number[];
    timestamp: string;
    last_verified_hash: string;
    details: string;
  }> => {
    let token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/api/securechain/validation/audit`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      throw new BlockchainApiError(`Audit failed with status ${res.status}`, res.status);
    }
    return res.json();
  },

  /**
   * GET /api/securechain/validation/metrics
   * High level KPIs for ledger health and block count.
   */
  getChainMetrics: async (): Promise<{
    total_blocks: number;
    total_transactions: number;
    pending_transactions: number;
    chain_integrity_percent: number;
    active_nodes: number;
    last_block_hash: string;
  }> => {
    let token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/api/securechain/validation/metrics`, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      throw new BlockchainApiError(`Metrics failed with status ${res.status}`, res.status);
    }
    return res.json();
  },

  /**
   * GET /api/blockchain/graph
   * Retrieves Neo4j topology graph data (User, Transaction, Block nodes & relationships).
   */
  getGraph: (limit = 100): Promise<{
    success: boolean;
    nodes: Array<{ id: string; label: string; type: string; properties: Record<string, unknown> }>;
    links: Array<{ source: string; target: string; type: string }>;
    stats: { total_nodes: number; total_links: number; blocks: number; transactions: number; users: number };
  }> => {
    return blockchainFetch(`/graph?limit=${limit}`);
  },

  /**
   * POST /api/blockchain/graph/sync
   * Explicitly triggers synchronization from SecureChain ledger to Neo4j.
   */
  syncGraph: (): Promise<{ success: boolean; message: string; synced_blocks: number; synced_transactions: number }> => {
    return blockchainFetch('/graph/sync', { method: 'POST' });
  },

  /**
   * GET /api/blockchain/blocks
   * Retrieves real paginated blocks from the blockchain ledger.
   */
  getBlocks: async (page = 1, limit = 20): Promise<{
    success: boolean;
    total: number;
    page: number;
    limit: number;
    blocks: any[];
  }> => {
    return blockchainFetch(`/blocks?page=${page}&limit=${limit}`);
  },

  /**
   * GET /api/blockchain/graph/status
   * Checks Neo4j database connectivity status.
   */
  getGraphStatus: (): Promise<{ success: boolean; connected: boolean; database?: string }> => {
    return blockchainFetch('/graph/status');
  },
};
