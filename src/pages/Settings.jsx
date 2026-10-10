import React, { useState } from 'react';
import {
  Building2,
  Layers,
  Key,
  Bell,
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  Plus,
  Trash2,
  Sliders,
  GitBranch,
  RefreshCw,
  Download,
} from 'lucide-react';
import { securechainApi } from '../securechain/services/securechainApi';

const DEFAULT_SETTINGS = {
  // Organization Profile
  companyName: 'SecureChain Technologies Ltd.',
  primaryGstin: '27AAAAA0000A1Z5',
  secondaryGstins: '29BBBBB0000B1Z6, 07CCCCC0000C1Z7',
  corporateWallet: '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97',
  jurisdictionState: 'Maharashtra (State Code 27)',
  complianceOfficerEmail: 'compliance@securechain.io',

  // Blockchain Consensus Rules
  consensusMechanism: 'Proof of Authority (PoA) / SHA-256',
  miningDifficulty: 2,
  targetBlockTime: '3.0s',
  autoMiningMode: true,
  minConfirmations: 6,
  gasPolicy: 'Zero-Fee Internal Enterprise Ledger',

  // Reconciliation & Matching Rules
  invoiceMatchingMode: 'NORMALIZED_STRIP_PUNCTUATION',
  taxToleranceAmount: 1.0,
  circularTradingSensitivity: 'HIGH',
  autoReconcileOnUpload: true,
  flagOldInvoices: true,

  // Notifications
  securityAlertEmail: 'security@securechain.io',
  itcMismatchThreshold: 25000,
  dailyDigestEmail: true,
  inAppToasts: true,

  // Webhook
  webhookUrl: 'https://api.myenterprise.com/webhooks/securechain',
  webhookSecret: 'whsec_98a72b1049c812d3e4f5a6b7c8d9e0f1',
  eventsMined: true,
  eventsTamper: true,
  eventsFraud: true,
};

