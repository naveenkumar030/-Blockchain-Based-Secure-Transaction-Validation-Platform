import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Box,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Hash,
  Link as LinkIcon,
  Layers,
  Key,
  CheckCircle,
  AlertTriangle,
  FileText,
  Share2
} from 'lucide-react';
import { BlockCard } from '../../components/BlockCard';
import { MerkleTreeViewer } from '../../components/MerkleTreeViewer';
import { BlockchainBlock } from '../../types/blockchain';
import { securechainApi } from '../../services/securechainApi';
import { HashBadge } from '../../components/HashBadge';

export default function BlockLedger() {
  const [selectedBlock, setSelectedBlock] = useState<BlockchainBlock | null>(null);
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chain verification state
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);
    try {
      await securechainApi.ensureAuth();
      const res = await securechainApi.getBlocks(1, 100, 'asc');
      if (res && res.blocks && res.blocks.length > 0) {
        const mappedBlocks: BlockchainBlock[] = res.blocks.map((b: any) => ({
          index: b.index ?? b.height ?? 0,
          height: b.index ?? b.height ?? 0,
          block_id: b.block_id || b.blockId || `BLOCK-${String(b.index ?? b.height ?? 0).padStart(3, '0')}`,
          blockId: b.block_id || b.blockId || `BLOCK-${String(b.index ?? b.height ?? 0).padStart(3, '0')}`,
          hash: b.block_hash || b.hash || '',
          block_hash: b.block_hash || b.hash || '',
          previousHash: b.previous_hash || b.previousHash || 'GENESIS',
          previous_hash: b.previous_hash || b.previousHash || 'GENESIS',
          merkleRoot: b.merkle_root || b.merkleRoot || '0'.repeat(64),
          merkle_root: b.merkle_root || b.merkleRoot || '0'.repeat(64),
          timestamp: b.timestamp || new Date().toISOString(),
          nonce: b.nonce ?? 0,
          difficulty: b.difficulty ?? 2,
          transactions: b.transactions || [],
          transactionCount: b.transaction_count ?? (b.transactions ? b.transactions.length : 0),
          status: b.status || 'VERIFIED',
          validatorAddress: b.validator_address ?? b.validatorAddress ?? '0xConsensus_Validator_Alpha',
        }));
        setBlocks(mappedBlocks);
      }
    } catch (err: any) {
      console.error('Failed to fetch ledger blocks:', err);
      setError(err?.message || 'Failed to load live ledger sequence');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setAuditResult(null);
    try {
      await securechainApi.ensureAuth();
      const res = await securechainApi.verifyChain();
      setAuditResult(res);
    } catch (err: any) {
      console.error('Verification failed:', err);
      setAuditResult({
        is_valid: false,
        message: err?.message || 'Verification audit encountered an error.',
        total_blocks: blocks.length,
        verified_blocks: 0,
        first_invalid_block: null,
        error_reason: err?.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectBlock = async (block: BlockchainBlock) => {
    const blockIdentifier = block.block_id || block.blockId || String(block.index ?? block.height);
    try {
      // Fetch full complete transaction payloads
      const res = await securechainApi.getBlockById(blockIdentifier);
      if (res && res.block) {
        setSelectedBlock({
          ...block,
          transactions: res.block.transactions || block.transactions || [],
          transactionCount: res.block.transaction_count ?? (res.block.transactions?.length || block.transactionCount),
        });
        return;
      }
    } catch {
      // Fallback to local block object
    }
    setSelectedBlock(block);
  };

  const navigateBlock = (direction: 'prev' | 'next') => {
    if (!selectedBlock) return;
    const currentIndex = selectedBlock.index ?? selectedBlock.height ?? 0;
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    const targetBlock = blocks.find((b) => (b.index ?? b.height) === targetIndex);
    if (targetBlock) {
      handleSelectBlock(targetBlock);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const formatTimestamp = (ts: string | number) => {
    if (!ts) return 'Genesis Timestamp';
    if (typeof ts === 'number') {
      const ms = ts < 10000000000 ? ts * 1000 : ts;
      return new Date(ms).toLocaleString();
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/securechain/admin" className="p-2 rounded-lg bg-white border border-[#E8E6DC] text-[#5C5A55] hover:text-[#141413] hover:border-[#141413] transition-colors shadow-xs">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-[#141413] tracking-tight">Block Ledger Explorer</h1>
            <p className="text-xs text-[#5C5A55] mt-0.5">
              Inspect confirmed blockchain blocks, previous hash references, complete transaction payloads, and audit cryptographic integrity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/blockchain/graph"
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E8E6DC] hover:border-[#2563EB] hover:text-[#2563EB] text-[#141413] rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Share2 size={14} className="text-[#2563EB]" />
            Neo4j Topology
          </a>

          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#D97757] hover:bg-[#C26344] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <ShieldCheck size={14} className={isVerifying ? 'animate-spin' : ''} />
            {isVerifying ? 'Auditing Ledger...' : 'Verify Chain Integrity'}
          </button>

          <button
            onClick={fetchBlocks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E8E6DC] hover:border-[#D97757] hover:text-[#D97757] text-[#141413] rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Blocks'}
          </button>
        </div>
      </div>

      {/* Chain Verification Result Banner */}
      {auditResult && (
        <div
          className={`p-4 rounded-xl border transition-all ${
            auditResult.is_valid
              ? 'bg-[#E8F5E9] border-[#C8E6C9] text-[#1B5E20]'
              : 'bg-[#FFF5F5] border-[#FED7D7] text-[#C53030]'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {auditResult.is_valid ? (
                <ShieldCheck size={22} className="text-[#2E7D32] mt-0.5" />
              ) : (
                <ShieldAlert size={22} className="text-[#C53030] mt-0.5" />
              )}
              <div>
                <h4 className="font-bold text-sm">
                  {auditResult.is_valid
                    ? 'Blockchain Ledger Verified & Cryptographically Intact'
                    : 'Cryptographic Chain Violation Detected'}
                </h4>
                <p className="text-xs mt-0.5 opacity-90">{auditResult.message}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs font-mono">
                  <span>Checked: <strong>{auditResult.total_blocks} Blocks</strong></span>
                  <span>Verified: <strong>{auditResult.verified_blocks} Blocks</strong></span>
                  {auditResult.first_invalid_block !== null && auditResult.first_invalid_block !== undefined && (
                    <span className="text-[#C53030] font-bold">
                      First Invalid Block: #{auditResult.first_invalid_block}
                    </span>
                  )}
                  {auditResult.error_reason && (
                    <span className="text-[#C53030]">Reason: {auditResult.error_reason}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setAuditResult(null)}
              className="text-xs underline font-medium hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Selected Block Inspection Drawer */}
      {selectedBlock && (
        <div className="bg-white border border-[#E8E6DC] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E6DC]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FDF4F0] text-[#D97757] rounded-lg">
                <Box size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#141413]">
                    Block #{selectedBlock.index ?? selectedBlock.height} Details
                  </h3>
                  <span className="font-mono text-xs bg-[#FAF9F5] border border-[#E8E6DC] px-2 py-0.5 rounded font-semibold text-[#5C5A55]">
                    {selectedBlock.block_id || selectedBlock.blockId || `BLOCK-${String(selectedBlock.index ?? selectedBlock.height).padStart(3, '0')}`}
                  </span>
                </div>
                <span className="text-xs text-[#8C8980]">
                  Timestamp: {formatTimestamp(selectedBlock.timestamp)}
                </span>
              </div>
            </div>

            {/* Previous / Next Block Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateBlock('prev')}
                disabled={(selectedBlock.index ?? selectedBlock.height) <= 0}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[#E8E6DC] rounded hover:border-[#D97757] disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft size={14} /> Previous Block
              </button>
              <button
                onClick={() => navigateBlock('next')}
                disabled={(selectedBlock.index ?? selectedBlock.height) >= blocks.length - 1}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[#E8E6DC] rounded hover:border-[#D97757] disabled:opacity-30 disabled:pointer-events-none"
              >
                Next Block <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setSelectedBlock(null)}
                className="ml-2 text-xs text-[#5C5A55] hover:text-[#D97757] underline font-medium"
              >
                Close Details
              </button>
            </div>
          </div>

          {/* Block Header Hashes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#FAF9F5] p-3 rounded-lg border border-[#E8E6DC]">
            <div>
              <span className="text-[#8C8980] block mb-0.5 flex items-center gap-1 font-medium">
                <Hash size={12} /> Block Hash (SHA-256):
              </span>
              <span className="font-mono text-[11px] text-[#141413] break-all select-all font-semibold">
                {selectedBlock.block_hash || selectedBlock.hash}
              </span>
            </div>
            <div>
              <span className="text-[#8C8980] block mb-0.5 flex items-center gap-1 font-medium">
                <LinkIcon size={12} /> Previous Block Hash:
              </span>
              <span className="font-mono text-[11px] text-[#141413] break-all select-all font-semibold">
                {selectedBlock.previous_hash || selectedBlock.previousHash || 'GENESIS'}
              </span>
            </div>
          </div>

          {/* Merkle Root & Validator Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E8E6DC]">
              <span className="text-[#8C8980] block text-[10px] uppercase font-medium">Merkle Root</span>
              <span className="font-mono text-[11px] text-[#141413] truncate block font-semibold">
                {selectedBlock.merkle_root || selectedBlock.merkleRoot}
              </span>
            </div>
            <div className="bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E8E6DC]">
              <span className="text-[#8C8980] block text-[10px] uppercase font-medium">Validator Node</span>
              <span className="font-mono text-[11px] text-[#141413] truncate block font-semibold">
                {selectedBlock.validatorAddress || '0xSYSTEM_CONSENSUS_VALIDATOR'}
              </span>
            </div>
            <div className="bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E8E6DC]">
              <span className="text-[#8C8980] block text-[10px] uppercase font-medium">Transaction Count</span>
              <span className="font-bold text-[#D97757] text-sm">
                {selectedBlock.transactions?.length || selectedBlock.transactionCount || 0} Complete Payloads
              </span>
            </div>
          </div>

          {/* Complete Transaction Payloads Table */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-[#141413] uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-[#D97757]" /> Complete Embedded Transaction Payloads
            </h4>

            {(!selectedBlock.transactions || selectedBlock.transactions.length === 0) ? (
              <div className="text-center py-6 bg-[#FAF9F5] rounded-lg border border-[#E8E6DC] text-xs text-[#8C8980]">
                No transactions included in this block (Genesis block state).
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#E8E6DC] rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F5] text-[#5C5A55] font-semibold border-b border-[#E8E6DC]">
                    <tr>
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Sender</th>
                      <th className="py-2.5 px-3">Receiver</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Nonce</th>
                      <th className="py-2.5 px-3">Payload SHA-256 Digest</th>
                      <th className="py-2.5 px-3">Digital Signature</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6DC] font-mono text-[11px]">
                    {selectedBlock.transactions.map((tx: any, idx: number) => {
                      const txId = tx.transaction_id || tx.tx_id || `TX-${idx}`;
                      const sender = tx.sender_id || tx.sender_address || tx.sender || 'Unknown';
                      const receiver = tx.receiver_id || tx.recipient_address || tx.receiver || 'Unknown';
                      const txHash = tx.transaction_hash || tx.payload_hash || tx.hash || '';
                      const sig = tx.signature || '';
                      return (
                        <tr key={txId} className="hover:bg-[#FAF9F5] transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[#141413]">{txId}</td>
                          <td className="py-2.5 px-3 truncate max-w-[120px]" title={sender}>{sender}</td>
                          <td className="py-2.5 px-3 truncate max-w-[120px]" title={receiver}>{receiver}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#141413]">
                            {typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount}
                          </td>
                          <td className="py-2.5 px-3">{tx.nonce ?? 1}</td>
                          <td className="py-2.5 px-3">
                            <HashBadge hash={txHash} truncateLength={8} />
                          </td>
                          <td className="py-2.5 px-3">
                            <HashBadge hash={sig} truncateLength={8} />
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded text-[10px] font-bold">
                              {tx.status || 'CONFIRMED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Block List Sequence */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#141413] uppercase tracking-wider">
            Blockchain Ledger Sequence ({blocks.length} Confirmed Blocks)
          </h2>
          <span className="text-xs text-[#5C5A55]">
            Sorted by Chain Index Order (#0 → Tip)
          </span>
        </div>

        {loading && blocks.length === 0 ? (
          <div className="py-12 text-center bg-white border border-[#E8E6DC] rounded-xl">
            <RefreshCw size={24} className="mx-auto text-[#D97757] animate-spin mb-2" />
            <p className="text-xs text-[#5C5A55]">Retrieving live blocks from cryptographic ledger...</p>
          </div>
        ) : blocks.length === 0 ? (
          <div className="py-12 text-center bg-white border border-[#E8E6DC] rounded-xl">
            <Box size={28} className="mx-auto text-[#8C8980] mb-2" />
            <p className="text-xs text-[#5C5A55]">No mined blocks currently available in ledger.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blocks.map((b) => (
              <BlockCard
                key={b.index ?? b.height}
                block={b}
                isLatest={(b.index ?? b.height) === blocks[blocks.length - 1]?.index}
                onSelect={handleSelectBlock}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
