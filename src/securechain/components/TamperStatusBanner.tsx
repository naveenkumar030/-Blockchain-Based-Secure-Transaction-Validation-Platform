import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface TamperStatusBannerProps {
  isValid: boolean;
  totalBlocks?: number;
  corruptedBlockIndices?: number[];
  lastCheckedTime?: string;
  onRunAudit?: () => void;
  isAuditing?: boolean;
}

export const TamperStatusBanner: React.FC<TamperStatusBannerProps> = ({
  isValid,
  totalBlocks = 0,
  corruptedBlockIndices = [],
  lastCheckedTime,
  onRunAudit,
  isAuditing = false,
}) => {
  return (
    <div
      className={`w-full rounded-xl p-4 sm:p-5 border transition-all ${
        isValid
          ? 'bg-white border-[#E8E6DC] shadow-sm'
          : 'bg-[#FFF5F5] border-[#FED7D7] shadow-sm'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              isValid ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FED7D7] text-[#C53030]'
            }`}
          >
            {isValid ? <ShieldCheck size={26} /> : <ShieldAlert size={26} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-bold ${isValid ? 'text-[#141413]' : 'text-[#9B2C2C]'}`}>
                {isValid ? 'Blockchain Ledger Verified & Intact' : 'CRITICAL: Ledger Inconsistency / Tamper Detected!'}
              </h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isValid ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]' : 'bg-[#FED7D7] text-[#C53030] border border-[#FEB2B2]'
                }`}
              >
                {isValid ? 'VERIFIED SECURE' : 'COMPROMISED'}
              </span>
            </div>
            <p className="text-xs text-[#595856] mt-1">
              {isValid
                ? `All ${totalBlocks} block headers, Merkle roots, and cryptographic SHA-256 chain links match the consensus state.`
                : `Cryptographic mismatch found in blocks: [${corruptedBlockIndices.join(', ')}]. Block hash does not equal hash(prevHash + merkleRoot + nonce).`}
            </p>
            {lastCheckedTime && (
              <p className="text-[11px] text-[#8C8980] mt-1">Last integrity check: {lastCheckedTime}</p>
            )}
          </div>
        </div>

        {onRunAudit && (
          <button
            onClick={onRunAudit}
            disabled={isAuditing}
            className={`px-4 py-2 rounded-lg text-xs font-semibold shrink-0 transition-all shadow-sm ${
              isValid
                ? 'bg-[#D97757] hover:bg-[#C66545] text-white disabled:opacity-50'
                : 'bg-[#C53030] hover:bg-[#9B2C2C] text-white disabled:opacity-50'
            }`}
          >
            {isAuditing ? 'Auditing Ledger...' : 'Run Full Integrity Audit'}
          </button>
        )}
      </div>
    </div>
  );
};