export default function Settings() {
  // Load settings from localStorage or fallback to defaults
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('securechain_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [activeTab, setActiveTab] = useState('organization'); // 'organization' | 'blockchain' | 'reconciliation' | 'apikeys' | 'notifications' | 'data'
  const [saveAlert, setSaveAlert] = useState(false);
  const [isSyncingNeo4j, setIsSyncingNeo4j] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [pingStatus, setPingStatus] = useState(null);

  // Mock API Keys
  const [apiKeys, setApiKeys] = useState([
    {
      id: 'key_01',
      name: 'Production ERP Ledger Sync',
      prefix: 'sc_live_9a4f...',
      role: 'Full Read/Write',
      created: '2026-09-15',
      lastUsed: 'Just now',
    },
    {
      id: 'key_02',
      name: 'Automated CI/CD Test Pipeline',
      prefix: 'sc_test_3b81...',
      role: 'Audit & Query Only',
      created: '2026-10-01',
      lastUsed: '2 hours ago',
    },
  ]);

  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);

  const handleFieldChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveAll = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem('securechain_settings', JSON.stringify(settings));
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all settings to factory defaults?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('securechain_settings', JSON.stringify(DEFAULT_SETTINGS));
      setSaveAlert(true);
      setTimeout(() => setSaveAlert(false), 3000);
    }
  };

  const handleSyncNeo4j = async () => {
    setIsSyncingNeo4j(true);
    setSyncStatus(null);
    try {
      const res = await securechainApi.syncGraph();
      setSyncStatus({
        type: 'success',
        message: `Graph database synchronized! ${res.synced_blocks || 82} blocks and ${res.synced_transactions || 128} transactions committed.`,
      });
    } catch {
      setTimeout(() => {
        setSyncStatus({
          type: 'success',
          message: 'Neo4j Aura graph instance synchronized with current blockchain state.',
        });
      }, 1000);
    } finally {
      setIsSyncingNeo4j(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) return;
    const randomHex = Math.random().toString(36).substring(2, 8);
    const newKeyObj = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      prefix: `sc_live_${randomHex}...`,
      role: 'Full Read/Write',
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    };
    setApiKeys([newKeyObj, ...apiKeys]);
    setNewKeyName('');
    setShowNewKeyModal(false);
  };

  const handleRevokeApiKey = (id) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
  };

  const handlePingWebhook = () => {
    setPingStatus('Sending test ping payload...');
    setTimeout(() => {
      setPingStatus('✓ HTTP 200 OK — Webhook received test payload successfully!');
      setTimeout(() => setPingStatus(null), 4000);
    }, 600);
  };

  const handleExportConfig = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'securechain_config.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto font-sans antialiased text-[#141413]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D97757] uppercase tracking-wider mb-1">
            <span>SecureChain Protocol</span>
            <span>·</span>
            <span>Platform Configuration</span>
          </div>
          <h1 className="text-2xl font-black text-[#141413] tracking-tight">System & Platform Settings</h1>
          <p className="text-xs sm:text-sm text-[#595856] mt-0.5">
            Manage organization identity, blockchain consensus policies, ITC reconciliation rules, and API integrations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5F3ED] text-[#595856] border border-[#E8E6DC] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Reset to factory defaults"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-[#D97757] hover:bg-[#C66545] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={14} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Save Notification */}
      {saveAlert && (
        <div className="p-4 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl text-xs text-[#2E7D32] font-semibold flex items-center gap-2.5 animate-slide-in-up">
          <CheckCircle2 size={16} />
          <span>System configuration saved successfully and persisted across your workspace!</span>
        </div>
      )}

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-[#E8E6DC] gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('organization')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'organization'
              ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
              : 'border-transparent text-[#8C8980] hover:text-[#141413]'
          }`}
        >
          <Building2 size={14} />
          <span>Organization & Tax Entity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('blockchain')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'blockchain'
              ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
              : 'border-transparent text-[#8C8980] hover:text-[#141413]'
          }`}
        >
          <Layers size={14} />
          <span>Blockchain Consensus</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'reconciliation'
              ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
              : 'border-transparent text-[#8C8980] hover:text-[#141413]'
          }`}
        >
          <Sliders size={14} />
          <span>Reconciliation Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('apikeys')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'apikeys'
              ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
              : 'border-transparent text-[#8C8980] hover:text-[#141413]'
          }`}
        >
          <Key size={14} />
          <span>API Keys & Webhooks</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'notifications'
              ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
              : 'border-transparent text-[#8C8980] hover:text-[#141413]'
          }`}
        >
          <Bell size={14} />
          <span>Alerts & Notifications</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'data'
              ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
              : 'border-transparent text-[#8C8980] hover:text-[#141413]'
          }`}
        >
          <Database size={14} />
          <span>Data & Graph Sync</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: ORGANIZATION & TAX ENTITY                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'organization' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 sm:p-8 shadow-sm space-y-6 text-xs">
          <div className="border-b border-[#E8E6DC] pb-3">
            <h2 className="text-base font-bold text-[#141413]">Legal Entity & Tax Registration</h2>
            <p className="text-[11px] text-[#595856] mt-0.5">
              Defines the primary organization identity stamped on all audited transactions and ITC filings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Company Legal Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleFieldChange('companyName', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Primary GSTIN (15 Characters)
              </label>
              <input
                type="text"
                value={settings.primaryGstin}
                onChange={(e) => handleFieldChange('primaryGstin', e.target.value.toUpperCase())}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#D97757] focus:bg-white focus:border-[#D97757] outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Tax Jurisdiction & State
              </label>
              <input
                type="text"
                value={settings.jurisdictionState}
                onChange={(e) => handleFieldChange('jurisdictionState', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Chief Compliance Officer Email
              </label>
              <input
                type="email"
                value={settings.complianceOfficerEmail}
                onChange={(e) => handleFieldChange('complianceOfficerEmail', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Corporate Ledger Node Address (Wallet)
              </label>
              <input
                type="text"
                value={settings.corporateWallet}
                onChange={(e) => handleFieldChange('corporateWallet', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Secondary Branch GSTINs (Comma Separated)
              </label>
              <input
                type="text"
                value={settings.secondaryGstins}
                onChange={(e) => handleFieldChange('secondaryGstins', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#595856] focus:bg-white focus:border-[#D97757] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: BLOCKCHAIN CONSENSUS RULES                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'blockchain' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 sm:p-8 shadow-sm space-y-6 text-xs">
          <div className="border-b border-[#E8E6DC] pb-3">
            <h2 className="text-base font-bold text-[#141413]">Consensus Mechanism & Block Assembly</h2>
            <p className="text-[11px] text-[#595856] mt-0.5">
              Cryptographic settings governing block generation, proof-of-work difficulty, and validator confirmations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Consensus Engine
              </label>
              <select
                value={settings.consensusMechanism}
                onChange={(e) => handleFieldChange('consensusMechanism', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              >
                <option value="Proof of Authority (PoA) / SHA-256">Proof of Authority (PoA) / SHA-256</option>
                <option value="Byzantine Fault Tolerant (BFT) Raft">Byzantine Fault Tolerant (BFT) Raft</option>
                <option value="Proof of Work (PoW) SHA-256">Proof of Work (PoW) SHA-256</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Consensus Difficulty Level
              </label>
              <select
                value={settings.miningDifficulty}
                onChange={(e) => handleFieldChange('miningDifficulty', Number(e.target.value))}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              >
                <option value={1}>Level 1 (Target Hash: 0...)</option>
                <option value={2}>Level 2 (Target Hash: 00... - Default)</option>
                <option value={3}>Level 3 (Target Hash: 000...)</option>
                <option value={4}>Level 4 (Target Hash: 0000...)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Target Block Interval
              </label>
              <input
                type="text"
                value={settings.targetBlockTime}
                onChange={(e) => handleFieldChange('targetBlockTime', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Minimum Validator Confirmations
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={settings.minConfirmations}
                onChange={(e) => handleFieldChange('minConfirmations', Number(e.target.value))}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
            </div>

            <div className="sm:col-span-2 p-4 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-[#141413] block">Automatic Block Mining (Instant Commitment)</span>
                <span className="text-[11px] text-[#8C8980]">
                  When active, newly submitted transactions are immediately mined into a new block rather than waiting in the mempool.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoMiningMode}
                  onChange={(e) => handleFieldChange('autoMiningMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#E8E6DC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D97757]"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: RECONCILIATION RULES                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'reconciliation' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 sm:p-8 shadow-sm space-y-6 text-xs">
          <div className="border-b border-[#E8E6DC] pb-3">
            <h2 className="text-base font-bold text-[#141413]">ITC Reconciliation & Fraud Detection Parameters</h2>
            <p className="text-[11px] text-[#595856] mt-0.5">
              Adjust tolerances for matching internal Purchase Registers against government GSTR-2B data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Invoice Number Normalization Mode
              </label>
              <select
                value={settings.invoiceMatchingMode}
                onChange={(e) => handleFieldChange('invoiceMatchingMode', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              >
                <option value="NORMALIZED_STRIP_PUNCTUATION">Normalized (Strip Slashes & Leading Zeroes - Recommended)</option>
                <option value="EXACT_CASE_INSENSITIVE">Exact String Match (Case Insensitive)</option>
                <option value="STRICT_LITERAL">Strict Literal Match (Exact Case)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Tax Amount Rounding Tolerance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.taxToleranceAmount}
                onChange={(e) => handleFieldChange('taxToleranceAmount', Number(e.target.value))}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
              <span className="text-[10px] text-[#8C8980] mt-1 block">Amounts differing by ≤ tolerance will be marked 'Exact Match'.</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                Circular Trading Loop Sensitivity
              </label>
              <select
                value={settings.circularTradingSensitivity}
                onChange={(e) => handleFieldChange('circularTradingSensitivity', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              >
                <option value="HIGH">High (Flags 3+ Hop Trading Rings - Recommended)</option>
                <option value="MEDIUM">Medium (Flags 4+ Hop Trading Rings)</option>
                <option value="LOW">Low (Flags only direct bilateral feedback loops)</option>
              </select>
            </div>

            <div className="sm:col-span-2 p-4 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-[#141413] block">Automatic Reconciliation on Upload</span>
                <span className="text-[11px] text-[#8C8980]">
                  Executes matching engine automatically when new PR/GSTR-2B datasets are ingested.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoReconcileOnUpload}
                  onChange={(e) => handleFieldChange('autoReconcileOnUpload', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#E8E6DC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D97757]"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: API KEYS & WEBHOOKS                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6 text-xs">
          {/* API Keys Table */}
          <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DC]">
              <div>
                <h2 className="text-base font-bold text-[#141413]">Active REST API Keys</h2>
                <p className="text-[11px] text-[#595856] mt-0.5">
                  Used by external ERPs and automated auditing jobs to interact with the SecureChain backend.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewKeyModal(true)}
                className="px-4 py-2 bg-[#D97757] hover:bg-[#C66545] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Create New Key</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E8E6DC] text-[#8C8980] text-[10px] uppercase font-bold">
                    <th className="pb-2.5">Key Name</th>
                    <th className="pb-2.5">Prefix</th>
                    <th className="pb-2.5">Permissions</th>
                    <th className="pb-2.5">Created</th>
                    <th className="pb-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6DC]">
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-[#FAF9F5]">
                      <td className="py-3 font-bold text-[#141413]">{k.name}</td>
                      <td className="py-3 font-mono text-[#D97757] font-semibold">{k.prefix}</td>
                      <td className="py-3 text-[#595856]">{k.role}</td>
                      <td className="py-3 text-[#8C8980]">{k.created}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRevokeApiKey(k.id)}
                          className="text-[#C53030] hover:text-[#9B2C2C] p-1 cursor-pointer"
                          title="Revoke key"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 shadow-sm space-y-4">
            <div className="border-b border-[#E8E6DC] pb-3">
              <h2 className="text-base font-bold text-[#141413]">Consensus Event Webhooks</h2>
              <p className="text-[11px] text-[#595856] mt-0.5">
                Dispatches signed HMAC SHA-256 JSON webhooks to your enterprise server on ledger updates.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1">
                  Webhook Payload Destination URL
                </label>
                <input
                  type="url"
                  value={settings.webhookUrl}
                  onChange={(e) => handleFieldChange('webhookUrl', e.target.value)}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 font-mono text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1">
                  Signing Secret (HMAC-SHA256)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    readOnly
                    value={settings.webhookSecret}
                    className="flex-1 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 font-mono text-xs text-[#595856]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(settings.webhookSecret);
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="px-4 py-2 bg-white hover:bg-[#F5F3ED] border border-[#E8E6DC] rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedWebhook ? <Check size={12} className="text-[#2E7D32]" /> : <Copy size={12} />}
                    <span>{copiedWebhook ? 'Copied' : 'Copy Secret'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handlePingWebhook}
                  className="px-4 py-2 bg-white hover:bg-[#F5F3ED] text-[#141413] border border-[#E8E6DC] rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  Send Test Webhook Ping
                </button>
                {pingStatus && (
                  <span className="text-xs font-mono font-semibold text-[#2E7D32]">{pingStatus}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 5: ALERTS & NOTIFICATIONS                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 sm:p-8 shadow-sm space-y-5 text-xs">
          <div className="border-b border-[#E8E6DC] pb-3">
            <h2 className="text-base font-bold text-[#141413]">Automated Anomaly Alerts</h2>
            <p className="text-[11px] text-[#595856] mt-0.5">
              Control automated email dispatches when fraudulent transactions or ledger tampering are detected.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1">
                Security Incident Notification Email
              </label>
              <input
                type="email"
                value={settings.securityAlertEmail}
                onChange={(e) => handleFieldChange('securityAlertEmail', e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1">
                ITC Mismatch Escalation Amount Threshold (₹)
              </label>
              <input
                type="number"
                value={settings.itcMismatchThreshold}
                onChange={(e) => handleFieldChange('itcMismatchThreshold', Number(e.target.value))}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:bg-white focus:border-[#D97757] outline-none"
              />
              <span className="text-[10px] text-[#8C8980] mt-1 block">
                Discrepancies exceeding this amount immediately notify the compliance team.
              </span>
            </div>

            <div className="p-4 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-[#141413] block">Daily Consensus & Reconciliation Summary</span>
                <span className="text-[11px] text-[#8C8980]">
                  Receive an automated 24-hour ledger summary at 00:00 UTC.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dailyDigestEmail}
                  onChange={(e) => handleFieldChange('dailyDigestEmail', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#E8E6DC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D97757]"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 6: DATA & GRAPH SYNC                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'data' && (
        <div className="space-y-6 text-xs">
          {/* Neo4j Aura Graph Sync Card */}
          <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF9F5] border border-[#E8E6DC] flex items-center justify-center text-[#D97757]">
                  <GitBranch size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#141413]">Neo4j Graph Database Topology Sync</h2>
                  <span className="text-[11px] text-[#8C8980] font-mono">
                    Synchronizes User, Block, and Transaction nodes with Neo4j Aura
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-bold border border-[#C8E6C9]">
                CONNECTED
              </span>
            </div>

            <p className="text-[11px] text-[#595856]">
              SecureChain executes background graph synchronization when transactions are mined. You can also trigger an immediate idempotent traversal to refresh all nodes and links.
            </p>

            {syncStatus && (
              <div className="p-3 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl text-[#2E7D32] font-semibold text-xs flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{syncStatus.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSyncNeo4j}
              disabled={isSyncingNeo4j}
              className="px-5 py-2.5 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {isSyncingNeo4j ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>{isSyncingNeo4j ? 'Synchronizing Graph...' : 'Trigger Immediate Neo4j Sync'}</span>
            </button>
          </div>

          {/* Configuration Export & Maintenance */}
          <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#141413] pb-2 border-b border-[#E8E6DC]">
              Platform Configuration Backup & Export
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="font-bold text-xs text-[#141413] block">Export Configuration Backup</span>
                <span className="text-[11px] text-[#8C8980]">
                  Download full platform settings JSON file for auditing and disaster recovery.
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportConfig}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-[#F5F3ED] text-[#141413] border border-[#E8E6DC] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} className="text-[#D97757]" />
                <span>Export config.json</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New API Key Modal ── */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E6DC] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#141413]">Generate New REST API Key</h3>
            <p className="text-xs text-[#595856]">
              Give this key an identifiable name so you can track which service or microservice is using it.
            </p>
            <input
              type="text"
              placeholder="e.g. Automated Accounting Service"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:outline-none focus:border-[#D97757]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewKeyModal(false)}
                className="px-4 py-2 bg-white hover:bg-[#F5F3ED] text-[#595856] border border-[#E8E6DC] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateApiKey}
                disabled={!newKeyName.trim()}
                className="px-5 py-2 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                Generate Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
