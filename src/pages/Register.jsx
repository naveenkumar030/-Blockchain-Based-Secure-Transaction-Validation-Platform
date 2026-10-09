import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Lock, Eye, EyeOff, RotateCcw, ArrowRight,
  Network, CheckCircle2,
  ShieldCheck, BarChart3, Users, Link2,
} from 'lucide-react';
import AuthBackground from '../components/AuthBackground';
import { authApi } from '../services/api';

/* ── Password Strength ─────────────────────────────────── */
function getPasswordStrength(p) {
  if (!p) return { score: 0, label: '', color: '' };
  let score = 0;
  if (p.length >= 8)  score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score, label: 'Weak',      color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair',      color: 'bg-amber-500' };
  if (score <= 3) return { score, label: 'Good',      color: 'bg-blue-500' };
  return           { score, label: 'Strong',    color: 'bg-green-500' };
}

/* ── Step Progress ─────────────────────────────────────── */
const STEPS = ['Account Info', 'Verification'];

const FEATURES = [
  { icon: ShieldCheck,  emoji: '🔐', label: 'Cryptographic Security',  desc: 'Protect transactions using SHA-256 hashing and digital signatures.' },
  { icon: CheckCircle2, emoji: '✅', label: 'Transaction Validation',  desc: 'Verify transaction authenticity, integrity, and validity before recording it.' },
  { icon: Link2,        emoji: '⛓️', label: 'Immutable Blockchain',     desc: 'Store validated transactions in linked blocks with tamper-evident records.' },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done    = i < currentStep;
        const active  = i === currentStep;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all duration-300 ${
                done    ? 'bg-blue-600 border-blue-600 text-white'  :
                active  ? 'bg-white border-blue-600 text-blue-600' :
                          'bg-white border-gray-200 text-gray-400'
              }`}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium mt-1 whitespace-nowrap ${
                active ? 'text-[#D97757]' : done ? 'text-[#595856]' : 'text-[#8C8980]'
              }`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-12px] transition-all duration-500 ${done ? 'bg-[#D97757]' : 'bg-[#E8E6DC]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Field wrapper ─────────────────────────────────────── */
function Field({ label, id, focused, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-[#141413]">{label}</label>
      <div className={`relative flex items-center rounded-lg border transition-all duration-200 bg-white ${
        focused
          ? 'border-[#D97757] ring-2 ring-[#D97757]/15 shadow-sm'
          : 'border-[#E8E6DC] hover:border-[#D5D2C7]'
      }`}>
        {children}
      </div>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);   // 0 = account, 1 = otp

  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', terms: false,
  });
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [showPw, setShowPw]     = useState(false);
  const [showCpw, setShowCpw]   = useState(false);
  const [otpSent, setOtpSent]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const pwStrength = getPasswordStrength(formData.password);

  /* ── Validation ── */
  const validateStep0 = () => {
    if (!formData.fullName.trim()) return 'Please enter your full name.';
    if (!formData.email)           return 'Please enter your email address.';
    if (!formData.password)        return 'Please enter a password.';
    if (formData.password.length < 8) return 'Password must be at least 8 characters.';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    if (!formData.terms)           return 'You must agree to the Terms & Conditions.';
    return null;
  };

  /* ── Step 0 → Send OTP ── */
  const handleSendOTP = async () => {
    const err = validateStep0();
    if (err) { setError(err); return; }
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email,
          password: formData.password,
        }),
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : { detail: await res.text() };
      if (!res.ok) {
        let detailMsg = 'Failed to send OTP';
        if (typeof data.detail === 'string') {
          detailMsg = data.detail;
        } else if (Array.isArray(data.detail) && data.detail.length > 0) {
          detailMsg = data.detail.map(d => d.msg || d.detail || JSON.stringify(d)).join(', ');
        } else if (data.message) {
          detailMsg = data.message;
        }
        throw new Error(detailMsg);
      }
      setOtpSent(true);
      setOtp(['', '', '', '', '', '']); // Clear/Reset OTP boxes
      setSuccessMsg('OTP sent! Check your email for the 6-digit code.');
      setStep(1);
      setTimeout(() => otpRefs[0].current?.focus(), 120);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetOTP = () => {
    setOtp(['', '', '', '', '', '']);
    handleSendOTP();
  };

  /* ── Step 1 → Verify OTP & Launch ── */
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit code.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: code }),
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : { detail: await res.text() };
      if (!res.ok) throw new Error(data.detail || data.message || 'OTP Verification failed');

      setSuccessMsg('Email verified successfully! Launching your workspace...');
      try {
        const loginData = await authApi.login(formData.email, formData.password);
        localStorage.setItem('token', loginData.token);
        localStorage.setItem('userName', loginData.name || formData.fullName.trim());
        localStorage.setItem('userEmail', loginData.email || formData.email);
        localStorage.removeItem('gst_upload_activity');
        setTimeout(() => navigate('/blockchain/dashboard'), 800);
      } catch {
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  /* ── OTP helpers ── */
  const handleOtpChange = (idx, val) => {
    if (val.length > 1) val = val[val.length - 1];
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < 5) otpRefs[idx + 1].current?.focus();
  };
  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus();
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const chars = e.clipboardData.getData('text').slice(0, 6).split('');
    const next = [...otp];
    chars.forEach((c, i) => { if (i < 6) next[i] = c; });
    setOtp(next);
    otpRefs[Math.min(chars.length, 5)].current?.focus();
  };

  const F = (key) => ({ onFocus: () => setFocusedField(key), onBlur: () => setFocusedField(null) });

  return (
    <div className="relative min-h-screen flex z-0 overflow-hidden">
      <AuthBackground />

      {/* ── Left branding panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#141413] px-12 py-14 relative overflow-hidden"
      >
        <div className="absolute top-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full bg-[#D97757]/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[260px] h-[260px] rounded-full bg-[#C66545]/15 blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl shadow-lg object-contain bg-white/5 p-0.5" />
          <div>
            <h1 className="text-[17px] font-bold text-white leading-tight">SecureChain</h1>
            <p className="text-[11px] text-[#8C8980] font-medium">Blockchain Transaction Intelligence</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-[36px] font-bold text-white leading-[1.15] tracking-tight">
              Secure Blockchain<br />Transaction Validation Platform
            </h2>
            <p className="text-[15px] text-[#FAF9F5]/70 mt-4 leading-relaxed max-w-sm">
              Securely create, verify, and track digital transactions using cryptographic hashing, digital signatures, and blockchain technology.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-[#D97757]/20 flex items-center justify-center shrink-0">
                  <f.icon size={15} className="text-[#D97757]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{f.emoji} {f.label}</p>
                  <p className="text-[11px] text-[#8C8980]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 py-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="w-full max-w-[460px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm object-contain" />
            <span className="text-[15px] font-bold text-[#141413]">SecureChain</span>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(20,20,19,0.06)] border border-[#E8E6DC] px-5 sm:px-8 py-7 sm:py-10 relative overflow-hidden">
            {/* Accent line */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: step === 0 ? '50%' : '100%' }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-[#D97757] to-[#C66545]"
            />

            <div className="mb-6">
              <h2 className="text-[24px] font-bold text-[#141413] tracking-tight">Create your account</h2>
              <p className="text-[13px] text-[#595856] mt-1">Join your secure transaction workspace in minutes.</p>
            </div>

            <StepIndicator currentStep={step} />

            {/* Error / Success */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <div className="p-3 bg-red-50 text-red-700 text-[12px] font-medium rounded-lg border border-red-200 flex items-start gap-2">
                    <span>⚠</span> {error}
                  </div>
                </motion.div>
              )}
              {successMsg && !error && (
                <motion.div key="ok" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <div className="p-3 bg-green-50 text-green-700 text-[12px] font-medium rounded-lg border border-green-200 flex items-start gap-2">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> {successMsg}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══ STEP 0: Account Info ═══ */}
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-4">

                  <Field label="Full Name" id="reg-name" focused={focusedField === 'fullName'}>
                    <User size={15} className={`absolute left-3.5 ${focusedField === 'fullName' ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={1.8} />
                    <input id="reg-name" type="text" required autoComplete="name" placeholder="Your full name"
                      value={formData.fullName} {...F('fullName')}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full py-3 pl-10 pr-4 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                    />
                  </Field>

                  <Field label="Work Email" id="reg-email" focused={focusedField === 'email'}>
                    <Mail size={15} className={`absolute left-3.5 ${focusedField === 'email' ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={1.8} />
                    <input id="reg-email" type="email" required autoComplete="email" placeholder="name@company.com"
                      value={formData.email} {...F('email')}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full py-3 pl-10 pr-4 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                    />
                  </Field>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="reg-pw" className="block text-[13px] font-semibold text-gray-700">Password</label>
                    <div className={`relative flex items-center rounded-lg border transition-all duration-200 bg-white ${focusedField === 'password' ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Lock size={15} className={`absolute left-3.5 ${focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={1.8} />
                      <input id="reg-pw" type={showPw ? 'text' : 'password'} required autoComplete="new-password" placeholder="Min 8 characters"
                        value={formData.password} {...F('password')}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full py-3 pl-10 pr-11 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600" aria-label="Toggle password">
                        {showPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                      </button>
                    </div>
                    {/* Strength meter */}
                    {formData.password && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 flex gap-1">
                          {[1,2,3,4,5].map((n) => (
                            <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= pwStrength.score ? pwStrength.color : 'bg-gray-100'}`} />
                          ))}
                        </div>
                        <span className={`text-[11px] font-semibold ${
                          pwStrength.score <= 1 ? 'text-red-500' :
                          pwStrength.score <= 2 ? 'text-amber-500' :
                          pwStrength.score <= 3 ? 'text-blue-500' : 'text-green-600'
                        }`}>{pwStrength.label}</span>
                      </div>
                    )}
                  </div>

                  <Field label="Confirm Password" id="reg-cpw" focused={focusedField === 'confirmPassword'}>
                    <RotateCcw size={15} className={`absolute left-3.5 ${focusedField === 'confirmPassword' ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={1.8} />
                    <input id="reg-cpw" type={showCpw ? 'text' : 'password'} required autoComplete="new-password" placeholder="••••••••"
                      value={formData.confirmPassword} {...F('confirmPassword')}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full py-3 pl-10 pr-11 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                    />
                    <button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600" aria-label="Toggle confirm password">
                      {showCpw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                    </button>
                    {formData.confirmPassword && (
                      <span className="absolute right-10">
                        {formData.password === formData.confirmPassword
                          ? <CheckCircle2 size={14} className="text-green-500" />
                          : <span className="text-red-400 text-[16px]">×</span>}
                      </span>
                    )}
                  </Field>

                  {/* Terms */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded border-[#E8E6DC] text-[#D97757] focus:ring-[#D97757] cursor-pointer shrink-0"
                    />
                    <span className="text-[12px] text-[#595856] leading-relaxed">
                      I agree to the{' '}
                      <Link to="/terms" className="font-semibold text-[#D97757] hover:underline">Terms & Conditions</Link>
                      {' '}and{' '}
                      <Link to="/terms" className="font-semibold text-[#D97757] hover:underline">Privacy Policy</Link>.
                    </span>
                  </label>

                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    type="button" disabled={loading} onClick={handleSendOTP}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-60 text-white text-[14px] font-semibold rounded-xl shadow-[0_4px_14px_rgba(217,119,87,0.3)] transition-all mt-2"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (
                      <>Continue <ArrowRight size={15} strokeWidth={2.5} /></>
                    )}
                  </motion.button>
                </motion.div>
              )}

              {/* ═══ STEP 1: OTP Verification ═══ */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                  <div className="text-center py-2">
                    <div className="w-14 h-14 bg-[#FDF4F0] border border-[#F0C5B5] rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Mail size={24} className="text-[#D97757]" />
                    </div>
                    <p className="text-[14px] font-semibold text-[#141413]">Check your email</p>
                    <p className="text-[12px] text-[#595856] mt-1">
                      We sent a 6-digit code to <strong className="text-[#141413]">{formData.email}</strong>
                    </p>
                  </div>

                  <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={otpRefs[idx]}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKey(idx, e)}
                        className={`w-12 h-12 border-2 rounded-xl text-center text-[18px] font-bold text-[#141413] outline-none transition-all bg-white focus:scale-105 focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 ${
                          digit ? 'border-[#D97757] shadow-sm' : 'border-[#E8E6DC]'
                        }`}
                        placeholder="·"
                      />
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    type="button" disabled={loading} onClick={handleVerifyOTP}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#D97757] hover:bg-[#C66545] disabled:opacity-60 text-white text-[14px] font-semibold rounded-xl shadow-[0_4px_14px_rgba(217,119,87,0.3)] transition-all"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (
                      <>Verify & Launch Workspace <ArrowRight size={15} strokeWidth={2.5} /></>
                    )}
                  </motion.button>

                  <div className="text-center">
                    <button type="button" onClick={handleResetOTP}
                      className="text-[12px] font-semibold text-[#D97757] hover:text-[#C66545] hover:underline"
                    >
                      Didn't receive it? Reset & Resend OTP
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-center text-[13px] text-[#595856] mt-6">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#D97757] hover:text-[#C66545] hover:underline">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
