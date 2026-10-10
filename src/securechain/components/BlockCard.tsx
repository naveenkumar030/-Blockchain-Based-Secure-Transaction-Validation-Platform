import React from 'react';
import { Box, Link as LinkIcon, CheckCircle, AlertTriangle, Layers, Hash } from 'lucide-react';
import { BlockchainBlock } from '../types/blockchain';
import { HashBadge } from './HashBadge';

interface BlockCardProps {
  block: BlockchainBlock;
  isLatest?: boolean;
  onSelect?: (block: BlockchainBlock) => void;
}

export const BlockCard: React.FC<BlockCardProps> = ({ block, isLatest = false, onSelect }) => {
  const isTampered = block.status === 'TAMPERED';
  const blockIndex = block.index ?? block.height ?? 0;
  const blockId = block.block_id || block.blockId || `BLOCK-${String(blockIndex).padStart(3, '0')}`;
  
  // Format timestamp whether it's integer epoch (seconds/ms) or ISO string
  const formatTimestamp = (ts: string | number) => {
    if (!ts) return 'Genesis Timestamp';
    if (typeof ts === 'number') {
      const ms = ts < 10000000000 ? ts * 1000 : ts;
      return new Date(ms).toLocaleString();
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
  };

  const blockHash = block.block_hash || block.hash || '';
  const prevHash = block.previous_hash || block.previousHash || 'GENESIS';
  const merkleRoot = block.merkle_root || block.merkleRoot || '0'.repeat(64);
  const txCount = block.transaction_count ?? block.transactionCount ?? (block.transactions ? block.transactions.length : 0);

  return (
    <div
      onClick={() => onSelect?.(block)}
      className={`relative rounded-xl p-5 border transition-all duration-200 cursor-pointer ${
        isTampered
          ? 'bg-[#FFF5F5] border-[#FED7D7] hover:border-[#FEB2B2] shadow-sm'
          : 'bg-white border-[#E8E6DC] hover:border-[#D97757]/60 hover:shadow-md shadow-sm'
      }`}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg ${
              isTampered ? 'bg-[#FED7D7] text-[#C53030]' : 'bg-[#FDF4F0] text-[#D97757]'
            }`}
          >
            <Box size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#141413]">Block #{blockIndex}</span>
              <span className="font-mono text-[11px] bg-[#FAF9F5] px-1.5 py-0.5 rounded border border-[#E8E6DC] text-[#5C5A55] font-semibold">
                {blockId}
              </span>
              {isLatest && (
                <span className="bg-[#FDF4F0] border border-[#F0C5B5] text-[#D97757] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  TIP
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#8C8980]">{formatTimestamp(block.timestamp)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isTampered ? (
            <span className="flex items-center gap-1 text-[#C53030] text-xs font-semibold">
              <AlertTriangle size={14} /> Tampered
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#2E7D32] text-xs font-semibold">
              <CheckCircle size={14} /> {block.status || 'Verified'}
            </span>
          )}
        </div>
      </div>

      {/* Cryptographic Hashes */}
      <div className="space-y-2 py-2 border-y border-[#E8E6DC] my-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
          <span className="text-[#8C8980] text-[11px] flex items-center gap-1">
            <Hash size={11} /> Block Hash:
          </span>
          <HashBadge hash={blockHash} truncateLength={10} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
          <span className="text-[#8C8980] text-[11px] flex items-center gap-1">
            <LinkIcon size={11} /> Previous Hash:
          </span>
          <HashBadge hash={prevHash} truncateLength={10} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
          <span className="text-[#8C8980] text-[11px] flex items-center gap-1">
            <Layers size={11} /> Merkle Root:
          </span>
          <HashBadge hash={merkleRoot} truncateLength={10} />
        </div>
      </div>

      {/* Metadata Metrics */}
      <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
        <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg p-2">
          <span className="block text-[10px] uppercase text-[#8C8980] font-medium">Tx Count</span>
          <span className="font-bold text-[#141413]">{txCount}</span>
        </div>
        <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg p-2">
          <span className="block text-[10px] uppercase text-[#8C8980] font-medium">Block ID</span>
          <span className="font-mono text-[#5C5A55] font-semibold text-[11px]">{blockId}</span>
        </div>
        <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg p-2">
          <span className="block text-[10px] uppercase text-[#8C8980] font-medium">Integrity</span>
          <span className="font-bold text-[#2E7D32]">{isTampered ? 'FAIL' : 'PASS'}</span>
        </div>
      </div>
    </div>
  );
};
