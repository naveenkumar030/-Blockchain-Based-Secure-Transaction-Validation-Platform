import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HashBadgeProps {
  hash: string;
  truncateLength?: number;
  label?: string;
}

export const HashBadge: React.FC<HashBadgeProps> = ({ hash, truncateLength = 8, label }) => {
  const [copied, setCopied] = useState(false);

  const displayHash = hash && hash.length > truncateLength * 2
    ? `${hash.slice(0, truncateLength)}...${hash.slice(-truncateLength)}`
    : hash || '0x0000...';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hash) {
      navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 bg-[#FAF9F5] border border-[#E8E6DC] rounded-md px-2.5 py-1 text-xs font-mono text-[#D97757] group hover:border-[#D97757]/40 transition-colors">
      {label && <span className="text-[#8C8980] text-[10px] font-sans uppercase font-medium">{label}:</span>}
      <span title={hash} className="text-[#141413] font-medium">{displayHash}</span>
      <button
        onClick={handleCopy}
        className="text-[#8C8980] hover:text-[#141413] transition-colors p-0.5 rounded"
        title="Copy full cryptographic hash"
        aria-label="Copy hash"
      >
        {copied ? <Check size={12} className="text-[#2E7D32]" /> : <Copy size={12} />}
      </button>
    </div>
  );
};
