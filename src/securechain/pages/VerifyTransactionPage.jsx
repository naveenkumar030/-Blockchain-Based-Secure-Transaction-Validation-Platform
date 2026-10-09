import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Search,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Layers,
  KeyRound,
  Hash,
  Box,
  FileCheck,
  ExternalLink,
  ShieldAlert,
  Database,
  Lock
} from 'lucide-react';
import { securechainApi } from '../services/securechainApi';

export default function VerifyTransactionPage() {
  const navigate = useNavigate();

  // ── Auth Protection ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const [txIdInput, setTxIdInput] = useState('TX-9021-SC');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [verificationOutcome, setVerificationOutcome] = useState('SUCCESS'); // 'SUCCESS' | 'FAILURE'
  const [copiedHash, setCopiedHash] = useState(false);
  const [verifyReport, setVerifyReport] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [userTxs, setUserTxs] = useState([]);

  // Fetch user's recent transactions on mount to populate quick test buttons
  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await securechainApi.getMyTransactions(1, 5);
        if (res.transactions && res.transactions.length > 0) {
          setUserTxs(res.transactions);
          const firstId = res.transactions[0].transaction_id || res.transactions[0].id;
          if (firstId) setTxIdInput(firstId);
        }
      } catch (err) {
        console.warn('Could not load user transactions for verify page:', err);
      }
    }
    loadRecent();
  }, []);

  // Handle Verification Execution
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const cleanId = txIdInput.trim();
    if (!cleanId) return;

    setIsVerifying(true);
    setHasVerified(false);
    setVerifyError(null);
    setVerifyReport(null);

    try {
      const report = await securechainApi.verifyTransaction(cleanId);
      setVerifyReport(report);
      setHasVerified(true);
      setVerificationOutcome(report.verified ? 'SUCCESS' : 'FAILURE');
    } catch (err) {
      setHasVerified(true);
      setVerificationOutcome('FAILURE');
      setVerifyError(err.message || `Failed to verify transaction ${cleanId}.`);
      setVerifyReport({
        transaction_id: cleanId,
        verified: false,
        is_valid: false,
        status: 'FAILED',
        message: 'INTEGRITY CHECK FAILED',
        checks: {
          transaction_found: false,
          hash_verification: false,
          digital_signature_verification: false,
          block_verification: false,
          previous_hash_verification: false,
          blockchain_integrity: false,
        },
        details: {
          reason: err.message || 'Transaction not found in ledger or signature verification failed.',
        },
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const isSuccess = verificationOutcome === 'SUCCESS';
  const details = verifyReport?.details || {};
  const checks = verifyReport?.checks || {
    transaction_found: isSuccess,
    hash_verification: isSuccess,
    digital_signature_verification: isSuccess,
    block_verification: isSuccess,
    previous_hash_verification: isSuccess,
    blockchain_integrity: isSuccess,
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#141413] font-sans antialiased selection:bg-[#D97757]/20 selection:text-[#141413]">
      {/* ── Top Header Navigation ── */}
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
              <span className="text-[10px] text-[#8C8980] block">Cryptographic Verification</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#595856] bg-white px-3 py-1 rounded-lg border border-[#E8E6DC] shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
          Consensus: 12 Active Nodes
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Title Section */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D97757] uppercase tracking-wider">
            <span>SecureChain Protocol</span>
            <span>·</span>
            <span>Zero-Trust Verification Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight">
            Transaction Cryptographic Verification
          </h1>
          <p className="text-xs sm:text-sm text-[#595856] max-w-2xl">
            Input a Transaction ID to independently audit its SHA-256 payload hash, ECDSA secp256k1 digital signature, parent block pointer, and Merkle tree root.
          </p>
        </div>

        {/* ── Transaction Verification Input Form ── */}
        <section className="bg-white border border-[#E8E6DC] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label
                htmlFor="input-verify-txid"
                className="block text-xs font-bold uppercase tracking-wider text-[#141413] mb-2 flex items-center gap-2"
              >
                <Search size={14} className="text-[#D97757]" />
                <span>Transaction ID Input</span>
              </label>

              <div className="relative">
                <input
                  id="input-verify-txid"
                  type="text"
                  required
                  placeholder="e.g. TX-9021-SC"
                  value={txIdInput}
                  onChange={(e) => setTxIdInput(e.target.value)}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-4 py-3.5 text-xs sm:text-sm font-mono text-[#141413] placeholder-[#8C8980] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors uppercase tracking-wider"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-[#8C8980]">
                Directly audits on-chain SHA-256 state and ECDSA digital signatures.
              </span>

              <button
                id="btn-verify-transaction"
                type="submit"
                disabled={isVerifying || !txIdInput.trim()}
                className="px-6 py-3 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 shrink-0"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Auditing Ledger...</span>
                  </>
                ) : (
                  <>
                    <Shield size={15} />
                    <span>Verify Transaction</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Select Buttons */}
          <div className="pt-3 border-t border-[#E8E6DC] flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[#8C8980] uppercase">Your Transactions:</span>
            {userTxs.length > 0 ? (
              userTxs.map((t) => {
                const idStr = t.transaction_id || t.id;
                return (
                  <button
                    key={idStr}
                    type="button"
                    onClick={() => {
                      setTxIdInput(idStr);
                    }}
                    className="px-2.5 py-1 rounded-md bg-[#FAF9F5] hover:bg-white text-[#595856] hover:text-[#141413] font-mono text-[11px] border border-[#E8E6DC] transition-colors shadow-2xs"
                  >
                    {idStr}
                  </button>
                );
              })
            ) : (
              <span className="text-[11px] text-[#8C8980] font-mono">TX-9021-SC</span>
            )}

            <button
              type="button"
              onClick={() => {
                setTxIdInput('TX-TAMPERED-FAIL');
              }}
              className="px-2.5 py-1 rounded-md bg-[#FFF5F5] hover:bg-[#FED7D7]/40 text-[#9B2C2C] font-mono text-[11px] border border-[#FED7D7] transition-colors"
            >
              TX-TAMPERED-FAIL (Test Tamper)
            </button>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* VERIFICATION RESULTS PANEL                                    */}
        {/* ───────────────────────────────────────────────────────────── */}
        {hasVerified && (
          <section className="space-y-6 animate-slide-in-up">
            {/* ── Status Banner (SUCCESS vs FAILURE) ── */}
            {isSuccess ? (
              <div
                id="banner-verification-success"
                className="bg-white border border-[#C8E6C9] rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] shrink-0">
                    <CheckCircle2 size={36} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#2E7D32] tracking-tight font-mono">
                      TRANSACTION VERIFIED
                    </h2>
                    <p className="text-xs text-[#595856] mt-1">
                      All cryptographic and blockchain consensus criteria confirmed. Record is authentic, unaltered, and committed on-chain.
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#E8E6DC]">
                  <span className="text-[10px] uppercase font-bold text-[#8C8980]">Block Confirmed</span>
                  <span className="font-mono text-sm font-bold text-[#141413] bg-[#FAF9F5] px-3 py-1 rounded-lg border border-[#E8E6DC]">
                    Block #{details.block_number ?? 1420}
                  </span>
                </div>
              </div>
            ) : (
              <div
                id="banner-verification-failure"
                className="bg-[#FFF5F5] border border-[#FED7D7] rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-[#FED7D7] text-[#C53030] border border-[#FEB2B2] shrink-0">
                    <XCircle size={36} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#9B2C2C] tracking-tight font-mono">
                      INTEGRITY CHECK FAILED
                    </h2>
                    <p className="text-xs text-[#595856] mt-1">
                      {verifyError || details.reason || 'Cryptographic mismatch detected! Block hash link, payload digest, or digital signature has been altered.'}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[#FED7D7]">
                  <span className="text-[10px] uppercase font-bold text-[#9B2C2C]">Security Warning</span>
                  <span className="font-mono text-xs font-bold text-[#C53030] bg-white px-3 py-1 rounded-lg border border-[#FEB2B2]">
                    TAMPER FLAG
                  </span>
                </div>
              </div>
            )}

            {/* ── 6 Required Verification Criteria Cards ── */}
            <div className="bg-white border border-[#E8E6DC] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DC]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-2">
                  <FileCheck size={16} className="text-[#D97757]" />
                  <span>Consensus Verification Proofs (6 Stages)</span>
                </h3>
                <span className="text-[11px] font-mono text-[#8C8980]">Target ID: {txIdInput}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                {/* 1. Transaction Found */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Database size={15} className={checks.transaction_found ? 'text-[#2E7D32]' : 'text-[#8C8980]'} />
                      <span className="font-bold text-[#141413]">1. Transaction Found</span>
                    </div>
                    <p className="text-[11px] text-[#595856]">
                      Located in block #{details.block_number ?? 1420} ledger storage.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide shrink-0 ${
                      checks.transaction_found
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                        : 'bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7]'
                    }`}
                  >
                    {checks.transaction_found ? 'FOUND' : 'NOT FOUND'}
                  </span>
                </div>

                {/* 2. Hash Verification */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Hash size={15} className={checks.hash_verification ? 'text-[#2E7D32]' : 'text-[#C53030]'} />
                      <span className="font-bold text-[#141413]">2. Hash Verification</span>
                    </div>
                    <p className="text-[11px] text-[#595856]">
                      SHA-256 payload digest matches on-chain transaction hash.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide shrink-0 ${
                      checks.hash_verification
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                        : 'bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7]'
                    }`}
                  >
                    {checks.hash_verification ? 'MATCHED' : 'HASH MISMATCH'}
                  </span>
                </div>

                {/* 3. Digital Signature Verification */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <KeyRound size={15} className={checks.digital_signature_verification ? 'text-[#2E7D32]' : 'text-[#C53030]'} />
                      <span className="font-bold text-[#141413]">3. Digital Signature Verification</span>
                    </div>
                    <p className="text-[11px] text-[#595856]">
                      secp256k1 ECDSA signature validated against sender public key.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide shrink-0 ${
                      checks.digital_signature_verification
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                        : 'bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7]'
                    }`}
                  >
                    {checks.digital_signature_verification ? 'SIGNATURE VALID' : 'INVALID SIGNATURE'}
                  </span>
                </div>

                {/* 4. Block Verification */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Box size={15} className={checks.block_verification ? 'text-[#2E7D32]' : 'text-[#C53030]'} />
                      <span className="font-bold text-[#141413]">4. Block Verification</span>
                    </div>
                    <p className="text-[11px] text-[#595856]">
                      Merkle tree root proof inclusion mathematically confirmed.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide shrink-0 ${
                      checks.block_verification
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                        : 'bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7]'
                    }`}
                  >
                    {checks.block_verification ? 'BLOCK VERIFIED' : 'BLOCK INVALID'}
                  </span>
                </div>

                {/* 5. Previous Hash Verification */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Layers size={15} className={checks.previous_hash_verification ? 'text-[#2E7D32]' : 'text-[#C53030]'} />
                      <span className="font-bold text-[#141413]">5. Previous Hash Verification</span>
                    </div>
                    <p className="text-[11px] text-[#595856]">
                      Parent block linkage points sequentially across the ledger chain.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide shrink-0 ${
                      checks.previous_hash_verification
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                        : 'bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7]'
                    }`}
                  >
                    {checks.previous_hash_verification ? 'LINK INTACT' : 'BROKEN LINK'}
                  </span>
                </div>

                {/* 6. Blockchain Integrity */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck size={15} className={checks.blockchain_integrity ? 'text-[#2E7D32]' : 'text-[#C53030]'} />
                      <span className="font-bold text-[#141413]">6. Blockchain Integrity</span>
                    </div>
                    <p className="text-[11px] text-[#595856]">
                      Chain-wide cryptographic consensus verified from Genesis block.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide shrink-0 ${
                      checks.blockchain_integrity
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                        : 'bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7]'
                    }`}
                  >
                    {checks.blockchain_integrity ? 'INTACT' : 'CHAIN COMPROMISED'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Cryptographic Inspection Details Card ── */}
            {details.payload_hash && (
              <div className="bg-white border border-[#E8E6DC] rounded-2xl p-6 shadow-sm space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#141413]">
                  Audited Cryptographic Parameters
                </h3>

                <div className="space-y-2.5 bg-[#FAF9F5] p-4 rounded-xl border border-[#E8E6DC]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E8E6DC]">
                    <span className="text-[#8C8980]">Transaction Hash:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#D97757] break-all select-all font-semibold">
                        {details.payload_hash}
                      </span>
                      <button
                        onClick={() => handleCopy(details.payload_hash)}
                        className="text-[#8C8980] hover:text-[#141413] p-1"
                        title="Copy Hash"
                      >
                        {copiedHash ? <Check size={12} className="text-[#2E7D32]" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {details.recomputed_hash && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E8E6DC]">
                      <span className="text-[#8C8980]">Recomputed Digest:</span>
                      <span className="font-mono text-[#141413] break-all select-all">
                        {details.recomputed_hash}
                      </span>
                    </div>
                  )}

                  {details.sender_address && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E8E6DC]">
                      <span className="text-[#8C8980]">Sender Address:</span>
                      <span className="font-mono text-[#141413] break-all">
                        {details.sender_address}
                      </span>
                    </div>
                  )}

                  {details.receiver_id && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E8E6DC]">
                      <span className="text-[#8C8980]">Receiver Address:</span>
                      <span className="font-mono text-[#141413] break-all">
                        {details.receiver_id}
                      </span>
                    </div>
                  )}

                  {details.amount != null && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-[#8C8980]">Transfer Amount:</span>
                      <span className="font-mono font-bold text-[#D97757]">
                        {parseFloat(details.amount).toFixed(4)} SC
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-2 flex justify-end gap-3">
                  <Link
                    to="/blockchain/dashboard"
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#F5F3ED] text-[#141413] border border-[#E8E6DC] text-xs font-bold transition-all shadow-2xs"
                  >
                    Return to Dashboard
                  </Link>
                  <Link
                    to="/blockchain/transactions/create"
                    className="px-5 py-2.5 rounded-xl bg-[#D97757] hover:bg-[#C66545] text-white text-xs font-bold transition-all shadow-sm"
                  >
                    Create New Transaction
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
