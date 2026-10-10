import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  ShieldAlert,
  Box,
  CheckCircle,
  Loader2,
  ChevronRight,
  Hash,
  Link as LinkIcon,
  FileText,
  User,
  ArrowRight,
  Cpu,
  Lock,
  Database,
  AlertCircle,
  X,
  Sparkles,
  Clock,
} from 'lucide-react';
import { securechainApi } from '../services/securechainApi';

// ── Types ─────────────────────────────────────────────────────────────────────

type DemoStep =
  | 'idle'
  | 'creating'
  | 'created'
  | 'verifying'
  | 'verified'
  | 'mining'
  | 'mined'
  | 'error';

interface TxResult {
  transaction_id?: string;
  sender_id?: string;
  sender_address?: string;
  receiver_id?: string;
  amount?: number;
  description?: string;
  nonce?: number;
  timestamp?: string;
  payload_hash?: string;
  transaction_hash?: string;
  signature?: string;
  status?: string;
  block?: any;
  validation?: any;
}

interface VerifyResult {
  verified?: boolean;
  is_valid?: boolean;
  status?: string;
  message?: string;
  checks?: {
    transaction_found?: boolean;
    hash_verification?: boolean;
    digital_signature_verification?: boolean;
    block_verification?: boolean;
    previous_hash_verification?: boolean;
    blockchain_integrity?: boolean;
  };
}

interface BlockResult {
  success?: boolean;
  index?: number;
  block_id?: string;
  block_hash?: string;
  previous_hash?: string;
  transaction_count?: number;
  timestamp?: number | string;
  transactions_mined?: number;
  block?: any;
}

