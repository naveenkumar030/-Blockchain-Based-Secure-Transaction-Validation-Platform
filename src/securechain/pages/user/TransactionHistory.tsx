import React, { useState } from 'react';
import { History, Filter, ArrowLeft, Search } from 'lucide-react';
import { TransactionCard } from '../../components/TransactionCard';
import { BlockchainTransaction } from '../../types/blockchain';

import { securechainApi } from '../../services/securechainApi';

export default function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    async function fetchTxs() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const filter = statusFilter === 'ALL' ? undefined : statusFilter;
        const res = await securechainApi.getMyTransactions(1, 50, filter);
        if (res && res.transactions) {
          setTransactions(
            res.transactions.map((t: any) => ({
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
        console.error('Failed to load transaction history:', err);
        setLoadError(err.message || 'Failed to load transaction history');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTxs();
  }, [statusFilter]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.senderAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.recipientAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/securechain/user" className="p-2 rounded-lg bg-white border border-[#E8E6DC] text-[#5C5A55] hover:text-[#141413] hover:border-[#141413] transition-colors shadow-xs">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-[#141413] tracking-tight">Transaction Ledger History</h1>
            <p className="text-xs text-[#5C5A55] mt-0.5">Comprehensive audit trail of transactions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by ID or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-[#E8E6DC] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#141413] placeholder-[#8C8980] focus:outline-none focus:border-[#D97757] w-56 shadow-xs"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#8C8980]" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#E8E6DC] rounded-lg px-3 py-1.5 text-xs text-[#141413] focus:outline-none focus:border-[#D97757] shadow-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="RECORDED">Recorded On-Chain</option>
            <option value="VALIDATED">Validated</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 bg-white border border-[#E8E6DC] rounded-xl text-[#5C5A55] shadow-xs">
            <div className="w-6 h-6 border-2 border-[#D97757] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs">Fetching transactions from SecureChain ledger...</span>
          </div>
        ) : loadError ? (
          <div className="p-4 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-xs">
            {loadError}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-white border border-[#E8E6DC] rounded-xl text-[#8C8980] text-xs shadow-xs">
            No transactions found matching the specified criteria.
          </div>
        ) : (
          filteredTransactions.map((tx) => <TransactionCard key={tx.id} transaction={tx} />)
        )}
      </div>
    </div>
  );
}
