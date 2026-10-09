import React, { useState } from 'react';
import { ArrowLeft, Search, Filter } from 'lucide-react';
import { BlockCard } from '../../components/BlockCard';
import { MerkleTreeViewer } from '../../components/MerkleTreeViewer';
import { BlockchainBlock } from '../../types/blockchain';

export default function BlockLedger() {
  const [selectedBlock, setSelectedBlock] = useState<BlockchainBlock | null>(null);

  const [blocks] = useState<BlockchainBlock[]>([
    {
      height: 1420,
      hash: '000000a4b7f89c10d3e2187b99c812d45ef61a389c9918237bba8912ef09c123',
      previousHash: '00000098fbc1278adbc29817fba9812739812bc8192837192837128937129837',
      merkleRoot: 'd8e8fca9b128741b29a81c90184b8109d98bc19a8274bca8192837bc90182741',
      timestamp: new Date().toISOString(),
      nonce: 89124,
      difficulty: 4,
      transactions: [],
      transactionCount: 8,
      status: 'VERIFIED',
      validatorAddress: '0xNode1_Validator_Consensus',
    },
    {
      height: 1419,
      hash: '00000098fbc1278adbc29817fba9812739812bc8192837192837128937129837',
      previousHash: '00000037189283bc910283749102837491028374910283749102837491028374',
      merkleRoot: 'c90182741b9918273b481928374b8109d98bc19a8274bca8192837bc90182741',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      nonce: 43210,
      difficulty: 4,
      transactions: [],
      transactionCount: 14,
      status: 'VERIFIED',
      validatorAddress: '0xNode2_Validator_Consensus',
    },
    {
      height: 1418,
      hash: '00000037189283bc910283749102837491028374910283749102837491028374',
      previousHash: '0000001928374910283749102837491028374910283749102837491028374910',
      merkleRoot: 'a8192837bc90182741d8e8fca9b128741b29a81c90184b8109d98bc19a8274bc',
      timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      nonce: 65123,
      difficulty: 4,
      transactions: [],
      transactionCount: 5,
      status: 'VERIFIED',
      validatorAddress: '0xNode1_Validator_Consensus',
    },
  ]);

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
            leafHashes={[
              'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
              '7a12b45129fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b999',
            ]}
          />
        </div>
      )}

      {/* Block List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-[#141413] uppercase tracking-wider">Blockchain Ledger Sequence</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blocks.map((b) => (
            <BlockCard key={b.height} block={b} onSelect={setSelectedBlock} />
          ))}
        </div>
      </div>
    </div>
  );
}
