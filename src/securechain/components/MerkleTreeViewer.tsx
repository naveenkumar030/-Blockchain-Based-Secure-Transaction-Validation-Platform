import React from 'react';
import { GitBranch, Box, CheckCircle } from 'lucide-react';
import { HashBadge } from './HashBadge';

interface MerkleTreeViewerProps {
  merkleRoot: string;
  leafHashes: string[];
  blockHeight?: number;
}

export const MerkleTreeViewer: React.FC<MerkleTreeViewerProps> = ({
  merkleRoot,
  leafHashes,
  blockHeight,
}) => {
  return (
    <div className="bg-white border border-[#E8E6DC] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E6DC]">
        <div className="flex items-center gap-2">
          <GitBranch size={18} className="text-[#D97757]" />
          <h4 className="text-sm font-bold text-[#141413]">
            Merkle Tree Cryptographic Proof {blockHeight !== undefined && `(Block #${blockHeight})`}
          </h4>
        </div>
        <span className="text-xs text-[#8C8980] font-mono">
          {leafHashes.length} Transaction Leaf {leafHashes.length === 1 ? 'Node' : 'Nodes'}
        </span>
      </div>

      {/* Root Node */}
      <div className="flex flex-col items-center my-3">
        <div className="bg-[#FDF4F0] border border-[#F0C5B5] rounded-lg p-3 text-center shadow-sm w-full max-w-md">
          <span className="block text-[10px] uppercase font-bold text-[#D97757] tracking-wider mb-1">
            Merkle Root Hash (SHA-256)
          </span>
          <HashBadge hash={merkleRoot} truncateLength={12} />
        </div>

        {/* Tree Branch Visual Connector */}
        <div className="w-0.5 h-6 bg-[#E8E6DC] my-1"></div>
        <div className="w-48 h-0.5 bg-[#E8E6DC] mb-2"></div>
      </div>

      {/* Leaf Nodes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-2">
        {leafHashes.map((leaf, index) => (
          <div
            key={index}
            className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg p-2.5 flex items-center justify-between gap-2 hover:border-[#D5D2C7] transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Box size={14} className="text-[#8C8980] shrink-0" />
              <span className="text-[11px] font-mono text-[#595856] shrink-0">Tx[{index}]</span>
            </div>
            <HashBadge hash={leaf} truncateLength={6} />
            <CheckCircle size={12} className="text-[#2E7D32] shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};
