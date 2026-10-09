import React from 'react';
import { ArrowRight, CheckCircle2, Clock, AlertOctagon, Key, FileText } from 'lucide-react';
import { BlockchainTransaction } from '../types/blockchain';
import { HashBadge } from './HashBadge';

interface TransactionCardProps {
  transaction: BlockchainTransaction;
  onVerify?: (txId: string) => void;
}

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onVerify }) => {
  const getStatusBadge = () => {
    switch (transaction.status) {
      case 'RECORDED':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#2E7D32] bg-[#E8F5E9] border border-[#C8E6C9] px-2 py-0.5 rounded-full">
            <CheckCircle2 size={12} /> ON-CHAIN #{transaction.blockHeight}
          </span>
        );
      case 'VALIDATED':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#D97757] bg-[#FDF4F0] border border-[#F0C5B5] px-2 py-0.5 rounded-full">
            <CheckCircle2 size={12} /> VALIDATED
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full">
            <Clock size={12} /> PENDING BLOCK
          </span>
        );
      case 'TAMPERED':
      case 'REJECTED':
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#9B2C2C] bg-[#FFF5F5] border border-[#FED7D7] px-2 py-0.5 rounded-full">
            <AlertOctagon size={12} /> INVALID / REJECTED
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-[#E8E6DC] rounded-xl p-4 sm:p-5 hover:border-[#D5D2C7] shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#D97757]" />
          <span className="text-xs font-mono font-bold text-[#141413]">{transaction.id}</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className="text-[11px] text-[#8C8980]">
            {new Date(transaction.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Address flow */}
      <div className="flex items-center gap-3 bg-[#FAF9F5] rounded-lg p-3 my-2 border border-[#E8E6DC] text-xs">
        <div className="flex-1 min-w-0">
          <span className="block text-[10px] uppercase text-[#8C8980] font-semibold mb-0.5">Sender</span>
          <span className="font-mono text-[#141413] truncate block" title={transaction.senderAddress}>
            {transaction.senderAddress}
          </span>
        </div>
        <div className="p-1.5 rounded-full bg-white border border-[#E8E6DC] text-[#8C8980] shrink-0 shadow-2xs">
          <ArrowRight size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[10px] uppercase text-[#8C8980] font-semibold mb-0.5">Recipient</span>
          <span className="font-mono text-[#141413] truncate block" title={transaction.recipientAddress}>
            {transaction.recipientAddress}
          </span>
        </div>
        <div className="text-right shrink-0 pl-2">
          <span className="block text-[10px] uppercase text-[#8C8980] font-semibold mb-0.5">Amount</span>
          <span className="text-[#D97757] font-bold font-mono text-sm">{transaction.amount.toFixed(4)} SC</span>
        </div>
      </div>

      {/* Cryptographic Signatures */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-xs border-t border-[#E8E6DC]">
        <div className="flex items-center gap-2">
          <Key size={13} className="text-[#8C8980]" />
          <span className="text-[11px] text-[#595856]">Payload Hash:</span>
          <HashBadge hash={transaction.payloadHash} truncateLength={6} />
        </div>

        {onVerify && (
          <button
            onClick={() => onVerify(transaction.id)}
            className="text-[11px] text-[#D97757] hover:text-[#C66545] font-semibold underline underline-offset-2 transition-colors"
          >
            Verify Signature & Hash
          </button>
        )}
      </div>
    </div>
  );
};