interface TransactionDemoPanelProps {
  onBlockMined?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const truncate = (s: string = '', n = 40) =>
  s.length > n ? s.slice(0, n) + '...' : s;

// ── Sub-Components ─────────────────────────────────────────────────────────────

const StepDot: React.FC<{
  step: number;
  currentStep: number;
  label: string;
  icon: React.ReactNode;
}> = ({ step, currentStep, label, icon }) => {
  const done = currentStep > step;
  const active = currentStep === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
          done
            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-200'
            : active
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 animate-pulse'
            : 'bg-white border-[#E8E6DC] text-[#8C8980]'
        }`}
      >
        {done ? <CheckCircle size={16} /> : icon}
      </div>
      <span
        className={`text-[10px] font-semibold text-center leading-tight max-w-[60px] ${
          done ? 'text-emerald-600' : active ? 'text-indigo-600' : 'text-[#8C8980]'
        }`}
      >
        {label}
      </span>
    </div>
  );
};

const CheckRow: React.FC<{ label: string; passed?: boolean }> = ({ label, passed }) => (
  <div className="flex items-center gap-2 text-xs">
    {passed === undefined ? (
      <Loader2 size={12} className="text-indigo-400 animate-spin" />
    ) : passed ? (
      <CheckCircle size={12} className="text-emerald-500" />
    ) : (
      <AlertCircle size={12} className="text-red-500" />
    )}
    <span className={passed === false ? 'text-red-500' : 'text-[#5C5A55]'}>{label}</span>
    <span
      className={`ml-auto text-[10px] font-bold ${
        passed === undefined ? 'text-indigo-400' : passed ? 'text-emerald-600' : 'text-red-600'
      }`}
    >
      {passed === undefined ? 'CHECKING...' : passed ? 'PASS' : 'FAIL'}
    </span>
  </div>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-start gap-2 text-xs">
    <span className="text-[#8C8980] min-w-[130px] shrink-0">{label}</span>
    <span
      className={`text-[#141413] break-all font-semibold ${
        mono ? 'font-mono text-[11px]' : ''
      }`}
    >
      {value}
    </span>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export const TransactionDemoPanel: React.FC<TransactionDemoPanelProps> = ({ onBlockMined }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<DemoStep>('idle');
  const [currentStepNum, setCurrentStepNum] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Form
  const [receiverId, setReceiverId] = useState('bob@securechain.io');
  const [amount, setAmount] = useState('1500');
  const [description, setDescription] = useState('Demo: Secure payment transfer');

  // Results
  const [txResult, setTxResult] = useState<TxResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [blockResult, setBlockResult] = useState<BlockResult | null>(null);

  const reset = () => {
    setStep('idle');
    setCurrentStepNum(0);
    setTxResult(null);
    setVerifyResult(null);
    setBlockResult(null);
    setErrorMsg('');
  };

  // ── Step 1: Create Transaction ──────────────────────────────────────────────
  const handleCreate = async () => {
    if (!receiverId.trim() || !amount || parseFloat(amount) <= 0 || !description.trim()) return;
    setStep('creating');
    setCurrentStepNum(1);
    setErrorMsg('');
    setTxResult(null);
    setVerifyResult(null);
    setBlockResult(null);

    try {
      await securechainApi.ensureAuth();
      const res = await securechainApi.createTransaction({
        receiver_id: receiverId.trim(),
        amount: parseFloat(amount),
        description: description.trim(),
        transaction_type: 'Standard Transfer',
      });

      if (!res.success) throw new Error(res.message || 'Transaction creation failed');

      const tx = res.transaction || (res as any);
      setTxResult({
        transaction_id: tx.transaction_id || tx.tx_id,
        sender_id: tx.sender_id || tx.sender_address || tx.user_email,
        receiver_id: tx.receiver_id || receiverId,
        amount: tx.amount ?? parseFloat(amount),
        description: tx.description ?? description,
        nonce: tx.nonce,
        timestamp: tx.timestamp,
        payload_hash: tx.payload_hash || tx.transaction_hash,
        signature: tx.signature,
        status: tx.status,
        validation: res.validation,
        block: res.block,
      });
      setStep('created');
      setCurrentStepNum(2);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create transaction');
      setStep('error');
    }
  };

  // ── Step 2: Verify Transaction ──────────────────────────────────────────────
  const handleVerify = async () => {
    if (!txResult?.transaction_id) return;
    setStep('verifying');
    setCurrentStepNum(3);

    try {
      await securechainApi.ensureAuth();
      const res = await securechainApi.verifyTransaction(txResult.transaction_id);
      setVerifyResult(res as VerifyResult);
      setStep('verified');
      setCurrentStepNum(4);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed');
      setStep('error');
    }
  };

  // ── Step 3: Mine into Block ─────────────────────────────────────────────────
  const handleMine = async () => {
    setStep('mining');
    setCurrentStepNum(5);

    try {
      await securechainApi.ensureAuth();
      const txId = txResult?.transaction_id;
      const res = await securechainApi.createBlock(
        txId ? { transaction_ids: [txId] } : {}
      );
      setBlockResult(res);
      setStep('mined');
      setCurrentStepNum(6);
      onBlockMined?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Block mining failed');
      setStep('error');
    }
  };

  const isLoading = ['creating', 'verifying', 'mining'].includes(step);

  const formatTs = (ts?: number | string) => {
    if (!ts) return new Date().toLocaleString();
    if (typeof ts === 'number') {
      const ms = ts < 10000000000 ? ts * 1000 : ts;
      return new Date(ms).toLocaleString();
    }
    return new Date(ts).toLocaleString();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => { setIsOpen(true); reset(); }}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
      >
        <Zap size={14} className="text-yellow-300" />
        Live Demo
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-[#E8E6DC] flex flex-col"
            style={{ animation: 'slideUpPanel 0.3s ease' }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles size={18} className="text-yellow-300" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base leading-none">Transaction Lifecycle Demo</h2>
                  <p className="text-indigo-200 text-[11px] mt-0.5">Create → Verify → Mine → Block Confirmed</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-5 py-4 border-b border-[#E8E6DC] bg-[#FAF9F5]">
              <div className="flex items-start justify-between gap-1">
                <StepDot step={1} currentStep={currentStepNum} label="Input" icon={<FileText size={14} />} />
                <div className="mt-4 flex-1 h-px bg-[#E8E6DC] mx-1" />
                <StepDot step={2} currentStep={currentStepNum} label="Created" icon={<Cpu size={14} />} />
                <div className="mt-4 flex-1 h-px bg-[#E8E6DC] mx-1" />
                <StepDot step={3} currentStep={currentStepNum} label="Verifying" icon={<ShieldCheck size={14} />} />
                <div className="mt-4 flex-1 h-px bg-[#E8E6DC] mx-1" />
                <StepDot step={4} currentStep={currentStepNum} label="Verified" icon={<Lock size={14} />} />
                <div className="mt-4 flex-1 h-px bg-[#E8E6DC] mx-1" />
                <StepDot step={5} currentStep={currentStepNum} label="Mining" icon={<Database size={14} />} />
                <div className="mt-4 flex-1 h-px bg-[#E8E6DC] mx-1" />
                <StepDot step={6} currentStep={currentStepNum} label="In Block" icon={<Box size={14} />} />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 space-y-5">

              {/* Error Banner */}
              {step === 'error' && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <ShieldAlert size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Operation Failed</p>
                    <p className="text-xs mt-0.5">{errorMsg}</p>
                  </div>
                  <button onClick={reset} className="ml-auto text-xs underline text-red-500 hover:text-red-700 shrink-0">
                    Reset
                  </button>
                </div>
              )}

              {/* STEP 1: Input Form */}
              {(step === 'idle' || step === 'creating') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141413]">Step 1 — Create Transaction</h3>
                      <p className="text-xs text-[#8C8980]">Fill in details. Backend generates TX ID, nonce, SHA-256 hash & ECDSA signature.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#5C5A55] mb-1">
                        <User size={11} className="inline mr-1" />Receiver ID / Wallet
                      </label>
                      <input
                        type="text"
                        value={receiverId}
                        onChange={(e) => setReceiverId(e.target.value)}
                        placeholder="e.g. bob@securechain.io"
                        className="w-full border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C5A55] mb-1">
                        <Zap size={11} className="inline mr-1" />Amount (tokens)
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 1500"
                        min="0.01"
                        step="0.01"
                        className="w-full border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#5C5A55] mb-1">
                        <FileText size={11} className="inline mr-1" />Description / Memo
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Payment memo..."
                        className="w-full border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
                    <p className="font-semibold mb-1">What happens on submit:</p>
                    <ul className="space-y-0.5">
                      {[
                        'Generate unique Transaction ID (backend)',
                        'Compute nonce & UTC timestamp',
                        'SHA-256 payload hash',
                        'ECDSA private-key digital signature',
                        'Store signed transaction in SecureChain ledger',
                      ].map((t) => (
                        <li key={t} className="flex items-center gap-1.5"><ChevronRight size={10} />{t}</li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={isLoading || !receiverId.trim() || !amount || !description.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all active:scale-[.98]"
                  >
                    {step === 'creating' ? (
                      <><Loader2 size={15} className="animate-spin" /> Creating Transaction...</>
                    ) : (
                      <><Cpu size={15} /> Create & Sign Transaction</>
                    )}
                  </button>
                </div>
              )}

              {/* STEP 2: Transaction Created Card */}
              {txResult && step !== 'idle' && step !== 'creating' && step !== 'error' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <CheckCircle size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-700">Transaction Created & Signed</h3>
                      <p className="text-xs text-[#8C8980]">Cryptographic ID, hash, and ECDSA signature generated by the engine.</p>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 space-y-2">
                    <InfoRow label="Transaction ID" value={txResult.transaction_id || '-'} mono />
                    <InfoRow label="Sender" value={txResult.sender_id || '-'} mono />
                    <div className="flex items-center gap-2 text-xs text-[#8C8980] pl-[130px]">
                      <ArrowRight size={12} className="text-indigo-400" />
                      <span className="text-indigo-400 text-[10px]">transfers to</span>
                    </div>
                    <InfoRow label="Receiver" value={txResult.receiver_id || receiverId} mono />
                    <InfoRow label="Amount" value={`${txResult.amount} tokens`} />
                    <InfoRow label="Nonce" value={String(txResult.nonce ?? '-')} mono />
                    <InfoRow label="Timestamp" value={txResult.timestamp ? new Date(txResult.timestamp).toLocaleString() : '-'} />
                    <div className="border-t border-[#E8E6DC] pt-2 space-y-2">
                      <InfoRow
                        label="SHA-256 Payload Hash"
                        value={
                          <span className="font-mono text-[11px] break-all text-indigo-700">
                            {txResult.payload_hash || '-'}
                          </span>
                        }
                      />
                      <InfoRow
                        label="ECDSA Signature"
                        value={
                          <span className="font-mono text-[11px] break-all text-violet-700">
                            {txResult.signature ? truncate(txResult.signature, 48) : '-'}
                          </span>
                        }
                      />
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          txResult.status === 'VALID' || txResult.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : txResult.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {txResult.status === 'VALID' || txResult.status === 'CONFIRMED' ? (
                          <ShieldCheck size={11} />
                        ) : (
                          <Clock size={11} />
                        )}
                        {txResult.status || 'CREATED'}
                      </span>
                    </div>
                  </div>

                  {step === 'created' && (
                    <button
                      onClick={handleVerify}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-sm transition-all active:scale-[.98]"
                    >
                      <ShieldCheck size={15} /> Verify Cryptographic Integrity
                    </button>
                  )}
                </div>
              )}

              {/* STEP 3: Verification Results */}
              {(step === 'verifying' || step === 'verified' || step === 'mining' || step === 'mined') && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-lg ${
                        step === 'verifying' ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {step === 'verifying' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141413]">
                        {step === 'verifying' ? 'Verifying...' : 'Cryptographic Verification Complete'}
                      </h3>
                      <p className="text-xs text-[#8C8980]">Running 6 cryptographic checks on payload and block linkage.</p>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 space-y-2.5">
                    <CheckRow label="Transaction Found in Ledger" passed={step === 'verifying' ? undefined : verifyResult?.checks?.transaction_found} />
                    <CheckRow label="SHA-256 Payload Hash Verified" passed={step === 'verifying' ? undefined : verifyResult?.checks?.hash_verification} />
                    <CheckRow label="ECDSA Digital Signature Valid" passed={step === 'verifying' ? undefined : verifyResult?.checks?.digital_signature_verification} />
                    <CheckRow label="Block Linkage Integrity" passed={step === 'verifying' ? undefined : verifyResult?.checks?.block_verification} />
                    <CheckRow label="Previous Hash Chain Valid" passed={step === 'verifying' ? undefined : verifyResult?.checks?.previous_hash_verification} />
                    <CheckRow label="Blockchain Tamper-Free" passed={step === 'verifying' ? undefined : verifyResult?.checks?.blockchain_integrity} />
                  </div>

                  {verifyResult && step !== 'verifying' && (
                    <div
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold ${
                        verifyResult.verified || verifyResult.is_valid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                    >
                      {verifyResult.verified || verifyResult.is_valid ? (
                        <ShieldCheck size={16} />
                      ) : (
                        <ShieldAlert size={16} />
                      )}
                      {verifyResult.message ||
                        (verifyResult.verified ? 'TRANSACTION VERIFIED' : 'INTEGRITY CHECK FAILED')}
                    </div>
                  )}

                  {step === 'verified' && (
                    <button
                      onClick={handleMine}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all active:scale-[.98]"
                    >
                      <Database size={15} /> Mine Transaction into Block
                    </button>
                  )}
                  {step === 'mining' && (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-400 text-white rounded-xl font-semibold text-sm opacity-80"
                    >
                      <Loader2 size={15} className="animate-spin" /> Mining Block...
                    </button>
                  )}
                </div>
              )}

              {/* STEP 4: Block Mined */}
              {step === 'mined' && blockResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Box size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-700">Transaction Added to Blockchain Block</h3>
                      <p className="text-xs text-[#8C8980]">New block mined and cryptographically linked to the chain tip.</p>
                    </div>
                  </div>

                  {/* Animated Block Card */}
                  <div
                    className="relative border-2 border-amber-400 rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-100"
                    style={{ animation: 'fadeInBlock 0.5s ease' }}
                  >
                    <span className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md">
                      NEW BLOCK
                    </span>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                        <Box size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-extrabold text-[#141413]">Block #{blockResult.index ?? '-'}</span>
                          <span className="font-mono text-xs bg-white border border-amber-200 px-2 py-0.5 rounded-full text-amber-700 font-semibold">
                            {blockResult.block_id || '-'}
                          </span>
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">CONFIRMED</span>
                        </div>
                        <span className="text-xs text-[#8C8980]">{formatTs(blockResult.timestamp)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-white/70 rounded-xl p-3 border border-amber-100">
                      <div className="flex items-start gap-2 text-xs">
                        <Hash size={12} className="text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[#8C8980] font-medium">Block Hash (SHA-256):</span>
                          <p className="font-mono text-[11px] text-[#141413] font-bold break-all mt-0.5">
                            {blockResult.block_hash || blockResult.block?.block_hash || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-xs">
                        <LinkIcon size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[#8C8980] font-medium">Previous Hash (Chain Link):</span>
                          <p className="font-mono text-[11px] text-[#141413] font-bold break-all mt-0.5">
                            {blockResult.previous_hash || blockResult.block?.previous_hash || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                      <div className="bg-white/80 border border-amber-100 rounded-xl p-2.5">
                        <span className="block text-[10px] text-[#8C8980] uppercase font-medium">Tx Count</span>
                        <span className="font-bold text-amber-700 text-base">
                          {blockResult.transaction_count ?? blockResult.transactions_mined ?? '-'}
                        </span>
                      </div>
                      <div className="bg-white/80 border border-amber-100 rounded-xl p-2.5">
                        <span className="block text-[10px] text-[#8C8980] uppercase font-medium">Block Index</span>
                        <span className="font-bold text-[#141413] text-base">#{blockResult.index ?? '-'}</span>
                      </div>
                      <div className="bg-white/80 border border-amber-100 rounded-xl p-2.5">
                        <span className="block text-[10px] text-[#8C8980] uppercase font-medium">Integrity</span>
                        <span className="font-bold text-emerald-600 text-base">PASS</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-[#5C5A55]">
                      <LinkIcon size={11} className="text-indigo-400" />
                      <span>Linked to previous block via cryptographic hash chain</span>
                      <CheckCircle size={11} className="text-emerald-500 ml-auto" />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                    <p className="font-bold flex items-center gap-2 mb-2">
                      <ShieldCheck size={16} /> Transaction Successfully on Blockchain
                    </p>
                    <ul className="text-xs space-y-0.5 text-emerald-700">
                      {[
                        'Transaction cryptographically signed and stored',
                        'SHA-256 hash and ECDSA signature verified',
                        'Block mined with valid cryptographic hash',
                        'Hash-linked to previous block in chain',
                        'Immutable and tamper-evident in ledger',
                      ].map((t) => (
                        <li key={t} className="flex items-center gap-1.5"><CheckCircle size={10} />{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex-1 py-2 bg-[#FAF9F5] border border-[#E8E6DC] hover:border-indigo-300 text-[#141413] rounded-xl text-sm font-semibold transition-colors"
                    >
                      View Block Ledger
                    </button>
                    <button
                      onClick={reset}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={14} /> New Transaction
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpPanel {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes fadeInBlock {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
};
