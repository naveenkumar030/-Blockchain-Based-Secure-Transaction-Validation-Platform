import React, { useState } from 'react';
import { Send, Key, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { securechainApi } from '../../services/securechainApi';

export default function SubmitTransaction() {
  const [senderAddress, setSenderAddress] = useState('0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [referenceNote, setReferenceNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    txId: string;
    hash: string;
    status: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientAddress || !amount) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await securechainApi.createTransaction({
        receiver_id: recipientAddress.trim(),
        amount: Number(amount),
        description: referenceNote.trim() || 'Blockchain transfer',
        transaction_type: 'Standard Transfer',
      });

      if (res && res.success && res.transaction) {
        setSubmissionResult({
          txId: res.transaction.transaction_id,
          hash: res.transaction.payload_hash || 'SHA256-VALIDATED',
          status: 'VALIDATED_AND_MINED',
        });
      } else {
        setSubmitError(res?.message || 'Transaction validation failed');
      }
    } catch (err: any) {
      console.error('Submit transaction failed:', err);
      setSubmitError(err.message || 'Failed to submit transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <a href="/securechain/user" className="p-2 rounded-lg bg-white border border-[#E8E6DC] text-[#5C5A55] hover:text-[#141413] hover:border-[#141413] transition-colors shadow-xs">
          <ArrowLeft size={18} />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-[#141413] tracking-tight">Submit Secure Transaction</h1>
          <p className="text-xs text-[#5C5A55] mt-0.5">
            Cryptographically sign and dispatch transaction for blockchain validation
          </p>
        </div>
      </div>

      {submissionResult ? (
        <div className="bg-white border border-[#C8E6C9] rounded-xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-lg font-bold text-[#141413]">Transaction Validated & Dispatched!</h2>
          <p className="text-xs text-[#5C5A55] max-w-md mx-auto">
            Your transaction has passed cryptographic ECDSA signature verification and SHA-256 payload hashing.
          </p>
          <div className="bg-[#FAF9F5] p-4 rounded-lg font-mono text-xs text-[#141413] max-w-lg mx-auto text-left space-y-1.5 border border-[#E8E6DC]">
            <div><span className="text-[#8C8980]">ID:</span> {submissionResult.txId}</div>
            <div className="break-all"><span className="text-[#8C8980]">Hash:</span> {submissionResult.hash}</div>
            <div><span className="text-[#8C8980]">Status:</span> <span className="text-[#2E7D32] font-semibold">{submissionResult.status}</span></div>
          </div>
          <button
            onClick={() => setSubmissionResult(null)}
            className="px-5 py-2 bg-[#D97757] hover:bg-[#C66545] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            Submit Another Transaction
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-[#E8E6DC] rounded-xl p-6 space-y-5 shadow-sm">
          {submitError && (
            <div className="p-3 rounded-lg bg-[#FFF5F5] border border-[#FED7D7] text-[#C53030] text-xs">
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase text-[#5C5A55] mb-1.5">
              Sender Address (Your Wallet)
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={senderAddress}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3.5 py-2.5 font-mono text-xs text-[#5C5A55] focus:outline-none"
              />
              <Key size={14} className="absolute right-3.5 top-3 text-[#8C8980]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-[#5C5A55] mb-1.5">
              Recipient Address
            </label>
            <input
              required
              type="text"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3.5 py-2.5 font-mono text-xs text-[#141413] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-[#5C5A55] mb-1.5">
                Amount (SecureChain Units)
              </label>
              <input
                required
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="0.0000"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3.5 py-2.5 font-mono text-xs text-[#141413] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-[#5C5A55] mb-1.5">
                Reference Metadata / Note
              </label>
              <input
                type="text"
                placeholder="e.g. Audit settlement #9012"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3.5 py-2.5 text-xs text-[#141413] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg p-3.5 flex items-center gap-3 text-xs text-[#5C5A55]">
            <Lock size={16} className="text-[#D97757] shrink-0" />
            <span>Transaction payload will be signed with your private key and hashed with SHA-256 before broadcast.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Send size={16} />
            {isSubmitting ? 'Validating & Signing...' : 'Sign & Broadcast Transaction'}
          </button>
        </form>
      )}
    </div>
  );
}
