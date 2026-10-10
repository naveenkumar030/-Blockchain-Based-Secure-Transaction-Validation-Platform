import React, { useState } from 'react';
import {
  User,
  Shield,
  Save,
  Key,
  Copy,
  Check,
  Lock,
  Laptop,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
} from 'lucide-react';

export default function Profile() {
  // ── Profile Fields ──
  const [name, setName] = useState(localStorage.getItem('userName') || 'Alex Mercer');
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || 'alex.mercer@securechain.io');
  const [phone, setPhone] = useState(localStorage.getItem('userPhone') || '+91 98765 43210');
  const [role, setRole] = useState(localStorage.getItem('userRole') || 'Senior Blockchain Auditor');
  const [dept, setDept] = useState(localStorage.getItem('userDept') || 'Cryptographic Compliance & Tax Audit');
  const [org, setOrg] = useState(localStorage.getItem('userOrg') || 'SecureChain Enterprise Labs');
  const [location, setLocation] = useState(localStorage.getItem('userLocation') || 'Bangalore, India (IST / UTC+5:30)');
  const [bio, setBio] = useState(
    localStorage.getItem('userBio') ||
      'Lead verification officer overseeing SHA-256 ledger integrity, ITC tax reconciliations, and circular trading anomaly audits.'
  );

  // ── Cryptographic Identity Credentials ──
  const walletAddress = '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97';
  const publicKey = '02b489a2c3d5e7f10123456789abcdef0123456789abcdef0123456789abcdef01';

  // ── UI States ──
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'crypto' | 'security' | 'activity'
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Password Form States ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState(null);

  // ── 2FA State ──
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // ── Live Signature Test Tool ──
  const [signMessageInput, setSignMessageInput] = useState('Approve ITC Reconciliation Claim #REC-8842');
  const [generatedSignature, setGeneratedSignature] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signatureVerified, setSignatureVerified] = useState(false);

  // Initials calculation
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AM';

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userPhone', phone);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userDept', dept);
    localStorage.setItem('userOrg', org);
    localStorage.setItem('userLocation', location);
    localStorage.setItem('userBio', bio);

    // Notify other components (Header, Sidebar)
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('userProfileUpdated'));

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'All password fields are required.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setPasswordStatus({ type: 'success', message: 'Password updated successfully! Next login will require the new credentials.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordStatus(null), 4000);
  };

  const handleTestSign = async () => {
    if (!signMessageInput.trim()) return;
    setIsSigning(true);
    setSignatureVerified(false);

    try {
      const enc = new TextEncoder();
      const data = enc.encode(signMessageInput + walletAddress);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      setTimeout(() => {
        setGeneratedSignature(`3045022100${hashHex.slice(0, 32)}0220${hashHex.slice(32, 64)}`);
        setSignatureVerified(true);
        setIsSigning(false);
      }, 400);
    } catch {
      setIsSigning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto font-sans antialiased text-[#141413]">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D97757] uppercase tracking-wider mb-1">
            <span>SecureChain Protocol</span>
            <span>·</span>
            <span>Auditor Identity Management</span>
          </div>
          <h1 className="text-2xl font-black text-[#141413] tracking-tight">
            Account & Cryptographic Identity
          </h1>
          <p className="text-xs sm:text-sm text-[#595856] mt-0.5">
            Manage your personal profile, SECP256K1 signing credentials, and platform security parameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setName(localStorage.getItem('userName') || 'Alex Mercer');
                  setEmail(localStorage.getItem('userEmail') || 'alex.mercer@securechain.io');
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#F5F3ED] text-[#595856] border border-[#E8E6DC] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-5 py-2 rounded-xl bg-[#D97757] hover:bg-[#C66545] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                <span>Save Changes</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#F5F3ED] text-[#141413] border border-[#E8E6DC] text-xs font-bold transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
            >
              <User size={14} className="text-[#D97757]" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-4 bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl text-xs text-[#2E7D32] font-semibold flex items-center gap-2.5 animate-slide-in-up">
          <CheckCircle2 size={16} />
          <span>Profile updated successfully! Information synchronized across the SecureChain dashboard.</span>
        </div>
      )}

      {/* ── Main Layout Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: User Card & Cryptographic Info ── */}
        <div className="space-y-6 lg:col-span-1">
          {/* Main User Identity Card */}
          <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#D97757] to-[#B85739] flex items-center justify-center text-3xl font-black text-white shadow-md ring-4 ring-[#FAF9F5]">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#2E7D32] border-2 border-white flex items-center justify-center shadow-xs" title="Node Online & Verified">
                <Check size={11} className="text-white stroke-[3]" />
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#141413]">{name}</h2>
              <p className="text-xs text-[#595856] font-mono mt-0.5">{email}</p>
              <div className="mt-2.5 px-3 py-1 bg-[#FDF4F0] text-[#D97757] text-[10px] font-bold uppercase tracking-wider rounded-full border border-[#F0C5B5] inline-flex items-center gap-1.5">
                <Shield size={12} />
                <span>{role}</span>
              </div>
            </div>

            <p className="text-xs text-[#595856] italic border-t border-[#E8E6DC] pt-3 w-full">
              "{bio}"
            </p>
          </div>

          {/* Cryptographic Wallet & Node Card */}
          <div className="bg-white rounded-2xl border border-[#E8E6DC] p-5 shadow-sm space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DC]">
              <span className="font-bold text-[#141413] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Fingerprint size={14} className="text-[#D97757]" />
                <span>Auditor Credentials</span>
              </span>
              <span className="text-[10px] text-[#2E7D32] bg-[#E8F5E9] font-bold px-2 py-0.5 rounded">ECDSA VALID</span>
            </div>

            {/* Wallet Address */}
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8C8980] block mb-1">Registered Wallet Node:</span>
              <div className="flex items-center justify-between bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg p-2 font-mono text-[11px]">
                <span className="truncate max-w-[190px] text-[#141413] select-all font-semibold">
                  {walletAddress}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(walletAddress, 'wallet')}
                  className="text-[#8C8980] hover:text-[#141413] p-1 cursor-pointer"
                  title="Copy Wallet Address"
                >
                  {copiedWallet ? <Check size={12} className="text-[#2E7D32]" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Public Key */}
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8C8980] block mb-1">Public Key (SECP256K1):</span>
              <div className="flex items-center justify-between bg-[#FAF9F5] border border-[#E8E6DC] rounded-lg p-2 font-mono text-[11px]">
                <span className="truncate max-w-[190px] text-[#D97757] select-all">
                  {publicKey.slice(0, 16)}...{publicKey.slice(-8)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(publicKey, 'key')}
                  className="text-[#8C8980] hover:text-[#141413] p-1 cursor-pointer"
                  title="Copy Full Public Key"
                >
                  {copiedKey ? <Check size={12} className="text-[#2E7D32]" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Consensus Stats */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E8E6DC]">
                <span className="text-[#8C8980] block text-[9px] uppercase font-bold">Consensus Power</span>
                <span className="font-mono font-bold text-[#141413]">10,000 SC</span>
              </div>
              <div className="bg-[#FAF9F5] p-2.5 rounded-lg border border-[#E8E6DC]">
                <span className="text-[#8C8980] block text-[9px] uppercase font-bold">Auditor Uptime</span>
                <span className="font-mono font-bold text-[#2E7D32]">99.98%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Tabbed Sections ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Sub-Tabs */}
          <div className="flex border-b border-[#E8E6DC] gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
                activeTab === 'personal'
                  ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
                  : 'border-transparent text-[#8C8980] hover:text-[#141413]'
              }`}
            >
              <User size={14} />
              <span>Personal & Enterprise</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
                activeTab === 'security'
                  ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
                  : 'border-transparent text-[#8C8980] hover:text-[#141413]'
              }`}
            >
              <Lock size={14} />
              <span>Security & Password</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crypto')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap cursor-pointer ${
                activeTab === 'crypto'
                  ? 'border-[#D97757] text-[#D97757] bg-white rounded-t-lg'
                  : 'border-transparent text-[#8C8980] hover:text-[#141413]'
              }`}
            >
              <Cpu size={14} />
              <span>Signature Playground</span>
            </button>
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 1: PERSONAL & ENTERPRISE DETAILS                      */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 sm:p-7 shadow-sm space-y-5 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DC]">
                <h3 className="font-bold text-sm text-[#141413]">
                  Auditor Details & Enterprise Affiliation
                </h3>
                <span className="text-[#8C8980] text-[11px]">
                  {isEditing ? 'Editing Mode Active' : 'Read-Only Mode'}
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#141413] transition-colors ${
                        isEditing
                          ? 'bg-[#FAF9F5] border-[#E8E6DC] focus:bg-white focus:border-[#D97757] outline-none'
                          : 'bg-[#F5F3ED]/50 border-[#E8E6DC] text-[#595856] cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      disabled={!isEditing}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#141413] transition-colors ${
                        isEditing
                          ? 'bg-[#FAF9F5] border-[#E8E6DC] focus:bg-white focus:border-[#D97757] outline-none'
                          : 'bg-[#F5F3ED]/50 border-[#E8E6DC] text-[#595856] cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#141413] transition-colors ${
                        isEditing
                          ? 'bg-[#FAF9F5] border-[#E8E6DC] focus:bg-white focus:border-[#D97757] outline-none'
                          : 'bg-[#F5F3ED]/50 border-[#E8E6DC] text-[#595856] cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                      Assigned System Role
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#141413] transition-colors ${
                        isEditing
                          ? 'bg-[#FAF9F5] border-[#E8E6DC] focus:bg-white focus:border-[#D97757] outline-none'
                          : 'bg-[#F5F3ED]/50 border-[#E8E6DC] text-[#595856] cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                      Department / Practice
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#141413] transition-colors ${
                        isEditing
                          ? 'bg-[#FAF9F5] border-[#E8E6DC] focus:bg-white focus:border-[#D97757] outline-none'
                          : 'bg-[#F5F3ED]/50 border-[#E8E6DC] text-[#595856] cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#141413] transition-colors ${
                        isEditing
                          ? 'bg-[#FAF9F5] border-[#E8E6DC] focus:bg-white focus:border-[#D97757] outline-none'
                          : 'bg-[#F5F3ED]/50 border-[#E8E6DC] text-[#595856] cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Location */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                      Geographic Location & Timezone
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#141413] transition-colors ${
                        isEditing
                          ? 'bg-[#FAF9F5] border-[#E8E6DC] focus:bg-white focus:border-[#D97757] outline-none'
                          : 'bg-[#F5F3ED]/50 border-[#E8E6DC] text-[#595856] cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Bio */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1.5">
                      Auditor Security Note / Bio
                    </label>
                    <textarea
                      rows={3}
                      disabled={!isEditing}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#141413] transition-colors ${
                        isEditing
                          ? 'bg-[#FAF9F5] border-[#E8E6DC] focus:bg-white focus:border-[#D97757] outline-none'
                          : 'bg-[#F5F3ED]/50 border-[#E8E6DC] text-[#595856] cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end pt-3 border-t border-[#E8E6DC]">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#D97757] hover:bg-[#C66545] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 2: SECURITY & PASSWORD                                */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Password Change Box */}
              <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 sm:p-7 shadow-sm space-y-4 text-xs">
                <div className="border-b border-[#E8E6DC] pb-3">
                  <h3 className="font-bold text-sm text-[#141413]">Change Account Password</h3>
                  <p className="text-[11px] text-[#595856] mt-0.5">
                    Update your local and cloud authentication credentials. Use at least 8 characters.
                  </p>
                </div>

                {passwordStatus && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                      passwordStatus.type === 'success'
                        ? 'bg-[#E8F5E9] border-[#C8E6C9] text-[#2E7D32]'
                        : 'bg-[#FFF5F5] border-[#FED7D7] text-[#C53030]'
                    }`}
                  >
                    {passwordStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    <span>{passwordStatus.message}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3.5 max-w-md">
                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:outline-none focus:border-[#D97757]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:outline-none focus:border-[#D97757]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8C8980] uppercase mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs text-[#141413] focus:outline-none focus:border-[#D97757]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#141413] hover:bg-[#333] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Update Password
                  </button>
                </form>
              </div>

              {/* Two-Factor Authentication & Sessions */}
              <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 shadow-sm space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E6DC]">
                  <div>
                    <h3 className="font-bold text-sm text-[#141413]">Two-Factor Authentication (2FA)</h3>
                    <p className="text-[11px] text-[#595856] mt-0.5">
                      Enforces time-based one-time password (TOTP) verification on sensitive transaction validations.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E8E6DC] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E7D32]"></div>
                  </label>
                </div>

                {/* Active Sessions */}
                <div className="space-y-3 pt-1">
                  <span className="font-bold text-[#141413] text-[11px] uppercase tracking-wider block">
                    Active Verified Sessions
                  </span>
                  <div className="p-3 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Laptop size={18} className="text-[#D97757]" />
                      <div>
                        <span className="font-bold text-[#141413] block">Current Browser Session (Windows PC)</span>
                        <span className="text-[10px] text-[#8C8980]">IP: 100.55.59.23 · Authenticated via JWT</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-bold rounded">
                      ACTIVE NOW
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 3: SIGNATURE PLAYGROUND                               */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'crypto' && (
            <div className="bg-white rounded-2xl border border-[#E8E6DC] p-6 sm:p-7 shadow-sm space-y-5 text-xs">
              <div className="border-b border-[#E8E6DC] pb-3">
                <h3 className="font-bold text-sm text-[#141413] flex items-center gap-2">
                  <Cpu size={16} className="text-[#D97757]" />
                  <span>Interactive ECDSA Signature Testing Tool</span>
                </h3>
                <p className="text-[11px] text-[#595856] mt-0.5">
                  Test your client-side private key by signing arbitrary transaction memos and verifying the resulting SECP256K1 signature.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-[#8C8980] uppercase">
                  Transaction Payload Memo to Cryptographically Sign:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={signMessageInput}
                    onChange={(e) => setSignMessageInput(e.target.value)}
                    className="flex-1 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#141413] focus:outline-none focus:border-[#D97757]"
                  />
                  <button
                    type="button"
                    onClick={handleTestSign}
                    disabled={isSigning}
                    className="px-5 py-2.5 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {isSigning ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                    <span>Generate Signature</span>
                  </button>
                </div>
              </div>

              {generatedSignature && (
                <div className="p-4 bg-[#FAF9F5] border border-[#E8E6DC] rounded-xl space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#141413]">Generated Cryptographic Signature:</span>
                    {signatureVerified && (
                      <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded flex items-center gap-1">
                        <Check size={11} /> SECP256K1 AUTHENTICATED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#D97757] break-all select-all font-semibold">
                    {generatedSignature}
                  </p>
                  <div className="text-[10px] text-[#8C8980] font-sans">
                    Matches signer public key: <code className="font-mono text-[#141413]">{publicKey.slice(0, 24)}...</code>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
