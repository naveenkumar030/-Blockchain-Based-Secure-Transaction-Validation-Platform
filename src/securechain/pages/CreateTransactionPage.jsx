import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Copy,
  Check,
  RefreshCw,
  FileText,
  UserCheck,
  Coins,
  Layers,
  Sparkles,
  Info,
  Clock,
  KeyRound
} from 'lucide-react';

import { securechainApi } from '../services/securechainApi';

export default function CreateTransactionPage() {
  const navigate = useNavigate();

  // ── Auth Protection ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // ── Form Input States ──
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState('Standard Transfer');
  const [description, setDescription] = useState('');

  // ── UI / Lifecycle States ──
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(1);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // ── Pre-filled sender wallet (current authenticated user) ──
  const senderAddress = localStorage.getItem('userEmail') || '0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98';

  // ── Frontend Validation ──
  const validateForm = () => {
    const errors = {};
    const trimmedReceiver = receiverId.trim();

    if (!trimmedReceiver) {
      errors.receiverId = 'Receiver ID or wallet address is required.';
    } else if (trimmedReceiver.length < 3) {
      errors.receiverId = 'Receiver ID must be at least 3 characters.';
    } else if (trimmedReceiver.toLowerCase() === senderAddress.toLowerCase()) {
      errors.receiverId = 'Cannot send transaction to your own sender address.';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      errors.amount = 'A valid transaction amount is required.';
    } else if (numAmount <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else if (numAmount > 1000000) {
      errors.amount = 'Amount exceeds maximum single transaction limit (1,000,000 SC).';
    }

    if (!description.trim()) {
      errors.description = 'Description or audit memo is required.';
    } else if (description.trim().length < 2) {
      errors.description = 'Description must be at least 2 characters long.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Real API Submission Handler ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionStep(1); // Validating structure

    try {
      const res = await securechainApi.createTransaction({
        receiver_id: receiverId.trim(),
        amount: parseFloat(amount),
        description: description.trim(),
        transaction_type: txType,
      });

      if (res.success && res.transaction) {
        setGeneratedReceipt({
          txId: res.transaction.transaction_id,
          hash: res.transaction.payload_hash,
          signature: res.transaction.signature,
          nonce: res.transaction.nonce,
          timestamp: res.transaction.timestamp ? new Date(res.transaction.timestamp).toUTCString() : new Date().toUTCString(),
          receiverId: res.transaction.receiver_id || receiverId.trim(),
          amount: parseFloat(res.transaction.amount).toFixed(4),
          txType: res.transaction.transaction_type || txType,
          description: res.transaction.description || description.trim(),
          blockNumber: res.transaction.block_number || (res.block && res.block.height) || 1420,
          blockHash: res.transaction.block_hash || (res.block && res.block.hash) || '',
          status: 'CONFIRMED',
          statusText: res.message || 'Mined into block & synchronized with Neo4j graph.',
        });
        setSubmissionSuccess(true);
      } else {
        setSubmissionError(res.message || 'Transaction validation failed during cryptographic audit.');
      }
    } catch (err) {
      setSubmissionError(err.message || 'Failed to submit transaction to SecureChain blockchain engine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setReceiverId('');
    setAmount('');
    setDescription('');
    setTxType('Standard Transfer');
    setFieldErrors({});
    setSubmissionSuccess(false);
    setGeneratedReceipt(null);
    setSubmissionError(null);
  };

  const handleCopyHash = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#141413] font-sans antialiased selection:bg-[#D97757]/20 selection:text-[#141413]">
      {/* ── Top Navigation Bar ── */}
      <header className="h-16 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E6DC] sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/blockchain/dashboard"
            className="flex items-center gap-2 text-xs font-semibold text-[#595856] hover:text-[#141413] transition-colors bg-white border border-[#E8E6DC] px-3 py-1.5 rounded-lg hover:bg-[#F5F3ED] shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-[#E8E6DC] hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D97757] flex items-center justify-center shadow-xs">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-[#141413]">SecureChain</span>
              <span className="text-[10px] text-[#8C8980] block">Transaction Dispatcher</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#595856] bg-white px-3 py-1 rounded-lg border border-[#E8E6DC] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
            Consensus: SHA-256 Validated
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Header Breadcrumbs & Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D97757] uppercase tracking-wider">
            <span>SecureChain Protocol</span>
            <span>•</span>
            <span>Transaction Creation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight">
            Create Secure Transaction
          </h1>
          <p className="text-xs sm:text-sm text-[#595856] max-w-xl">
            Dispatch a verifiable transaction to the SecureChain blockchain. Transaction parameters will be signed and hashed automatically.
          </p>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SUCCESS STATE RECEIPT                                         */}
        {/* ───────────────────────────────────────────────────────────── */}
        {submissionSuccess && generatedReceipt && (
          <div className="bg-white border border-[#E8E6DC] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-slide-in-up">
            {/* Success Header */}
            <div className="flex items-start gap-4 pb-6 border-b border-[#E8E6DC]">
              <div className="p-3 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] shrink-0">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[#141413]">
                    Transaction Successfully Created!
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                    Validated
                  </span>
                </div>
                <p className="text-xs text-[#595856]">
                  Payload verified and digitally signed. Transaction is now queued in the consensus mempool awaiting block inclusion.
                </p>
              </div>
            </div>

            {/* Generated Cryptographic Metadata (Automatic Fields) */}
            <div className="space-y-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8980]">
                Generated Blockchain Identifiers
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DC]">
                  <span className="text-[10px] font-bold text-[#8C8980] uppercase block mb-1">
                    Transaction ID
                  </span>
                  <span className="font-mono font-bold text-[#141413] text-sm">
                    {generatedReceipt.txId}
                  </span>
                </div>

                <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DC]">
                  <span className="text-[10px] font-bold text-[#8C8980] uppercase block mb-1">
                    Nonce Sequence
                  </span>
                  <span className="font-mono font-bold text-[#2E7D32] text-sm">
                    #{generatedReceipt.nonce}
                  </span>
                </div>
              </div>

              {/* SHA-256 Digest */}
              <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DC] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#8C8980] uppercase">
                    Generated SHA-256 Payload Hash
                  </span>
                  <button
                    onClick={() => handleCopyHash(generatedReceipt.hash)}
                    className="text-[11px] text-[#D97757] hover:text-[#C66545] font-semibold flex items-center gap-1 transition-colors"
                  >
                    {copiedHash ? (
                      <>
                        <Check size={12} className="text-[#2E7D32]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy Hash
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-xs text-[#141413] break-all select-all">
                  {generatedReceipt.hash}
                </p>
              </div>

              {/* Transaction Details Summary */}
              <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#E8E6DC] space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Receiver ID:</span>
                  <span className="font-mono text-[#141413] font-medium break-all text-right max-w-xs">
                    {generatedReceipt.receiverId}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Amount:</span>
                  <span className="font-mono font-bold text-[#D97757]">{generatedReceipt.amount} SC</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Transaction Type:</span>
                  <span className="text-[#141413] font-medium">{generatedReceipt.txType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Description:</span>
                  <span className="text-[#141413] font-medium">{generatedReceipt.description}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#8C8980]">Timestamp:</span>
                  <span className="text-[#595856] font-mono text-[11px]">{generatedReceipt.timestamp}</span>
                </div>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                id="btn-create-another-tx"
                onClick={handleResetForm}
                className="flex-1 py-3 px-4 bg-[#D97757] hover:bg-[#C66545] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Send size={15} /> Create Another Transaction
              </button>
              <Link
                to="/blockchain/dashboard"
                className="py-3 px-6 bg-white hover:bg-[#F5F3ED] text-[#141413] border border-[#E8E6DC] rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2 shadow-2xs"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TRANSACTION FORM (EDITING & LOADING STATES)                   */}
        {/* ───────────────────────────────────────────────────────────── */}
        {!submissionSuccess && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[#E8E6DC] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 relative"
          >
            {/* Error Banner */}
            {submissionError && (
              <div className="bg-[#FFF5F5] border border-[#FED7D7] rounded-xl p-4 flex items-start gap-3 text-[#9B2C2C] text-xs">
                <AlertTriangle size={18} className="text-[#C53030] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block font-bold">Transaction Creation Error</strong>
                  <span>{submissionError}</span>
                </div>
              </div>
            )}

            {/* Sender Address Readonly Badge */}
            <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-[#D97757]" />
                <span className="text-[#8C8980] font-medium">Sender Address (Authenticated):</span>
              </div>
              <span className="font-mono text-[#141413] font-semibold truncate max-w-[200px] sm:max-w-xs">
                {senderAddress}
              </span>
            </div>

            {/* Field 1: Receiver ID */}
            <div className="space-y-1.5">
              <label
                htmlFor="input-receiver-id"
                className="block text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5"
              >
                <UserCheck size={14} className="text-[#D97757]" />
                <span>1. Receiver ID *</span>
              </label>
              <input
                id="input-receiver-id"
                type="text"
                disabled={isSubmitting}
                placeholder="Enter receiver public address or entity ID (e.g. 0x3aE1...21b7)"
                value={receiverId}
                onChange={(e) => {
                  setReceiverId(e.target.value);
                  if (fieldErrors.receiverId) setFieldErrors({ ...fieldErrors, receiverId: null });
                }}
                className={`w-full bg-[#FAF9F5] border rounded-xl px-4 py-3 font-mono text-xs text-[#141413] placeholder-[#8C8980] focus:outline-none focus:bg-white transition-colors ${
                  fieldErrors.receiverId
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-[#E8E6DC] focus:border-[#D97757]'
                }`}
              />
              {fieldErrors.receiverId && (
                <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.receiverId}</p>
              )}
            </div>

            {/* Field 2 & 4: Amount & Transaction Type (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Field 2: Amount */}
              <div className="space-y-1.5">
                <label
                  htmlFor="input-amount"
                  className="block text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5"
                >
                  <Coins size={14} className="text-[#D97757]" />
                  <span>2. Amount (SC) *</span>
                </label>
                <div className="relative">
                  <input
                    id="input-amount"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    disabled={isSubmitting}
                    placeholder="0.0000"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (fieldErrors.amount) setFieldErrors({ ...fieldErrors, amount: null });
                    }}
                    className={`w-full bg-[#FAF9F5] border rounded-xl px-4 py-3 pr-14 font-mono text-xs text-[#141413] placeholder-[#8C8980] focus:outline-none focus:bg-white transition-colors ${
                      fieldErrors.amount
                        ? 'border-rose-500 focus:border-rose-400'
                        : 'border-[#E8E6DC] focus:border-[#D97757]'
                    }`}
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold font-mono text-[#8C8980]">
                    SC
                  </span>
                </div>
                {fieldErrors.amount ? (
                  <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.amount}</p>
                ) : (
                  <p className="text-[10px] text-[#8C8980] pl-1">Network validation fee: 0.0002 SC (Simulated)</p>
                )}
              </div>

              {/* Field 4: Transaction Type */}
              <div className="space-y-1.5">
                <label
                  htmlFor="select-tx-type"
                  className="block text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5"
                >
                  <Layers size={14} className="text-[#D97757]" />
                  <span>4. Transaction Type *</span>
                </label>
                <select
                  id="select-tx-type"
                  disabled={isSubmitting}
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-4 py-3 text-xs text-[#141413] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="Standard Transfer">Standard Transfer</option>
                  <option value="Audit Settlement">Audit Settlement</option>
                  <option value="Escrow Deposit">Escrow Deposit</option>
                  <option value="Compliance Record">Compliance Record</option>
                  <option value="Data Notarization">Data Notarization</option>
                </select>
                <p className="text-[10px] text-[#8C8980] pl-1">Determines consensus verification rules</p>
              </div>
            </div>

            {/* Field 3: Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="textarea-description"
                className="block text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5"
              >
                <FileText size={14} className="text-[#D97757]" />
                <span>3. Description / Memo *</span>
              </label>
              <textarea
                id="textarea-description"
                rows={3}
                disabled={isSubmitting}
                placeholder="Provide transaction details, audit invoice cross-reference, or validation note..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors({ ...fieldErrors, description: null });
                }}
                className={`w-full bg-[#FAF9F5] border rounded-xl px-4 py-3 text-xs text-[#141413] placeholder-[#8C8980] focus:outline-none focus:bg-white transition-colors resize-none ${
                  fieldErrors.description
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-[#E8E6DC] focus:border-[#D97757]'
                }`}
              />
              {fieldErrors.description && (
                <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.description}</p>
              )}
            </div>

            {/* Explicit Notice: Nonce, Timestamp, Hash, ID are system-generated */}
            <div className="p-4 bg-[#FDF4F0] border border-[#F0C5B5] rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-[#D97757] font-bold">
                <Lock size={14} />
                <span>Automated Cryptographic Generation</span>
              </div>
              <p className="text-[11px] text-[#595856] leading-relaxed">
                You do not need to supply a Transaction ID, Nonce, Timestamp, SHA-256 Hash, Digital Signature, or Block Number. These will be generated and signed securely upon confirmation.
              </p>
            </div>

            {/* Submission / Loading State Progress */}
            {isSubmitting ? (
              <div className="p-4 bg-[#FDF4F0] border border-[#F0C5B5] rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#141413] flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-[#D97757]" />
                    {submissionStep === 1 && '1/3 Generating SHA-256 Payload Hash...'}
                    {submissionStep === 2 && '2/3 Applying ECDSA Digital Signature...'}
                    {submissionStep === 3 && '3/3 Broadcasting to Consensus Nodes...'}
                  </span>
                  <span className="text-[11px] font-mono text-[#D97757]">
                    Step {submissionStep} of 3
                  </span>
                </div>
                <div className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#D97757] h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(submissionStep / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              /* Button: "Create Transaction" */
              <button
                id="btn-submit-create-transaction"
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl bg-[#D97757] hover:bg-[#C66545] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all"
              >
                <Send size={16} />
                <span>Create Transaction</span>
              </button>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
