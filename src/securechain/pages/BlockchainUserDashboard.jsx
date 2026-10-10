import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  History,
  CheckCircle2,
  Bell,
  User,
  Settings,
  LogOut,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Blocks,
  Clock,
  Layers,
  FileCheck,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronDown,
  Menu,
  Sparkles,
  Key,
  Radio,
  Cpu,
  RefreshCw,
  Hash,
  AlertCircle
} from 'lucide-react';
import { securechainApi } from '../services/securechainApi';
import Profile from '../../pages/Profile';
import SettingsPage from '../../pages/Settings';

export default function BlockchainUserDashboard({ initialNav = 'Dashboard' }) {
  const navigate = useNavigate();

  // ── User Identity ──
  const storedName = localStorage.getItem('userName') || 'Alex Mercer';
  const storedEmail = localStorage.getItem('userEmail') || 'alex.mercer@securechain.io';
  const initials = storedName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'SC';

  const [greeting, setGreeting] = useState('Good evening');
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // ── Authentication Protection ──
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // ── Layout & Drawer States ──
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState(initialNav);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Real API Data States ──
  const [statsData, setStatsData] = useState({
    total_transactions: 0,
    valid_transactions: 0,
    pending_transactions: 0,
    rejected_transactions: 0,
    latest_block: 0,
    active_validators: 12,
    integrity_status: 'HEALTHY',
    network: 'SecureChain Mainnet Alpha'
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [activityData, setActivityData] = useState({
    confirmed_transactions: 0,
    total_transactions: 0,
    latest_block: 0,
    latest_block_hash: '',
    latest_transaction: null,
    validator_nodes: 12,
    consensus_status: 'ACTIVE',
    recent_activities: []
  });
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState(null);

  const [tableFilter, setTableFilter] = useState('ALL');
  const [tableSearch, setTableSearch] = useState('');

  // ── Modals & Quick Action States ──
  const [createTxModalOpen, setCreateTxModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create Tx Form States
  const [newTxRecipient, setNewTxRecipient] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxNote, setNewTxNote] = useState('');
  const [newTxType, setNewTxType] = useState('Standard Transfer');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Verify Form States
  const [verifySearchId, setVerifySearchId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  // Global Alerts / Success Banners
  const [globalBanner, setGlobalBanner] = useState(null);

  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Load All Dashboard Data from FastAPI APIs ──
  const loadDashboardData = async () => {
    setIsRefreshing(true);
    setStatsError(null);
    setActivityError(null);
    setTransactionsError(null);

    // 1. Fetch Stats
    try {
      setStatsLoading(true);
      const s = await securechainApi.getStats();
      setStatsData(s);
    } catch (err) {
      console.error('Stats fetch error:', err);
      setStatsError(err.message || 'Failed to load ledger statistics.');
    } finally {
      setStatsLoading(false);
    }

    // 2. Fetch Activity
    try {
      setActivityLoading(true);
      const a = await securechainApi.getActivity();
      setActivityData(a);
    } catch (err) {
      console.error('Activity fetch error:', err);
      setActivityError(err.message || 'Failed to load blockchain activity.');
    } finally {
      setActivityLoading(false);
    }

    // 3. Fetch Transactions
    try {
      setTransactionsLoading(true);
      const t = await securechainApi.getMyTransactions(1, 50, tableFilter);
      setTransactions(t.transactions || []);
      setTransactionsTotal(t.total || 0);
    } catch (err) {
      console.error('Transactions fetch error:', err);
      setTransactionsError(err.message || 'Failed to load transactions.');
    } finally {
      setTransactionsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [tableFilter]);

  // ── Copy Helper ──
  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // ── Handle Modal: Create Transaction ──
  const handleCreateTxSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanReceiver = newTxRecipient.trim();
    const cleanAmount = parseFloat(newTxAmount);

    if (!cleanReceiver) {
      setFormError('Receiver wallet address is required.');
      return;
    }
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await securechainApi.createTransaction({
        receiver_id: cleanReceiver,
        amount: cleanAmount,
        description: newTxNote.trim() || 'Direct Dashboard Transfer',
        transaction_type: newTxType,
      });

      if (res.success) {
        setCreateTxModalOpen(false);
        setNewTxRecipient('');
        setNewTxAmount('');
        setNewTxNote('');
        setGlobalBanner({
          type: 'success',
          title: 'Transaction Confirmed & Mined!',
          message: `Transaction ${res.transaction.transaction_id} was validated and sealed into Block #${res.transaction.block_number ?? res.transaction.block_height ?? res.block?.height ?? statsData.latest_block}.`,
        });
        // Refresh dashboard data
        loadDashboardData();
      } else {
        setFormError(res.message || 'Transaction integrity check failed.');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit transaction to the blockchain.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // ── Handle Modal: Verify Transaction ──
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    const cleanId = verifySearchId.trim().toUpperCase();
    if (!cleanId) return;

    setIsVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const report = await securechainApi.verifyTransaction(cleanId);
      setVerifyResult(report);
    } catch (err) {
      setVerifyError(err.message || `Failed to verify transaction ${cleanId}.`);
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Handle Row Click: View Transaction Details ──
  const handleViewTxDetail = async (tx) => {
    setSelectedTxDetail(tx);
    setDetailLoading(true);
    try {
      const full = await securechainApi.getTransactionById(tx.transaction_id || tx.id);
      if (full && full.transaction) {
        setSelectedTxDetail(full.transaction);
      }
    } catch (err) {
      console.warn('Could not fetch deep transaction details, using row data:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Filtered Transactions for Table ──
  const filteredTransactions = transactions.filter((tx) => {
    const txId = (tx.transaction_id || tx.id || '').toLowerCase();
    const receiver = (tx.receiver_id || tx.recipient_address || tx.receiver || '').toLowerCase();
    const amountStr = String(tx.amount || '');
    const blockStr = String(tx.block_number || tx.block_height || '');
    const q = tableSearch.toLowerCase();

    return (
      txId.includes(q) ||
      receiver.includes(q) ||
      amountStr.includes(q) ||
      blockStr.includes(q)
    );
  });

  // ── Navigation Handler ──
  const handleNavClick = (name) => {
    setActiveNav(name);
    setMobileSidebarOpen(false);
    if (name === 'Create Transaction') {
      navigate('/blockchain/transactions/create');
      return;
    }
    if (name === 'Verify Transaction') {
      navigate('/blockchain/verify');
      return;
    }
    if (name === 'My Transactions') {
      setActiveNav('Dashboard');
      setTimeout(() => {
        const el = document.getElementById('recent-transactions-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }
    if (name === 'Notifications') setNotificationsOpen(true);
    if (name === 'Logout') {
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Create Transaction', icon: Send },
    { name: 'My Transactions', icon: History },
    { name: 'Verify Transaction', icon: CheckCircle2 },
    { name: 'Notifications', icon: Bell },
    { name: 'Profile', icon: User },
    { name: 'Settings', icon: Settings },
    { name: 'Logout', icon: LogOut, danger: true }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#141413] flex font-sans antialiased selection:bg-[#D97757]/20 selection:text-[#141413]">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SIDEBAR                                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#FAF9F5] border-r border-[#E8E6DC] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Branding */}
          <div className="h-16 flex items-center px-6 gap-3 border-b border-[#E8E6DC] bg-[#FAF9F5]">
            <div className="w-9 h-9 rounded-xl bg-[#D97757] flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-[#141413]">SecureChain</span>
                <span className="px-1.5 py-0.2 bg-[#FDF4F0] text-[#D97757] border border-[#F0C5B5] text-[9px] font-bold rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-[#8C8980] font-medium">Validation Platform</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold tracking-wider text-[#8C8980] uppercase">
              Main Menu
            </div>
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeNav === item.name;
              return (
                <button
                  key={item.name}
                  id={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => handleNavClick(item.name)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#FDF4F0] text-[#D97757] border border-[#F0C5B5] shadow-xs'
                      : item.danger
                      ? 'text-[#8C8980] hover:text-[#C53030] hover:bg-[#FFF5F5]'
                      : 'text-[#595856] hover:text-[#141413] hover:bg-[#F5F3ED]'
                  }`}
                >
                  <IconComp size={16} className={isActive ? 'text-[#D97757]' : ''} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Network Status Badge Footer */}
        <div className="p-4 border-t border-[#E8E6DC] bg-white m-3 rounded-xl border border-[#E8E6DC] shadow-sm">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[11px] font-medium text-[#595856] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
              SecureChain Node
            </span>
            <span className="text-[10px] font-mono font-bold text-[#2E7D32] bg-[#E8F5E9] px-1.5 py-0.5 rounded border border-[#C8E6C9]">
              {activityData.consensus_status || 'SYNCED'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-[#8C8980] truncate">
            Validators: {activityData.validator_nodes} · Block #{statsData.latest_block}
          </p>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN CONTENT AREA                                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* HEADER                                                        */}
        {/* ───────────────────────────────────────────────────────────── */}
        <header className="h-16 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E6DC] sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Mobile Hamburger & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              id="btn-mobile-sidebar-toggle"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-[#595856] hover:text-[#141413] hover:bg-[#F5F3ED] transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveNav('Dashboard')}
                className="text-xs font-bold text-[#8C8980] hover:text-[#141413] uppercase tracking-wider hidden sm:inline transition-colors cursor-pointer"
                title="Return to Dashboard"
              >
                SecureChain
              </button>
              <span className="text-[#D5D2C7] hidden sm:inline">/</span>
              <span className="text-xs font-bold text-[#D97757] uppercase tracking-wider">
                {activeNav === 'Dashboard' ? 'User Dashboard' : activeNav}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Switch to GST Workspace */}
            <button
              id="btn-switch-workspace"
              onClick={() => navigate('/dashboard')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#595856] hover:text-[#141413] bg-white hover:bg-[#F5F3ED] border border-[#E8E6DC] transition-colors shadow-2xs"
              title="Open GST & Reconciliation Workspace"
            >
              <ExternalLink size={13} className="text-[#D97757]" />
              <span>GST Workspace</span>
            </button>

            {/* Live Refresh Button */}
            <button
              id="btn-refresh-dashboard"
              onClick={loadDashboardData}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-[#595856] hover:text-[#141413] hover:bg-[#F5F3ED] transition-colors border border-[#E8E6DC] bg-white shadow-2xs"
              title="Refresh Blockchain Ledger State"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-[#D97757]' : ''} />
            </button>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                id="btn-header-notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-[#595856] hover:text-[#141413] hover:bg-[#F5F3ED] transition-colors border border-[#E8E6DC] bg-white shadow-2xs"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {(activityData.recent_activities?.length > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D97757] ring-2 ring-white"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E8E6DC] rounded-xl shadow-xl p-4 z-50 animate-slide-in-up">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DC] mb-3">
                    <h4 className="text-xs font-bold text-[#141413] uppercase tracking-wider">Blockchain Activity Feed</h4>
                    <span className="text-[10px] text-[#D97757] font-semibold bg-[#FDF4F0] px-2 py-0.5 rounded-full border border-[#F0C5B5]">
                      Live Network
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {activityData.recent_activities?.length > 0 ? (
                      activityData.recent_activities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg hover:border-[#D5D2C7] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#141413]">{act.title}</span>
                            <span className="text-[10px] text-[#8C8980]">{act.status}</span>
                          </div>
                          <p className="text-[11px] text-[#595856] leading-relaxed">{act.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#8C8980] text-center py-4">No recent blockchain events recorded.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                id="btn-header-user-profile"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-[#F5F3ED] transition-all border border-[#E8E6DC] bg-white shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-[#D97757] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-[#141413] leading-tight">{storedName}</div>
                  <div className="text-[10px] text-[#8C8980] font-medium">{storedEmail}</div>
                </div>
                <ChevronDown size={14} className="text-[#8C8980] hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E8E6DC] rounded-xl shadow-xl p-2 z-50 animate-slide-in-up">
                  <div className="p-3 border-b border-[#E8E6DC] mb-1">
                    <p className="text-xs font-bold text-[#141413]">{storedName}</p>
                    <p className="text-[11px] text-[#8C8980] truncate">{storedEmail}</p>
                    <span className="inline-block mt-1 text-[9px] font-mono text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9]">
                      Isolated SecureChain Wallet
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/blockchain/transactions/create');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#595856] hover:text-[#141413] hover:bg-[#FAF9F5] transition-colors text-left"
                  >
                    <Send size={14} className="text-[#D97757]" /> Create Transaction
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/blockchain/verify');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#595856] hover:text-[#141413] hover:bg-[#FAF9F5] transition-colors text-left"
                  >
                    <CheckCircle2 size={14} className="text-[#2E7D32]" /> Verify Transaction
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleNavClick('Profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#595856] hover:text-[#141413] hover:bg-[#FAF9F5] transition-colors text-left"
                  >
                    <User size={14} className="text-[#D97757]" /> My Profile & Node Identity
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleNavClick('Settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#595856] hover:text-[#141413] hover:bg-[#FAF9F5] transition-colors text-left"
                  >
                    <Settings size={14} className="text-[#D97757]" /> Platform Settings
                  </button>
                  <div className="border-t border-[#E8E6DC] my-1"></div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/dashboard');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#D97757] hover:text-[#C66545] hover:bg-[#FAF9F5] transition-colors text-left"
                  >
                    <ExternalLink size={14} /> Switch to GST Workspace
                  </button>
                  <div className="border-t border-[#E8E6DC] my-1"></div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleNavClick('Logout');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[#C53030] hover:bg-[#FFF5F5] transition-colors text-left"
                  >
                    <LogOut size={14} /> Disconnect & Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* DASHBOARD BODY                                                */}
        {/* ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* Global Action Banner */}
          {globalBanner && (
            <div className="bg-white border border-[#E8E6DC] p-4 rounded-xl flex items-start justify-between gap-3 animate-fade-in shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-[#2E7D32] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#141413] uppercase">{globalBanner.title}</h4>
                  <p className="text-xs text-[#595856] mt-0.5">{globalBanner.message}</p>
                </div>
              </div>
              <button
                onClick={() => setGlobalBanner(null)}
                className="text-[#8C8980] hover:text-[#141413] p-1"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Dynamic Content: Profile | Settings | Dashboard */}
          {activeNav === 'Profile' ? (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DC]">
                <button
                  onClick={() => setActiveNav('Dashboard')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#595856] hover:text-[#141413] bg-white border border-[#E8E6DC] hover:bg-[#F5F3ED] transition-colors shadow-2xs"
                >
                  ← Back to Dashboard
                </button>
                <span className="text-xs text-[#8C8980]">User Profile & Cryptographic Node Identity</span>
              </div>
              <Profile />
            </div>
          ) : activeNav === 'Settings' ? (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DC]">
                <button
                  onClick={() => setActiveNav('Dashboard')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#595856] hover:text-[#141413] bg-white border border-[#E8E6DC] hover:bg-[#F5F3ED] transition-colors shadow-2xs"
                >
                  ← Back to Dashboard
                </button>
                <span className="text-xs text-[#8C8980]">Enterprise Platform & Ledger Settings</span>
              </div>
              <SettingsPage />
            </div>
          ) : (
            <>
              {/* ─────────────────────────────────────────────────────────── */}
              {/* WELCOME SECTION                                             */}
              {/* ─────────────────────────────────────────────────────────── */}
              <section className="bg-white border border-[#E8E6DC] rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-[#FDF4F0] via-transparent to-transparent pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDF4F0] border border-[#F0C5B5] text-[#D97757] text-xs font-semibold mb-3">
                  <Sparkles size={13} />
                  <span>Immutable Blockchain Ledger Active · Neo4j Graph Connected</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight">
                  {greeting}, {storedName}
                </h1>
                <p className="text-sm text-[#595856] mt-1 max-w-xl">
                  Manage your secure blockchain transactions. Create, verify, and inspect tamper-evident cryptographic transaction records on the chain.
                </p>
              </div>

              {/* Status Chips */}
              <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-4 py-3 text-center sm:text-left min-w-[130px]">
                  <span className="block text-[10px] uppercase font-bold text-[#8C8980]">Ledger Height</span>
                  <span className="text-base font-bold font-mono text-[#2E7D32]">
                    #{statsData.latest_block}
                  </span>
                </div>
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-4 py-3 text-center sm:text-left min-w-[130px]">
                  <span className="block text-[10px] uppercase font-bold text-[#8C8980]">Hash Algorithm</span>
                  <span className="text-base font-bold font-mono text-[#D97757]">SHA-256</span>
                </div>
              </div>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* STATISTICS CARDS                                            */}
          {/* ─────────────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#8C8980] uppercase tracking-wider">
                Network Transaction Statistics
              </h2>
              {statsLoading && (
                <span className="text-[10px] font-mono text-[#D97757] flex items-center gap-1.5">
                  <RefreshCw size={11} className="animate-spin" /> Syncing with ledger...
                </span>
              )}
            </div>

            {statsError ? (
              <div className="p-4 bg-[#FFF5F5] border border-[#FED7D7] rounded-xl flex items-center justify-between text-xs text-[#9B2C2C]">
                <span className="flex items-center gap-2">
                  <AlertTriangle size={16} /> {statsError}
                </span>
                <button
                  onClick={loadDashboardData}
                  className="px-3 py-1 bg-[#D97757] hover:bg-[#C66545] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total */}
                <div className="bg-white border border-[#E8E6DC] rounded-xl p-5 shadow-sm hover:border-[#D5D2C7] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#8C8980] uppercase tracking-wide">
                      Total Transactions
                    </span>
                    <div className="p-2 rounded-lg bg-[#FDF4F0] text-[#D97757] border border-[#F0C5B5]">
                      <Layers size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#141413] tracking-tight">
                    {statsLoading ? '...' : statsData.total_transactions}
                  </div>
                  <div className="text-[11px] text-[#595856] mt-1 font-medium">Recorded in ledger</div>
                </div>

                {/* Valid */}
                <div className="bg-white border border-[#E8E6DC] rounded-xl p-5 shadow-sm hover:border-[#D5D2C7] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#8C8980] uppercase tracking-wide">
                      Valid Transactions
                    </span>
                    <div className="p-2 rounded-lg bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                      <ShieldCheck size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#2E7D32] tracking-tight">
                    {statsLoading ? '...' : statsData.valid_transactions}
                  </div>
                  <div className="text-[11px] text-[#595856] mt-1 font-medium">Consensus validated</div>
                </div>

                {/* Pending */}
                <div className="bg-white border border-[#E8E6DC] rounded-xl p-5 shadow-sm hover:border-[#D5D2C7] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#8C8980] uppercase tracking-wide">
                      Pending Transactions
                    </span>
                    <div className="p-2 rounded-lg bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                      <Clock size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#B45309] tracking-tight">
                    {statsLoading ? '...' : statsData.pending_transactions}
                  </div>
                  <div className="text-[11px] text-[#595856] mt-1 font-medium">In mempool</div>
                </div>

                {/* Rejected */}
                <div className="bg-white border border-[#E8E6DC] rounded-xl p-5 shadow-sm hover:border-[#D5D2C7] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#8C8980] uppercase tracking-wide">
                      Rejected Transactions
                    </span>
                    <div className="p-2 rounded-lg bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7]">
                      <ShieldAlert size={18} />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#C53030] tracking-tight">
                    {statsLoading ? '...' : statsData.rejected_transactions}
                  </div>
                  <div className="text-[11px] text-[#595856] mt-1 font-medium">Failed signature / hash</div>
                </div>
              </div>
            )}
          </section>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* QUICK ACTIONS                                               */}
          {/* ─────────────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-[#8C8980] uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                id="btn-quick-create-transaction"
                onClick={() => setCreateTxModalOpen(true)}
                className="bg-white border border-[#E8E6DC] hover:border-[#D97757] p-5 rounded-xl text-left transition-all group shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FDF4F0] text-[#D97757] border border-[#F0C5B5] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Send size={18} />
                </div>
                <h3 className="text-sm font-bold text-[#141413] group-hover:text-[#D97757] transition-colors">
                  Create Transaction
                </h3>
                <p className="text-xs text-[#595856] mt-1">
                  Digitally sign and broadcast a secure transaction into the consensus mempool.
                </p>
              </button>

              <button
                id="btn-quick-view-transactions"
                onClick={() => {
                  const el = document.getElementById('recent-transactions-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white border border-[#E8E6DC] hover:border-[#141413]/40 p-5 rounded-xl text-left transition-all group shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FAF9F5] text-[#141413] border border-[#E8E6DC] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <History size={18} />
                </div>
                <h3 className="text-sm font-bold text-[#141413] group-hover:text-[#595856] transition-colors">
                  View My Transactions
                </h3>
                <p className="text-xs text-[#595856] mt-1">
                  Inspect your confirmed transaction records, block numbers, and confirmation status.
                </p>
              </button>

              <button
                id="btn-quick-verify-transaction"
                onClick={() => setVerifyModalOpen(true)}
                className="bg-white border border-[#E8E6DC] hover:border-[#2E7D32] p-5 rounded-xl text-left transition-all group shadow-sm hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <CheckCircle2 size={18} />
                </div>
                <h3 className="text-sm font-bold text-[#141413] group-hover:text-[#2E7D32] transition-colors">
                  Verify Transaction
                </h3>
                <p className="text-xs text-[#595856] mt-1">
                  Independently audit SHA-256 payload integrity, ECDSA signatures, and Merkle proofs.
                </p>
              </button>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* LATEST VALIDATION & BLOCKCHAIN ACTIVITY                     */}
          {/* ─────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latest Validation */}
            <section className="bg-white border border-[#E8E6DC] rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DC]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#E8F5E9] text-[#2E7D32]">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#141413] uppercase tracking-wider">
                      Latest Validation Results
                    </h2>
                    <p className="text-[11px] text-[#595856]">
                      Audit criteria for authenticated transactions
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] border border-[#C8E6C9] px-2 py-0.5 rounded-full uppercase">
                  {statsData.integrity_status || 'ALL CRITERIA PASSED'}
                </span>
              </div>

              {/* 6 Validation Criteria Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Transaction Structure */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-1 rounded bg-[#E8F5E9] text-[#2E7D32] mt-0.5">
                    <Check size={14} />
                  </div>
                  <div>
                    <span className="block font-bold text-[#141413]">Transaction Structure</span>
                    <span className="text-[11px] text-[#595856] block mt-0.5">
                      Valid schema, non-empty addresses & compliant parameters
                    </span>
                    <span className="text-[10px] font-mono text-[#2E7D32] mt-1 inline-block">STATUS: VALID</span>
                  </div>
                </div>

                {/* 2. Digital Signature */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-1 rounded bg-[#E8F5E9] text-[#2E7D32] mt-0.5">
                    <Check size={14} />
                  </div>
                  <div>
                    <span className="block font-bold text-[#141413]">Digital Signature</span>
                    <span className="text-[11px] text-[#595856] block mt-0.5">
                      secp256k1 ECDSA cryptographic signature matches sender key
                    </span>
                    <span className="text-[10px] font-mono text-[#2E7D32] mt-1 inline-block">STATUS: VERIFIED</span>
                  </div>
                </div>

                {/* 3. SHA-256 Integrity */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-1 rounded bg-[#E8F5E9] text-[#2E7D32] mt-0.5">
                    <Check size={14} />
                  </div>
                  <div>
                    <span className="block font-bold text-[#141413]">SHA-256 Integrity</span>
                    <span className="text-[11px] text-[#595856] block mt-0.5">
                      Payload fingerprint exactly matches computed 256-bit hash
                    </span>
                    <span className="text-[10px] font-mono text-[#2E7D32] mt-1 inline-block">STATUS: MATCHED</span>
                  </div>
                </div>

                {/* 4. Nonce Validation */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-1 rounded bg-[#E8F5E9] text-[#2E7D32] mt-0.5">
                    <Check size={14} />
                  </div>
                  <div>
                    <span className="block font-bold text-[#141413]">Nonce Validation</span>
                    <span className="text-[11px] text-[#595856] block mt-0.5">
                      Sequence strictly anti-replay protected & serialized
                    </span>
                    <span className="text-[10px] font-mono text-[#2E7D32] mt-1 inline-block">STATUS: VALID</span>
                  </div>
                </div>

                {/* 5. Duplicate Check */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-1 rounded bg-[#E8F5E9] text-[#2E7D32] mt-0.5">
                    <Check size={14} />
                  </div>
                  <div>
                    <span className="block font-bold text-[#141413]">Duplicate Check</span>
                    <span className="text-[11px] text-[#595856] block mt-0.5">
                      Zero double-spend collisions across ledger & mempool
                    </span>
                    <span className="text-[10px] font-mono text-[#2E7D32] mt-1 inline-block">STATUS: CLEARED</span>
                  </div>
                </div>

                {/* 6. Blockchain Validation */}
                <div className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl p-3.5 flex items-start gap-3">
                  <div className="p-1 rounded bg-[#E8F5E9] text-[#2E7D32] mt-0.5">
                    <Check size={14} />
                  </div>
                  <div>
                    <span className="block font-bold text-[#141413]">Blockchain Validation</span>
                    <span className="text-[11px] text-[#595856] block mt-0.5">
                      Merkle root verified and committed into ledger block
                    </span>
                    <span className="text-[10px] font-mono text-[#2E7D32] mt-1 inline-block">STATUS: CONFIRMED</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Blockchain Activity */}
            <section className="bg-white border border-[#E8E6DC] rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DC]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#FDF4F0] text-[#D97757]">
                    <Cpu size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#141413] uppercase tracking-wider">
                      Blockchain Activity
                    </h2>
                    <p className="text-[11px] text-[#595856]">
                      Real-time ledger updates & cryptographic block parameters
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#595856] font-mono">
                  <Radio size={12} className="text-[#2E7D32] animate-pulse" />
                  Live Sync
                </div>
              </div>

              {/* 4 Activity Metrics */}
              <div className="space-y-3 text-xs">
                {/* Confirmed Transactions */}
                <div className="p-3.5 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl flex items-center justify-between">
                  <span className="text-[#595856] font-medium flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#2E7D32]" /> Confirmed Transactions
                  </span>
                  <span className="font-mono font-bold text-[#141413] text-sm">
                    {activityLoading ? '...' : `${activityData.confirmed_transactions} Transactions`}
                  </span>
                </div>

                {/* Latest Block */}
                <div className="p-3.5 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl flex items-center justify-between">
                  <span className="text-[#595856] font-medium flex items-center gap-2">
                    <Blocks size={16} className="text-[#D97757]" /> Latest Block
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#2E7D32] text-sm">
                      Block #{activityData.latest_block}
                    </span>
                    <span className="block text-[10px] text-[#8C8980]">Active Proof-of-Work</span>
                  </div>
                </div>

                {/* Latest Transaction */}
                <div className="p-3.5 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl flex items-center justify-between">
                  <span className="text-[#595856] font-medium flex items-center gap-2">
                    <FileCheck size={16} className="text-[#D97757]" /> Latest Transaction
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-[#141413] text-sm">
                      {activityData.latest_transaction?.transaction_id || (activityLoading ? '...' : 'None')}
                    </span>
                    <span className="block text-[10px] text-[#8C8980]">
                      {activityData.latest_transaction?.amount ? `${activityData.latest_transaction.amount} SC · Validated` : 'No Recent Activity'}
                    </span>
                  </div>
                </div>

                {/* Latest Block Hash */}
                <div className="p-3.5 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#595856] font-medium flex items-center gap-2">
                      <Hash size={16} className="text-[#D97757]" /> Latest Block Hash
                    </span>
                    {activityData.latest_block_hash && (
                      <button
                        onClick={() => handleCopy(activityData.latest_block_hash, 'latest-block-hash')}
                        className="text-[11px] text-[#D97757] hover:text-[#C66545] flex items-center gap-1 font-semibold"
                      >
                        {copiedHash === 'latest-block-hash' ? (
                          <>
                            <Check size={12} className="text-[#2E7D32]" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> Copy Full Hash
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="bg-white px-3 py-2 rounded-lg font-mono text-[11px] text-[#141413] break-all border border-[#E8E6DC] select-all">
                    {activityData.latest_block_hash || (activityLoading ? '...' : 'Awaiting Next Mined Block')}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* RECENT TRANSACTIONS TABLE                                   */}
          {/* ─────────────────────────────────────────────────────────── */}
          <section id="recent-transactions-section" className="bg-white border border-[#E8E6DC] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E8E6DC]">
              <div>
                <h2 className="text-base font-bold text-[#141413] tracking-tight">Recent Transactions</h2>
                <p className="text-xs text-[#8C8980] mt-0.5">
                  Live on-chain records for <span className="text-[#D97757] font-mono">{storedEmail}</span> ({transactionsTotal} total)
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by ID, receiver, amount..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#141413] placeholder-[#8C8980] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors w-52 sm:w-64"
                  />
                  <Search size={14} className="absolute left-2.5 top-2.5 text-[#8C8980]" />
                </div>

                <div className="flex items-center gap-1 bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg p-0.5">
                  {['ALL', 'VALID', 'PENDING', 'REJECTED'].map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setTableFilter(filterKey)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        tableFilter === filterKey
                          ? 'bg-[#D97757] text-white shadow-2xs'
                          : 'text-[#595856] hover:text-[#141413]'
                      }`}
                    >
                      {filterKey}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table or States */}
            {transactionsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#8C8980] space-y-3">
                <RefreshCw size={24} className="animate-spin text-[#D97757]" />
                <p className="text-xs">Querying blockchain transactions from SecureChain ledger...</p>
              </div>
            ) : transactionsError ? (
              <div className="p-6 text-center space-y-3 bg-[#FFF5F5] border border-[#FED7D7] rounded-xl">
                <AlertTriangle size={24} className="mx-auto text-[#C53030]" />
                <p className="text-xs text-[#9B2C2C]">{transactionsError}</p>
                <button
                  onClick={loadDashboardData}
                  className="px-4 py-1.5 bg-[#D97757] hover:bg-[#C66545] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl">
                <div className="w-12 h-12 rounded-full bg-[#FDF4F0] text-[#D97757] flex items-center justify-center mx-auto border border-[#F0C5B5]">
                  <Layers size={22} />
                </div>
                <h4 className="text-sm font-bold text-[#141413]">No Transactions Found</h4>
                <p className="text-xs text-[#595856] max-w-sm mx-auto">
                  {tableSearch || tableFilter !== 'ALL'
                    ? 'No transactions matched your current search filters.'
                    : 'You have not submitted any blockchain transactions yet. Broadcast your first transaction now.'}
                </p>
                <button
                  onClick={() => setCreateTxModalOpen(true)}
                  className="mt-2 px-4 py-2 bg-[#D97757] hover:bg-[#C66545] text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Create Transaction
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E6DC] text-[11px] font-semibold text-[#8C8980] uppercase tracking-wider">
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Receiver</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Block</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6DC] font-medium">
                    {filteredTransactions.map((tx) => {
                      const txId = tx.transaction_id || tx.tx_id || tx.id;
                      const receiver = tx.receiver_id || tx.recipient_address || tx.receiver;
                      const receiverShort = receiver ? (receiver.length > 14 ? `${receiver.slice(0, 6)}...${receiver.slice(-4)}` : receiver) : 'Unknown';
                      const formattedAmount = `${parseFloat(tx.amount || 0).toFixed(4)} SC`;
                      const statusVal = tx.status || 'VALID';
                      const blockVal = tx.block_number != null ? `#${tx.block_number}` : (tx.block_height != null ? `#${tx.block_height}` : 'In Mempool');
                      const dateVal = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A';
                      const hashVal = tx.payload_hash || tx.hash || '';

                      return (
                        <tr
                          key={txId}
                          className="hover:bg-[#FAF9F5] transition-colors group cursor-pointer"
                          onClick={() => handleViewTxDetail(tx)}
                        >
                          {/* Transaction ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-[#141413] flex items-center gap-1.5">
                            <span>{txId}</span>
                            {hashVal && (
                              <button
                                onClick={(e) => {
                                 e.stopPropagation();
                                  handleCopy(hashVal, txId);
                                }}
                                className="text-[#8C8980] hover:text-[#141413] transition-colors p-1"
                                title="Copy Transaction Hash"
                              >
                                {copiedHash === txId ? (
                                  <Check size={12} className="text-[#2E7D32]" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            )}
                          </td>

                          {/* Receiver */}
                          <td className="py-3.5 px-4 font-mono text-[#595856]">
                            <span title={receiver}>{receiverShort}</span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 font-mono font-bold text-[#D97757]">
                            {formattedAmount}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                statusVal.toUpperCase() === 'VALID' || statusVal.toUpperCase() === 'CONFIRMED'
                                  ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                                  : statusVal.toUpperCase() === 'PENDING'
                                  ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                                  : 'bg-[#FFF5F5] text-[#C53030] border border-[#FED7D7]'
                              }`}
                            >
                              {(statusVal.toUpperCase() === 'VALID' || statusVal.toUpperCase() === 'CONFIRMED') && (
                                <CheckCircle2 size={11} />
                              )}
                              {statusVal.toUpperCase() === 'PENDING' && <Clock size={11} />}
                              {statusVal.toUpperCase() === 'REJECTED' && <AlertTriangle size={11} />}
                              {statusVal}
                            </span>
                          </td>

                          {/* Block */}
                          <td className="py-3.5 px-4 font-mono text-[#595856]">{blockVal}</td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-[#8C8980] text-[11px]">{dateVal}</td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTxDetail(tx);
                              }}
                              className="px-2.5 py-1 rounded bg-[#FAF9F5] border border-[#E8E6DC] text-[#595856] hover:text-[#141413] hover:bg-white text-[11px] font-semibold transition-colors shadow-2xs"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE TRANSACTION                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {createTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#E8E6DC] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-in-up">
            <div className="px-6 py-4 border-b border-[#E8E6DC] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#FDF4F0] text-[#D97757]">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141413]">Create Blockchain Transaction</h3>
                  <p className="text-[11px] text-[#8C8980]">Signs & validates payload against consensus engine</p>
                </div>
              </div>
              <button
                onClick={() => setCreateTxModalOpen(false)}
                className="p-1 rounded text-[#8C8980] hover:text-[#141413] hover:bg-[#F5F3ED] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTxSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-[#FFF5F5] border border-[#FED7D7] rounded-lg text-xs text-[#9B2C2C] flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-[#141413] mb-1">
                  Sender (Authenticated Identity)
                </label>
                <input
                  type="text"
                  readOnly
                  value={storedEmail}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs font-mono text-[#595856] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#141413] mb-1">
                  Receiver ID / Wallet Address *
                </label>
                <input
                  required
                  type="text"
                  placeholder="0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97"
                  value={newTxRecipient}
                  onChange={(e) => setNewTxRecipient(e.target.value)}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs font-mono text-[#141413] placeholder-[#8C8980] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-[#141413] mb-1">
                    Amount (SC) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    placeholder="e.g. 150.0000"
                    value={newTxAmount}
                    onChange={(e) => setNewTxAmount(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs font-mono text-[#141413] placeholder-[#8C8980] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-[#141413] mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={newTxType}
                    onChange={(e) => setNewTxType(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs text-[#141413] focus:outline-none focus:border-[#D97757] focus:bg-white"
                  >
                    <option value="Standard Transfer">Standard Transfer</option>
                    <option value="Smart Contract Settlement">Smart Contract Settlement</option>
                    <option value="Escrow Clearance">Escrow Clearance</option>
                    <option value="Vendor Audit Payment">Vendor Audit Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-[#141413] mb-1">
                  Description / Audit Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cryptographic settlement clearance memo"
                  value={newTxNote}
                  onChange={(e) => setNewTxNote(e.target.value)}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs text-[#141413] placeholder-[#8C8980] focus:outline-none focus:border-[#D97757] focus:bg-white transition-colors"
                />
              </div>

              <div className="p-3 bg-[#FDF4F0] border border-[#F0C5B5] rounded-lg text-[11px] text-[#D97757]">
                🔒 Backend generates Transaction ID, Nonce, Timestamp, SHA-256 Hash, ECDSA Signature, and automatically mines into a block synced with Neo4j.
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateTxModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#FAF9F5] border border-[#E8E6DC] text-[#595856] hover:text-[#141413] text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="px-5 py-2 rounded-lg bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-sm flex items-center gap-2"
                >
                  {isBroadcasting && <RefreshCw size={14} className="animate-spin" />}
                  <span>{isBroadcasting ? 'Signing & Mining...' : 'Create Transaction'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: VERIFY TRANSACTION                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#E8E6DC] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-in-up">
            <div className="px-6 py-4 border-b border-[#E8E6DC] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#E8F5E9] text-[#2E7D32]">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141413]">Cryptographic Verification</h3>
                  <p className="text-[11px] text-[#8C8980]">Audit payload hash, ECDSA signature & block linkage</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setVerifyModalOpen(false);
                  setVerifyResult(null);
                  setVerifySearchId('');
                  setVerifyError(null);
                }}
                className="p-1 rounded text-[#8C8980] hover:text-[#141413] hover:bg-[#F5F3ED] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <form onSubmit={handleVerifySubmit} className="flex gap-2">
                <input
                  required
                  type="text"
                  placeholder="Enter Transaction ID (e.g. TX-9021-SC)..."
                  value={verifySearchId}
                  onChange={(e) => setVerifySearchId(e.target.value)}
                  className="flex-1 bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg px-3 py-2 text-xs font-mono text-[#141413] placeholder-[#8C8980] focus:outline-none focus:border-[#D97757] focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-4 py-2 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  {isVerifying && <RefreshCw size={13} className="animate-spin" />}
                  <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
                </button>
              </form>

              {verifyError && (
                <div className="p-3 bg-[#FFF5F5] border border-[#FED7D7] rounded-lg text-xs text-[#9B2C2C] flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{verifyError}</span>
                </div>
              )}

              {verifyResult && (
                <div
                  className={`border rounded-xl p-4 space-y-3 text-xs animate-fade-in ${
                    verifyResult.verified
                      ? 'bg-[#FAF9F5] border-[#C8E6C9]'
                      : 'bg-[#FFF5F5] border-[#FED7D7]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DC]">
                    <span
                      className={`font-bold uppercase flex items-center gap-1.5 ${
                        verifyResult.verified ? 'text-[#2E7D32]' : 'text-[#C53030]'
                      }`}
                    >
                      {verifyResult.verified ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      {verifyResult.message || (verifyResult.verified ? 'TRANSACTION VERIFIED' : 'INTEGRITY CHECK FAILED')}
                    </span>
                    {verifyResult.details?.block_number != null && (
                      <span className="text-[#141413] font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-[#E8E6DC]">
                        Block #{verifyResult.details.block_number}
                      </span>
                    )}
                  </div>

                  {/* 6 Verification Checks */}
                  {verifyResult.checks && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="flex items-center justify-between bg-white border border-[#E8E6DC] p-2 rounded">
                        <span className="text-[#595856]">Found in Ledger</span>
                        <span className={verifyResult.checks.transaction_found ? 'text-[#2E7D32] font-bold' : 'text-[#C53030] font-bold'}>
                          {verifyResult.checks.transaction_found ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-[#E8E6DC] p-2 rounded">
                        <span className="text-[#595856]">SHA-256 Hash</span>
                        <span className={verifyResult.checks.hash_verification ? 'text-[#2E7D32] font-bold' : 'text-[#C53030] font-bold'}>
                          {verifyResult.checks.hash_verification ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-[#E8E6DC] p-2 rounded">
                        <span className="text-[#595856]">Digital Signature</span>
                        <span className={verifyResult.checks.digital_signature_verification ? 'text-[#2E7D32] font-bold' : 'text-[#C53030] font-bold'}>
                          {verifyResult.checks.digital_signature_verification ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-[#E8E6DC] p-2 rounded">
                        <span className="text-[#595856]">Block Inclusion</span>
                        <span className={verifyResult.checks.block_verification ? 'text-[#2E7D32] font-bold' : 'text-[#C53030] font-bold'}>
                          {verifyResult.checks.block_verification ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-[#E8E6DC] p-2 rounded">
                        <span className="text-[#595856]">Previous Hash Link</span>
                        <span className={verifyResult.checks.previous_hash_verification ? 'text-[#2E7D32] font-bold' : 'text-[#C53030] font-bold'}>
                          {verifyResult.checks.previous_hash_verification ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white border border-[#E8E6DC] p-2 rounded">
                        <span className="text-[#595856]">Chain Integrity</span>
                        <span className={verifyResult.checks.blockchain_integrity ? 'text-[#2E7D32] font-bold' : 'text-[#C53030] font-bold'}>
                          {verifyResult.checks.blockchain_integrity ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    </div>
                  )}

                  {verifyResult.details?.payload_hash && (
                    <div className="pt-1">
                      <span className="text-[#8C8980] block text-[10px] uppercase font-bold">SHA-256 Digest:</span>
                      <span className="font-mono text-[11px] text-[#D97757] break-all select-all block bg-white border border-[#E8E6DC] p-2 rounded mt-1">
                        {verifyResult.details.payload_hash}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: TRANSACTION DETAILS                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#E8E6DC] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-in-up">
            <div className="px-6 py-4 border-b border-[#E8E6DC] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-[#D97757]" />
                <h3 className="text-base font-bold text-[#141413] font-mono">
                  {selectedTxDetail.transaction_id || selectedTxDetail.tx_id || selectedTxDetail.id} Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1 rounded text-[#8C8980] hover:text-[#141413] hover:bg-[#F5F3ED] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DC]">
                <div>
                  <span className="text-[#8C8980] block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-[#2E7D32]">{selectedTxDetail.status || 'VALID'}</span>
                </div>
                <div>
                  <span className="text-[#8C8980] block text-[10px] uppercase font-bold">Amount</span>
                  <span className="font-bold text-[#D97757] font-mono">{parseFloat(selectedTxDetail.amount || 0).toFixed(4)} SC</span>
                </div>
                <div>
                  <span className="text-[#8C8980] block text-[10px] uppercase font-bold">Block Confirmation</span>
                  <span className="font-mono text-[#595856]">
                    {selectedTxDetail.block_number != null ? `#${selectedTxDetail.block_number}` : (selectedTxDetail.block_height != null ? `#${selectedTxDetail.block_height}` : 'Pending Block')}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C8980] block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="text-[#595856]">
                    {selectedTxDetail.timestamp ? new Date(selectedTxDetail.timestamp).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[#8C8980] block text-[10px] uppercase font-bold mb-1">Sender Address / Account</span>
                <div className="bg-[#FAF9F5] p-2.5 rounded-lg font-mono text-[11px] text-[#141413] border border-[#E8E6DC] break-all">
                  {selectedTxDetail.sender_address || selectedTxDetail.user_email || '0xSender'}
                </div>
              </div>

              <div>
                <span className="text-[#8C8980] block text-[10px] uppercase font-bold mb-1">Receiver Address</span>
                <div className="bg-[#FAF9F5] p-2.5 rounded-lg font-mono text-[11px] text-[#141413] border border-[#E8E6DC] break-all">
                  {selectedTxDetail.receiver_id || selectedTxDetail.recipient_address || selectedTxDetail.receiver}
                </div>
              </div>

              {(selectedTxDetail.payload_hash || selectedTxDetail.hash) && (
                <div>
                  <span className="text-[#8C8980] block text-[10px] uppercase font-bold mb-1">Cryptographic Hash (SHA-256)</span>
                  <div className="bg-[#FAF9F5] p-2.5 rounded-lg font-mono text-[11px] text-[#D97757] border border-[#E8E6DC] break-all select-all">
                    {selectedTxDetail.payload_hash || selectedTxDetail.hash}
                  </div>
                </div>
              )}

              {selectedTxDetail.signature && (
                <div>
                  <span className="text-[#8C8980] block text-[10px] uppercase font-bold mb-1">Digital Signature (ECDSA)</span>
                  <div className="bg-[#FAF9F5] p-2.5 rounded-lg font-mono text-[10px] text-[#595856] border border-[#E8E6DC] break-all select-all max-h-16 overflow-y-auto">
                    {selectedTxDetail.signature}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-[#FAF9F5] border-t border-[#E8E6DC] flex justify-between items-center">
              <button
                onClick={() => {
                  const txId = selectedTxDetail.transaction_id || selectedTxDetail.tx_id || selectedTxDetail.id;
                  setSelectedTxDetail(null);
                  setVerifySearchId(txId);
                  setVerifyModalOpen(true);
                }}
                className="text-xs text-[#D97757] hover:text-[#C66545] font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Audit Verification Proof
              </button>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="px-4 py-1.5 bg-white border border-[#E8E6DC] hover:bg-[#F5F3ED] text-[#141413] rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
