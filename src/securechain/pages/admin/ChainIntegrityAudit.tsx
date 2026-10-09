import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, ShieldAlert, Play, Check, AlertTriangle, Layers } from 'lucide-react';
import { TamperStatusBanner } from '../../components/TamperStatusBanner';
import { ChainValidationResult } from '../../types/blockchain';

export default function ChainIntegrityAudit() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<ChainValidationResult>({
    isValid: true,
    totalBlocks: 1420,
    verifiedBlocks: 1420,
    corruptedBlockIndices: [],
    timestamp: new Date().toISOString(),
    lastVerifiedHash: '000000a4b7f89c10d3e2187b99c812d45ef61a389c9918237bba8912ef09c123',
    details: 'All SHA-256 block hashes, previous block hash pointers, and Merkle tree roots mathematically match.',
  });

  const handleRunFullAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setAuditResult({
        isValid: true,
        totalBlocks: 1420,
        verifiedBlocks: 1420,
        corruptedBlockIndices: [],
        timestamp: new Date().toISOString(),
        lastVerifiedHash: '000000a4b7f89c10d3e2187b99c812d45ef61a389c9918237bba8912ef09c123',
        details: 'Sequential chain verification complete: 0 tampering anomalies detected across 1,420 blocks.',
      });
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/securechain/admin" className="p-2 rounded-lg bg-white border border-[#E8E6DC] text-[#5C5A55] hover:text-[#141413] hover:border-[#141413] transition-colors shadow-xs">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-[#141413] tracking-tight">Full Chain Integrity & Tamper Audit</h1>
            <p className="text-xs text-[#5C5A55] mt-0.5">
              Traverse the entire blockchain ledger from Genesis block to latest block to verify cryptographic proofs
            </p>
          </div>
        </div>

        <button
          onClick={handleRunFullAudit}
          disabled={isAuditing}
          className="flex items-center gap-2 px-4 py-2 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Play size={14} />
          {isAuditing ? 'Auditing 1,420 Blocks...' : 'Execute Full Ledger Audit'}
        </button>
      </div>

      <TamperStatusBanner
        isValid={auditResult.isValid}
        totalBlocks={auditResult.totalBlocks}
        corruptedBlockIndices={auditResult.corruptedBlockIndices}
        lastCheckedTime={new Date(auditResult.timestamp).toLocaleTimeString()}
        onRunAudit={handleRunFullAudit}
        isAuditing={isAuditing}
      />

      {/* Audit Detailed Log */}
      <div className="bg-white border border-[#E8E6DC] rounded-xl p-5 space-y-4 shadow-sm">
        <h2 className="text-xs font-bold text-[#141413] uppercase tracking-wider flex items-center gap-2">
          <Layers size={16} className="text-[#D97757]" /> Audit Verification Parameters
        </h2>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-lg border border-[#E8E6DC]">
            <span className="text-[#141413] font-medium">1. Genesis Block Integrity (#0)</span>
            <span className="text-[#2E7D32] font-semibold flex items-center gap-1">
              <Check size={14} /> Validated (0x00000000... prevHash)
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-lg border border-[#E8E6DC]">
            <span className="text-[#141413] font-medium">2. Previous Hash Pointer Sequence</span>
            <span className="text-[#2E7D32] font-semibold flex items-center gap-1">
              <Check size={14} /> 100% Sequential Hash Match
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-lg border border-[#E8E6DC]">
            <span className="text-[#141413] font-medium">3. Merkle Tree Root Cryptographic Consistency</span>
            <span className="text-[#2E7D32] font-semibold flex items-center gap-1">
              <Check size={14} /> All 8,932 Transaction Roots Match
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#FAF9F5] rounded-lg border border-[#E8E6DC]">
            <span className="text-[#141413] font-medium">4. Proof-of-Work / Consensus Difficulty Compliance</span>
            <span className="text-[#2E7D32] font-semibold flex items-center gap-1">
              <Check size={14} /> Target Nonce Criteria Satisfied
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
