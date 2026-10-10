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
  KeyRound,
  ExternalLink,
  X,
  ChevronRight,
  Eye,
  Sliders,
} from 'lucide-react';

import { securechainApi } from '../services/securechainApi';

export default function CreateTransactionPage() {
  const navigate = useNavigate();

  // ── Auth Protection & Identity ──
  const [senderEmail, setSenderEmail] = useState('');
  const [senderAddress, setSenderAddress] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    const email = localStorage.getItem('userEmail') || 'alex.mercer@securechain.io';
    setSenderEmail(email);
    setSenderAddress(localStorage.getItem('userWallet') || '0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98');
  }, [navigate]);

  // ── Eligible Recipients Directory ──
  const [recipients, setRecipients] = useState([
    { receiver_id: 'user_002', name: 'Bob (Merchant Node)', address: '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97', status: 'ACTIVE' },
    { receiver_id: 'bob@securechain.io', name: 'Bob Liquidity Vault', address: '0x71C8fb866336658E3f67933d037475f5D577230c', status: 'ACTIVE' },
    { receiver_id: 'alice@securechain.io', name: 'Alice Primary Node', address: '0x8fB92C87b12C9a19dE10A98b9C43fE0145a90d98', status: 'ACTIVE' },
    { receiver_id: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', name: 'Escrow Settlement Pool', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', status: 'ACTIVE' },
    { receiver_id: '0x1aD91ee08f21bE3de0BA2Ba69187184dB616B278', name: 'Smart Contract Escrow', address: '0x1aD91ee08f21bE3de0BA2Ba69187184dB616B278', status: 'ACTIVE' },
  ]);

  useEffect(() => {
    securechainApi.getEligibleRecipients().then((data) => {
      if (data && data.length > 0) setRecipients(data);
    }).catch(() => {});
  }, []);

  // ── Form Input States ──
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [precision, setPrecision] = useState(4); // Configurable decimal precision
  const [description, setDescription] = useState('');
  const [txType, setTxType] = useState('Standard Transfer');
  const [autoMine, setAutoMine] = useState(false); // Pending pool vs immediate block mine

  // ── UI States ──
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(1);
  const [submissionError, setSubmissionError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState(false);

  // ── Field-Level Validation ──
  const validateForm = () => {
    const errors = {};
    const trimmedReceiver = receiverId.trim();

    if (!trimmedReceiver) {
      errors.receiverId = 'Receiver ID or recipient wallet address is required.';
    } else if (trimmedReceiver.length < 3) {
      errors.receiverId = 'Receiver ID must be at least 3 characters long.';
    } else if (
      trimmedReceiver.toLowerCase() === senderEmail.toLowerCase() ||
      trimmedReceiver.toLowerCase() === senderAddress.toLowerCase()
    ) {
      errors.receiverId = 'Self-transfer rejected: Sender and receiver cannot be the same entity.';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      errors.amount = 'A valid transaction amount is required.';
    } else if (numAmount <= 0) {
      errors.amount = 'Amount must be strictly greater than zero.';
    } else if (numAmount > 100000000) {
      errors.amount = 'Amount exceeds maximum permitted limit (100,000,000 SC).';
    } else {
      // Check decimal precision
      const parts = amount.toString().split('.');
      if (parts[1] && parts[1].length > precision) {
        errors.amount = `Amount exceeds configured precision of ${precision} decimal places.`;
      }
    }

    if (description && description.length > 500) {
      errors.description = `Description exceeds maximum allowed limit (500 chars). Currently: ${description.length} chars.`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Button Handlers ──

  // 1. "Review Transaction" Button -> Validates & Opens Preview
  const handleReviewTransaction = (e) => {
    if (e) e.preventDefault();
    setSubmissionError(null);
    if (validateForm()) {
      setShowPreviewModal(true);
    }
  };

  // 2. "Cancel" Button -> Clears form or resets state
  const handleCancel = () => {
    if (showPreviewModal) {
      setShowPreviewModal(false);
    } else {
      setReceiverId('');
      setAmount('');
      setDescription('');
      setFieldErrors({});
      setSubmissionError(null);
      navigate('/blockchain/dashboard');
    }
  };

  // 3. "Create Secure Transaction" Button -> Submits to backend API
  const handleExecuteTransaction = async () => {
    if (isSubmitting) return; // Prevent duplicate submission
    setSubmissionError(null);

    if (!validateForm()) {
      setShowPreviewModal(false);
      return;
    }

    setIsSubmitting(true);
    setSubmissionStep(1); // Generating SHA-256 & canonical representation

    try {
      const formattedAmount = parseFloat(parseFloat(amount).toFixed(precision));

      // Simulate visible micro-step for cryptographic feedback
      setTimeout(() => setSubmissionStep(2), 250);

      const res = await securechainApi.createSecureTransaction({
        receiver_id: receiverId.trim(),
        amount: formattedAmount,
        description: description.trim(),
        transaction_type: txType,
        auto_mine: autoMine,
      });

      setSubmissionStep(3); // Recording to ledger

      if (res && (res.success || res.transaction_id || res.tx_id)) {
        const txId = res.transaction_id || res.tx_id || (res.transaction && res.transaction.transaction_id);
        const txHash = res.transaction_hash || res.payload_hash || (res.transaction && res.transaction.payload_hash);
        const txSig = res.signature || (res.transaction && res.transaction.signature);
        const txNonce = res.nonce || (res.transaction && res.transaction.nonce);
        const txStatus = res.status || (res.transaction && res.transaction.status) || 'PENDING';
        const txTimestamp = res.timestamp || (res.transaction && res.transaction.timestamp) || new Date().toISOString();

        // Block information ONLY when available
        const blockHeight = res.block_number ?? res.block_height ?? (res.block_info && res.block_info.height) ?? (res.block && res.block.height) ?? null;
        const blockHash = res.block_hash ?? (res.block_info && res.block_info.hash) ?? (res.block && res.block.hash) ?? null;

        setGeneratedReceipt({
          txId,
          hash: txHash,
          signature: txSig,
          nonce: txNonce,
          timestamp: new Date(txTimestamp).toUTCString(),
          receiverId: res.receiver_id || receiverId.trim(),
          amount: formattedAmount.toFixed(precision),
          description: res.description || description.trim() || 'No memo provided',
          txType: res.transaction_type || txType,
          status: txStatus.toUpperCase(),
          blockHeight,
          blockHash,
          blockInfo: res.block_info || (blockHeight ? { height: blockHeight, hash: blockHash } : null),
          validationChecks: res.validation || {},
          message: res.message || 'Transaction accepted and recorded in SecureChain ledger.',
        });

        setShowPreviewModal(false);
        setSubmissionSuccess(true);
      } else {
        setSubmissionError(res.message || 'Transaction validation rejected by consensus rules.');
        setShowPreviewModal(false);
      }
    } catch (err) {
      setShowPreviewModal(false);
      setSubmissionError(err.message || 'Failed to submit transaction to SecureChain blockchain engine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setReceiverId('');
    setAmount('');
    setDescription('');
    setFieldErrors({});
    setSubmissionSuccess(false);
    setGeneratedReceipt(null);
    setSubmissionError(null);
  };

  const handleCopyText = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedTxId(true);
      setTimeout(() => setCopiedTxId(false), 2000);
    }
  };

  // Find recipient display name if recognized
  const recognizedRecipient = recipients.find(
    (r) => r.receiver_id.toLowerCase() === receiverId.trim().toLowerCase() ||
           r.address.toLowerCase() === receiverId.trim().toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#141413] font-sans antialiased selection:bg-[#D97757]/20 selection:text-[#141413]">
      {/* ── Top Navigation Header ── */}
      <header className="h-16 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E6DC] sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/blockchain/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-[#595856] hover:text-[#141413] transition-colors bg-white border border-[#E8E6DC] px-3 py-1.5 rounded-lg hover:bg-[#F5F3ED] shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>
          <div className="h-4 w-px bg-[#E8E6DC] hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D97757] flex items-center justify-center shadow-xs">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-[#141413]">SecureChain</span>
              <span className="text-[10px] text-[#8C8980] block">Secure Transaction Module</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/blockchain/verify"
            className="hidden sm:flex items-center gap-1.5 text-xs text-[#595856] hover:text-[#D97757] font-semibold bg-white border border-[#E8E6DC] px-3 py-1.5 rounded-lg transition-colors"
          >
            <Eye size={13} />
            <span>Verify Transaction</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono text-[#595856] bg-white px-3 py-1 rounded-lg border border-[#E8E6DC] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
            Consensus: Active
          </div>
        </div>
      </header>

      {/* ── Main Workspace ── */}
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
            Dispatch a cryptographically verifiable transaction. The payload will be deterministically canonicalized, SHA-256 hashed, and signed with your authenticated identity.
          </p>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 1. SUCCESS RECEIPT STATE                                      */}
        {/* ───────────────────────────────────────────────────────────── */}
        {submissionSuccess && generatedReceipt && (
          <div className="bg-white border border-[#E8E6DC] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-slide-in-up">
            {/* Success Header Banner */}
            <div className="flex items-start gap-4 pb-6 border-b border-[#E8E6DC]">
              <div className="p-3 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] shrink-0">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-[#141413]">
                    Secure Transaction Dispatched!
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      generatedReceipt.status === 'CONFIRMED' || generatedReceipt.status === 'VALID'
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                        : 'bg-[#FFF8E1] text-[#B78103] border border-[#FFE082]'
                    }`}
                  >
                    {generatedReceipt.status}
                  </span>
                </div>
                <p className="text-xs text-[#595856]">
                  {generatedReceipt.message}
                </p>
              </div>
            </div>

            {/* Cryptographic Identifiers */}
            <div className="space-y-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#8C8980]">
                Verified Cryptographic Identifiers
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Transaction ID */}
                <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DC] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#8C8980] uppercase block mb-1">
                      Transaction ID
                    </span>
                    <span className="font-mono font-bold text-[#141413] text-sm">
                      {generatedReceipt.txId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(generatedReceipt.txId, 'txId')}
                    className="p-1.5 text-[#8C8980] hover:text-[#D97757] rounded-lg transition-colors"
                    title="Copy Transaction ID"
                  >
                    {copiedTxId ? <Check size={14} className="text-[#2E7D32]" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Nonce Sequence */}
                <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DC]">
                  <span className="text-[10px] font-bold text-[#8C8980] uppercase block mb-1">
                    Nonce / Sequence #
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
                    SHA-256 Transaction Hash
                  </span>
                  <button
                    onClick={() => handleCopyText(generatedReceipt.hash, 'hash')}
                    className="text-[11px] text-[#D97757] hover:text-[#C66545] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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

              {/* Block Information ONLY when available */}
              {generatedReceipt.blockHeight ? (
                <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DC] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#2E7D32] uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2E7D32]"></span>
                      Block Inclusion Confirmed
                    </span>
                    <span className="font-mono font-bold text-xs text-[#141413]">
                      Block #{generatedReceipt.blockHeight}
                    </span>
                  </div>
                  {generatedReceipt.blockHash && (
                    <div className="pt-1 border-t border-[#E8E6DC]">
                      <span className="text-[10px] text-[#8C8980] block mb-0.5">Block Hash:</span>
                      <p className="font-mono text-[11px] text-[#595856] break-all">
                        {generatedReceipt.blockHash}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#FFFDF7] p-3.5 rounded-xl border border-[#FFE082] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-[#B78103]" />
                    <span className="font-medium text-[#7A5A00]">
                      Transaction Status: <strong>PENDING</strong> in consensus mempool
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8C8980]">
                    Block will be assigned upon next batch mining
                  </span>
                </div>
              )}

              {/* Summary Details */}
              <div className="bg-[#FAF9F5] p-4 rounded-xl border border-[#E8E6DC] space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Sender ID (Authenticated):</span>
                  <span className="font-mono text-[#141413] font-medium">{senderEmail}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Receiver ID:</span>
                  <span className="font-mono text-[#141413] font-medium break-all text-right max-w-xs">
                    {generatedReceipt.receiverId}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Transfer Amount:</span>
                  <span className="font-mono font-bold text-[#D97757] text-sm">
                    {generatedReceipt.amount} SC
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Description / Memo:</span>
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
              <Link
                to={`/blockchain/verify`}
                className="flex-1 py-3 px-4 bg-[#D97757] hover:bg-[#C66545] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-center"
              >
                <Eye size={15} /> Verify On-Chain Integrity
              </Link>
              <button
                id="btn-create-another-tx"
                onClick={handleResetForm}
                className="py-3 px-6 bg-white hover:bg-[#F5F3ED] text-[#141413] border border-[#E8E6DC] rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Send size={14} /> Create Another
              </button>
              <Link
                to="/blockchain/dashboard"
                className="py-3 px-5 bg-white hover:bg-[#F5F3ED] text-[#595856] hover:text-[#141413] border border-[#E8E6DC] rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center shadow-2xs"
              >
                Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 2. TRANSACTION CREATION FORM                                  */}
        {/* ───────────────────────────────────────────────────────────── */}
        {!submissionSuccess && (
          <form
            onSubmit={handleReviewTransaction}
            className="bg-white border border-[#E8E6DC] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 relative"
          >
            {/* Error Banner */}
            {submissionError && (
              <div className="bg-[#FFF5F5] border border-[#FED7D7] rounded-xl p-4 flex items-start gap-3 text-[#9B2C2C] text-xs animate-shake">
                <AlertTriangle size={18} className="text-[#C53030] shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <strong className="block font-bold">Transaction Creation Failed</strong>
                  <span>{submissionError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmissionError(null)}
                  className="text-[#9B2C2C] hover:text-black p-1 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Read-Only Authenticated Sender Identity */}
            <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#595856]">
                  <KeyRound size={15} className="text-[#D97757]" />
                  <span className="font-semibold text-[#141413]">Sender ID (Authenticated Identity):</span>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                  Verified Session
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="truncate">
                  <span className="text-[#8C8980]">User Account: </span>
                  <strong className="text-[#141413]">{senderEmail}</strong>
                </div>
                <div className="truncate text-left sm:text-right">
                  <span className="text-[#8C8980]">Wallet Address: </span>
                  <strong className="text-[#141413]">{senderAddress}</strong>
                </div>
              </div>
              <p className="text-[10px] text-[#8C8980] pt-1 border-t border-[#E8E6DC]/80">
                Sender identity is strictly derived from verified credentials on the server and cannot be spoofed.
              </p>
            </div>

            {/* Field 1: Receiver ID */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="input-receiver-id"
                  className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5"
                >
                  <UserCheck size={14} className="text-[#D97757]" />
                  <span>Receiver ID *</span>
                </label>
                {recognizedRecipient && (
                  <span className="text-[11px] text-[#2E7D32] font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> {recognizedRecipient.name}
                  </span>
                )}
              </div>

              <input
                id="input-receiver-id"
                type="text"
                disabled={isSubmitting}
                placeholder="Enter registered recipient ID or public address (e.g. user_002, 0x4838B1...)"
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

              {/* Quick Select from Eligible Directory */}
              <div className="pt-1">
                <span className="text-[10px] text-[#8C8980] block mb-1.5 font-medium">
                  Quick Select Registered Eligible Recipients:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {recipients.slice(0, 4).map((r) => (
                    <button
                      key={r.receiver_id}
                      type="button"
                      onClick={() => {
                        setReceiverId(r.receiver_id);
                        if (fieldErrors.receiverId) setFieldErrors({ ...fieldErrors, receiverId: null });
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-[#F5F3ED] border border-[#E8E6DC] rounded-lg text-[11px] text-[#595856] hover:text-[#141413] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{r.name}</span>
                      <span className="text-[9px] font-mono text-[#8C8980]">({r.receiver_id})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Field 2 & Precision: Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label
                  htmlFor="input-amount"
                  className="block text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5"
                >
                  <Coins size={14} className="text-[#D97757]" />
                  <span>Amount (SC) *</span>
                </label>
                <div className="relative">
                  <input
                    id="input-amount"
                    type="number"
                    step={1 / Math.pow(10, precision)}
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
                {fieldErrors.amount && (
                  <p className="text-[11px] text-rose-500 font-medium pl-1">{fieldErrors.amount}</p>
                )}
              </div>

              {/* Decimal Precision Control */}
              <div className="space-y-1.5">
                <label
                  htmlFor="select-precision"
                  className="block text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5"
                >
                  <Sliders size={14} className="text-[#D97757]" />
                  <span>Precision</span>
                </label>
                <select
                  id="select-precision"
                  disabled={isSubmitting}
                  value={precision}
                  onChange={(e) => setPrecision(Number(e.target.value))}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3 py-3 text-xs text-[#141413] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors cursor-pointer"
                >
                  <option value={2}>2 Decimals (0.00)</option>
                  <option value={4}>4 Decimals (0.0000)</option>
                  <option value={6}>6 Decimals (0.000000)</option>
                </select>
                <span className="text-[10px] text-[#8C8980] block pl-1">Configurable limit</span>
              </div>
            </div>

            {/* Field 3: Description (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="textarea-description"
                  className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5"
                >
                  <FileText size={14} className="text-[#D97757]" />
                  <span>Description / Memo (Optional)</span>
                </label>
                <span className={`text-[10px] font-mono ${description.length > 500 ? 'text-rose-500 font-bold' : 'text-[#8C8980]'}`}>
                  {description.length} / 500
                </span>
              </div>
              <textarea
                id="textarea-description"
                rows={3}
                disabled={isSubmitting}
                placeholder="Optional purpose, invoice cross-reference, audit note, or contract memo..."
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

            {/* Optional Block Inclusion Mode Toggle */}
            <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-[#141413] block">Consensus Inclusion Mode:</span>
                <span className="text-[11px] text-[#8C8980]">
                  {autoMine ? 'Immediate Block Mine (Demo)' : 'Pending Mempool Queue (Standard Blockchain Flow)'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoMine}
                  onChange={(e) => setAutoMine(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#E8E6DC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#D97757]"></div>
              </label>
            </div>

            {/* Cryptographic Automated Field Guarantee */}
            <div className="p-4 bg-[#FDF4F0] border border-[#F0C5B5] rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-2 text-[#D97757] font-bold">
                <Lock size={14} />
                <span>Deterministic Cryptographic Pipeline</span>
              </div>
              <p className="text-[11px] text-[#595856] leading-relaxed">
                Transaction ID, Nonce, Timestamp, SHA-256 Hash, and Digital Signature are strictly server-managed or verified cryptographically. Private keys are never stored in databases.
              </p>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="btn-review-transaction"
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Eye size={16} />
                <span>Review Transaction</span>
              </button>

              <button
                id="btn-cancel"
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="py-3.5 px-6 rounded-xl bg-white hover:bg-[#F5F3ED] border border-[#E8E6DC] text-[#595856] hover:text-[#141413] font-bold text-xs sm:text-sm transition-all shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. TRANSACTION PREVIEW MODAL                                  */}
        {/* ───────────────────────────────────────────────────────────── */}
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 bg-[#141413]/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#E8E6DC] rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl animate-scale-in">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E8E6DC]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#D97757]/10 text-[#D97757] flex items-center justify-center">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#141413]">Transaction Preview</h3>
                    <span className="text-[10px] text-[#8C8980]">Confirm details prior to cryptographic commitment</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  disabled={isSubmitting}
                  className="p-1.5 text-[#8C8980] hover:text-[#141413] rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Preview Details Card */}
              <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Sender ID:</span>
                  <span className="font-mono text-[#141413] font-semibold">{senderEmail}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Receiver ID:</span>
                  <div className="text-right">
                    <span className="font-mono text-[#141413] font-semibold block">{receiverId.trim()}</span>
                    {recognizedRecipient && (
                      <span className="text-[10px] text-[#2E7D32] font-semibold">{recognizedRecipient.name}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[#E8E6DC] items-center">
                  <span className="text-[#8C8980]">Transfer Amount:</span>
                  <span className="font-mono font-extrabold text-[#D97757] text-base">
                    {parseFloat(amount).toFixed(precision)} SC
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Transaction Type:</span>
                  <span className="text-[#141413] font-medium">{txType}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[#E8E6DC]">
                  <span className="text-[#8C8980]">Description / Memo:</span>
                  <span className="text-[#141413] font-medium max-w-[240px] text-right truncate">
                    {description.trim() || '(No memo provided)'}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 items-center">
                  <span className="text-[#8C8980]">Consensus Mode:</span>
                  <span className="font-medium text-[#141413]">
                    {autoMine ? 'Auto-Mine into Block' : 'Queue in Pending Mempool'}
                  </span>
                </div>
              </div>

              {/* Security Audit Guarantee */}
              <div className="p-3.5 bg-[#FAF9F5] rounded-xl border border-[#E8E6DC] text-[11px] text-[#595856] flex items-center gap-2.5">
                <Lock size={15} className="text-[#2E7D32] shrink-0" />
                <span>
                  The server will verify recipient eligibility, generate a server timestamp, calculate a deterministic SHA-256 hash, and verify the digital signature.
                </span>
              </div>

              {/* Progress indicator when submitting */}
              {isSubmitting && (
                <div className="p-3 bg-[#FDF4F0] border border-[#F0C5B5] rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141413] flex items-center gap-2">
                      <RefreshCw size={13} className="animate-spin text-[#D97757]" />
                      {submissionStep === 1 && 'Canonicalizing & Calculating SHA-256 Hash...'}
                      {submissionStep === 2 && 'Signing Payload with Cryptographic Key...'}
                      {submissionStep === 3 && 'Committing to SecureChain Ledger...'}
                    </span>
                    <span className="font-mono text-[#D97757] text-[11px]">Step {submissionStep}/3</span>
                  </div>
                  <div className="w-full bg-[#FAF9F5] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#D97757] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(submissionStep / 3) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  id="btn-create-secure-transaction"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleExecuteTransaction}
                  className="flex-1 py-3 px-5 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processing Transaction...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Create Secure Transaction</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowPreviewModal(false)}
                  className="py-3 px-5 bg-white hover:bg-[#F5F3ED] border border-[#E8E6DC] text-[#595856] hover:text-[#141413] rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  Back to Form
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
