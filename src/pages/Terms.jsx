import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Network, ArrowLeft, Shield, FileText, Lock, Eye,
  Database, AlertTriangle, Users, Mail, ChevronRight, CheckCircle2,
} from 'lucide-react';

const LAST_UPDATED = 'July 1, 2026';
const VERSION      = '2.4';

const SECTIONS = [
  {
    id: 'acceptance',
    icon: FileText,
    title: 'Acceptance of Terms',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    content: `By accessing or using SecureChain ("Platform", "Service", "we", "us", or "our"), you confirm that you have read, understood, and agree to these Terms & Conditions and our Privacy Policy.
If you do not agree to these terms, you must not use the Platform.

By registering or using SecureChain, you represent that:
• You are at least 18 years of age.
• The information you provide is accurate and complete.
• You have authorization to create and submit the transactions you process through the Platform.
• You will use the Platform only for lawful purposes.
• You will not attempt to manipulate, forge, or compromise blockchain records or cryptographic mechanisms.`,
  },
  {
    id: 'service',
    icon: Database,
    title: 'Description of Service',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    content: `SecureChain is a blockchain-based transaction validation and monitoring platform designed to demonstrate secure digital transaction processing using blockchain and cryptographic technologies.

Core capabilities include:
• Transaction creation and validation.
• Unique transaction ID and nonce generation.
• SHA-256 transaction hashing.
• Digital signature generation and verification.
• Transaction integrity and authenticity verification.
• Duplicate and conflicting transaction detection.
• Block creation and blockchain linking.
• Previous-block hash verification.
• Transaction and block traceability.
• Blockchain integrity and tamper detection.
• Administrative monitoring and validation analysis.
• Graph-based visualization of transactions and blocks using Neo4j.

The Platform is designed to provide transparent and traceable transaction-validation results.`,
  },
  {
    id: 'data',
    icon: Lock,
    title: 'Data Usage & Privacy',
    color: 'text-green-600',
    bg: 'bg-green-50',
    content: `SecureChain may process information required to create and validate transactions.

User Data:
Account information may include:
• Name
• Email address
• User role
• Authentication information
• Account activity

Transaction Data:
Transaction records may include:
• Transaction ID
• Sender and receiver identifiers
• Transaction amount
• Nonce
• Timestamp
• Transaction hash
• Digital signature
• Validation status
• Block information

Transaction data is processed for the purpose of transaction validation, blockchain recording, monitoring, and auditability.

We do not intentionally request sensitive personal information that is unnecessary for the operation of the Platform. Users should avoid including unnecessary personal or confidential information in transaction fields.`,
  },
  {
    id: 'crypto-security',
    icon: Shield,
    title: 'Cryptographic Security & Blockchain Integrity',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    content: `SecureChain uses cryptographic mechanisms to protect transaction integrity.

SHA-256 Hashing:
Transactions and blocks may be processed using SHA-256 hashing to generate cryptographic fingerprints. Changing transaction information can result in a different hash and may cause the transaction or blockchain integrity check to fail.

Digital Signatures:
Digital signatures may be used to verify that a transaction was authorized by the associated account or key holder. Users are responsible for protecting their private cryptographic keys.

Blockchain Integrity:
Blocks contain cryptographic references to previous blocks. This structure allows the Platform to detect unauthorized modifications to previously recorded blockchain data.`,
  },
  {
    id: 'user-obligations',
    icon: Users,
    title: 'User Obligations & Prohibited Use',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    content: `Users agree to use SecureChain only for legitimate and authorized activities.

You must NOT:
• Submit fraudulent or intentionally misleading transactions.
• Attempt to forge digital signatures.
• Attempt to modify blockchain records without authorization.
• Attempt to reuse or manipulate transaction nonces to bypass validation.
• Attempt double-spending or conflicting transaction attacks.
• Attempt to gain unauthorized access to another user's account.
• Attempt to access another user's private keys or credentials.
• Attempt to bypass transaction-validation mechanisms.
• Attempt to disrupt, damage, or compromise the Platform.
• Upload malicious software or code.
• Use the Platform for illegal activities.

Violations may result in account suspension or termination and may be reported to appropriate authorities where required by law.`,
  },
  {
    id: 'validation',
    icon: CheckCircle2,
    title: 'Blockchain Records & Transaction Validation',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    content: `Transactions submitted to SecureChain may pass through multiple validation stages, including:
• Transaction structure validation.
• Authentication and authorization checks.
• Digital signature verification.
• Hash generation and integrity verification.
• Duplicate transaction detection.
• Nonce and transaction-order validation.
• Conflict or suspicious-transaction detection.
• Block validation.
• Blockchain integrity verification.

A transaction may be classified as:
• Valid — The transaction successfully passes the required validation rules.
• Rejected — The transaction fails one or more validation rules.
• Suspicious — The transaction contains characteristics that require additional review.

Validation results are intended to provide traceable evidence of how a transaction was processed.`,
  },
  {
    id: 'intellectual-property',
    icon: Eye,
    title: 'Intellectual Property',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    content: `All intellectual property associated with SecureChain, including its software architecture, source code, user interface, documentation, blockchain implementation, validation logic, and branding, belongs to the respective project owners or licensors.

Users may not:
• Copy or redistribute the Platform without authorization.
• Reverse engineer the Platform for unauthorized purposes.
• Reproduce proprietary components without permission.
• Use the Platform's branding or materials without authorization.

Users retain ownership of information they legitimately submit to the Platform, subject to the rights necessary to operate the service.`,
  },
  {
    id: 'liability',
    icon: AlertTriangle,
    title: 'Limitation of Liability & Disclaimers',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    content: `SecureChain is provided for transaction-validation, blockchain demonstration, research, and decision-support purposes.

Important Disclaimers:
• Blockchain validation results should not automatically be treated as legal, financial, or regulatory advice.
• The Platform does not guarantee that every transaction will be detected or classified correctly.
• Cryptographic systems depend on correct implementation and secure key management.
• Users are responsible for protecting their account credentials and private keys.
• Blockchain records may be difficult or impossible to modify after confirmation.
• The Platform should not be considered a replacement for regulated financial or payment infrastructure.

Users should independently verify important transactions before relying on them for financial or legal decisions.`,
  },
  {
    id: 'termination',
    icon: FileText,
    title: 'Account Security & Termination',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    content: `Users are responsible for maintaining the security of their:
• Login credentials
• Authentication information
• Private keys
• Digital-signature credentials

Users should immediately report suspected unauthorized access or compromised credentials.

We may suspend or terminate an account if:
• The user violates these Terms.
• Unauthorized activity is detected.
• The Platform's security is threatened.
• The account is used for fraudulent or illegal activity.
• Suspension is required by applicable law.

Upon termination, access to the Platform may be restricted. Blockchain records that have already been confirmed may remain as part of the blockchain ledger.`,
  },
  {
    id: 'governing-law',
    icon: FileText,
    title: 'Governing Law & Dispute Resolution',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    content: `These Terms are governed by the applicable laws of India.

Any dispute relating to the use of SecureChain should first be addressed through good-faith communication between the involved parties.

Where applicable, disputes may be subject to the jurisdiction of the appropriate courts in India.`,
  },
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact Us',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    content: `If you have questions about these Terms, transaction validation, account security, or the Platform, please contact:

Naveen Kumar
📞 6305996739
📧 bayyanaveen15@gmail.com`,
  },
];

export default function Terms() {
  const navigate    = useNavigate();
  const [activeId, setActiveId] = useState(null);

  const scroll = (id) => {
    setActiveId(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 h-14 flex items-center px-6">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-md shadow-sm object-contain" />
              <span className="text-[13px] font-bold text-gray-900">SecureChain</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"     className="text-[13px] font-semibold text-blue-600 hover:underline">Sign In</Link>
            <Link to="/register"  className="btn-primary text-[12px] py-1.5 px-3">Create Account</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
            <Shield size={12} />
            Legal Document
          </div>
          <h1 className="text-[36px] font-bold text-gray-900 tracking-tight leading-tight">
            Terms & Conditions
          </h1>
          <p className="text-[15px] text-gray-500 mt-2">
            Please read these terms carefully before using the SecureChain platform.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <FileText size={13} className="text-gray-400" />
              Version {VERSION}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-[12px] text-gray-500">Last updated: {LAST_UPDATED}</span>
            <span className="text-gray-300">·</span>
            <span className="text-[12px] text-gray-500">Effective immediately</span>
            <button
              onClick={() => window.print()}
              className="ml-auto text-[12px] font-semibold text-blue-600 hover:underline"
            >
              Print / Download PDF →
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sticky sidebar ToC ── */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="hidden lg:block w-64 shrink-0"
          >
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-soft p-5 space-y-1">
              <p className="label-caps text-gray-400 mb-3">Table of Contents</p>
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => scroll(s.id)}
                  className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                    activeId === s.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 font-mono w-4 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate">{s.title}</span>
                  {activeId === s.id && <ChevronRight size={12} className="shrink-0 ml-auto" />}
                </button>
              ))}
            </div>
          </motion.aside>

          {/* ── Main content ── */}
          <div className="flex-1 space-y-6">
            {/* Summary banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-amber-900">Important Summary</p>
                <p className="text-[13px] text-amber-800 mt-1 leading-relaxed">
                  By using SecureChain, you agree to: (1) use the platform only for lawful and authorized transaction-validation purposes, (2) keep your account credentials and cryptographic keys secure, (3) provide accurate transaction information, and (4) understand that validated blockchain records are designed to be tamper-evident and may not be editable through normal application operations.
                </p>
                <p className="text-[13px] text-amber-800 mt-2 font-medium leading-relaxed">
                  SecureChain is a blockchain-based transaction validation platform designed for secure transaction processing, cryptographic verification, blockchain recording, and transaction monitoring.
                </p>
              </div>
            </motion.div>

            {/* Sections */}
            {SECTIONS.map((section, i) => (
              <motion.div
                key={section.id}
                id={`section-${section.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.04 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-soft overflow-hidden scroll-mt-24"
              >
                {/* Section header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100">
                  <div className={`w-10 h-10 ${section.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <section.icon size={18} className={section.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 font-mono">{String(i + 1).padStart(2, '0')}</span>
                      <h2 className="text-[16px] font-bold text-gray-900">{section.title}</h2>
                    </div>
                  </div>
                </div>

                {/* Section body */}
                <div className="px-6 py-5">
                  <div className="text-[13px] text-gray-700 leading-[1.8] whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Acceptance footer */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="bg-[#0F172A] rounded-2xl p-8 text-center"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield size={22} className="text-white" />
              </div>
              <h3 className="text-[20px] font-bold text-white mb-2">
                Ready to get started?
              </h3>
              <p className="text-[13px] text-slate-400 mb-6 max-w-sm mx-auto">
                By creating an account, you confirm that you have read and agree to these Terms & Conditions.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link to="/register" className="btn-primary">
                  Create Account
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-[13px] font-semibold rounded-xl border border-white/20 transition-all"
                >
                  Sign In
                </Link>
              </div>
              <p className="text-[11px] text-slate-600 mt-5">
                Questions? Email us at{' '}
                <a href="mailto:bayyanaveen15@gmail.com" className="text-slate-400 hover:text-white underline">
                  bayyanaveen15@gmail.com
                </a>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
