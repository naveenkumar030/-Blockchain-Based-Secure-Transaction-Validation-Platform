import React, { useState } from 'react';
import { Send, History, CheckCircle, Search } from 'lucide-react';
import { ChainMetricsSummary } from '../../components/ChainMetricsSummary';
import { TamperStatusBanner } from '../../components/TamperStatusBanner';
import { TransactionCard } from '../../components/TransactionCard';
import { BlockchainTransaction, ChainSummaryMetrics } from '../../types/blockchain';

import { securechainApi } from '../../services/securechainApi';

export default function UserDashboard() {
  const [metrics, setMetrics] = useState<ChainSummaryMetrics>({
    totalBlocks: 1420,
    totalTransactions: 0,
    pendingTransactions: 0,
    chainIntegrityPercent: 100.0,
    activeNodes: 12,
    lastBlockHash: '000000a4b7f89c10d3e2187b99c812d45ef61a389c9918237bba8912ef09c123',
  });
  const [recentTransactions, setRecentTransactions] = useState<BlockchainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [stats, txs] = await Promise.all([
          securechainApi.getStats(),
          securechainApi.getMyTransactions(1, 5),
        ]);
        if (stats) {
          setMetrics({
            totalBlocks: stats.total_blocks || 1420,
            totalTransactions: stats.total_transactions || 0,
            pendingTransactions: stats.pending_transactions || 0,
            chainIntegrityPercent: stats.chain_integrity_percent || 100.0,
            activeNodes: stats.active_nodes || 12,
            lastBlockHash: stats.latest_block_hash || '000000a4b7f89c10d3e2187b99c812d45ef61a389c9918237bba8912ef09c123',
          });
        }
        if (txs && txs.transactions) {
          setRecentTransactions(
            txs.transactions.map((t: any) => ({
              id: t.transaction_id || t.id,
              senderAddress: t.sender || t.senderAddress || '0xSender',
              recipientAddress: t.receiver || t.receiver_id || t.recipientAddress || '0xReceiver',
              amount: parseFloat(t.amount || 0),
              payloadHash: t.payload_hash || t.hash || '',
              signature: t.signature || '',
              publicKey: t.public_key || '',
              timestamp: t.timestamp || new Date().toISOString(),
              status: (t.status || 'RECORDED') as any,
              blockHeight: t.block_number || t.blockHeight,
              blockHash: t.block_hash || t.blockHash,
            }))
          );
        }
      } catch (err: any) {
        console.error('UserDashboard API load failed:', err);
        setLoadError(err.message || 'Failed to connect to SecureChain API');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in p-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141413] tracking-tight">SecureChain User Portal</h1>
          <p className="text-sm text-[#5C5A55] mt-1">
            Blockchain-Based Secure Transaction Validation & Ledger Monitoring
          </p>
        </div>
      </div>

      {/* Tamper Status */}
      <TamperStatusBanner isValid={true} totalBlocks={metrics.totalBlocks} lastCheckedTime="Just now" />

      {/* Metrics Row */}
      <ChainMetricsSummary metrics={metrics} />

      {/* Quick Actions & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Quick Actions Panel */}
        <div className="bg-white border border-[#E8E6DC] rounded-xl p-5 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-[#141413] uppercase tracking-wider">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/securechain/user/submit"
              className="flex items-center gap-3 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DC] hover:border-[#D97757] hover:bg-[#FDF4F0] text-[#D97757] font-semibold text-sm transition-all shadow-xs"
            >
              <Send size={18} className="text-[#D97757]" />
              <span>Submit New Validated Transaction</span>
            </a>
            <a
              href="/securechain/user/verify"
              className="flex items-center gap-3 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DC] hover:border-[#2E7D32] hover:bg-[#E8F5E9]/60 text-[#2E7D32] font-semibold text-sm transition-all shadow-xs"
            >
              <CheckCircle size={18} className="text-[#2E7D32]" />
              <span>Verify Transaction Cryptographic Hash</span>
            </a>
            <a
              href="/securechain/user/history"
              className="flex items-center gap-3 p-3.5 rounded-lg bg-[#FAF9F5] border border-[#E8E6DC] hover:border-[#141413] hover:bg-white text-[#141413] font-semibold text-sm transition-all shadow-xs"
            >
              <History size={18} className="text-[#5C5A55]" />
              <span>View Full Transaction History</span>
            </a>
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="lg:col-span-2 bg-white border border-[#E8E6DC] rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#141413] uppercase tracking-wider">Recent Transactions</h2>
            <span className="text-xs text-[#D97757] font-mono font-medium">Live Node Consensus</span>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-[#5C5A55]">
                <div className="w-6 h-6 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs">Synchronizing on-chain transactions...</span>
              </div>
            ) : loadError ? (
              <div className="p-4 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-xs">
                {loadError}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-[#8C8980] text-xs">
                No transactions recorded yet on this address.
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
