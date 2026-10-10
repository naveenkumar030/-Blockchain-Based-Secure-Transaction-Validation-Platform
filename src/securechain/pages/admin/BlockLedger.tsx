import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Filter, RefreshCw, Box } from 'lucide-react';
import { BlockCard } from '../../components/BlockCard';
import { MerkleTreeViewer } from '../../components/MerkleTreeViewer';
import { BlockchainBlock } from '../../types/blockchain';
import { securechainApi } from '../../services/securechainApi';

export default function BlockLedger() {
  const [selectedBlock, setSelectedBlock] = useState<BlockchainBlock | null>(null);
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);
    try {
      await securechainApi.ensureAuth();
      const res = await securechainApi.getBlocks(1, 30);
      if (res && res.blocks && res.blocks.length > 0) {
        const mappedBlocks: BlockchainBlock[] = res.blocks.map((b: any) => ({
          height: b.height ?? b.block_number ?? 0,
          hash: b.hash ?? b.block_hash ?? '',
          previousHash: b.previous_hash ?? b.previousHash ?? '0'.repeat(64),
          merkleRoot: b.merkle_root ?? b.merkleRoot ?? '',
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

  useEffect(() => {
    fetchBlocks();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/securechain/admin" className="p-2 rounded-lg bg-white border border-[#E8E6DC] text-[#5C5A55] hover:text-[#141413] hover:border-[#141413] transition-colors shadow-xs">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-[#141413] tracking-tight">Block Ledger Explorer</h1>
            <p className="text-xs text-[#5C5A55] mt-0.5">
              Inspect confirmed blockchain blocks, previous hash references, and Merkle proofs
            </p>
          </div>
        </div>

        <button
          onClick={fetchBlocks}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E8E6DC] hover:border-[#D97757] hover:text-[#D97757] text-[#141413] rounded-lg text-xs font-semibold transition-colors shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Blocks'}
        </button>
      </div>

      {selectedBlock && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#141413]">Selected Block #{selectedBlock.height} Details</h3>
            <button
              onClick={() => setSelectedBlock(null)}
              className="text-xs text-[#5C5A55] hover:text-[#D97757] underline font-medium"
            >
              Close Details
            </button>
          </div>
          <MerkleTreeViewer
            blockHeight={selectedBlock.height}
            merkleRoot={selectedBlock.merkleRoot}
            leafHashes={
              selectedBlock.transactions && selectedBlock.transactions.length > 0
                ? selectedBlock.transactions.map((t: any) => t.payload_hash || t.payloadHash || t.tx_id || t.id)
                : [selectedBlock.merkleRoot]
            }
          />
        </div>
      )}

      {/* Block List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#141413] uppercase tracking-wider">
            Blockchain Ledger Sequence ({blocks.length} Confirmed Blocks)
          </h2>
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
              <BlockCard key={b.height} block={b} onSelect={setSelectedBlock} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
