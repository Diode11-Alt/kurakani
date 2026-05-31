"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldAlert, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/feed');
      } else {
        setChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/feed');
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        if (!username.trim()) throw new Error('Username is required');

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim() } }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-guff-primary)]" />
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[var(--color-guff-background)]">
      {/* Left Panel: Brand & Identity */}
      <section className="w-full md:w-1/2 bg-auth-gradient p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute top-1/2 -right-24 w-64 h-64 rounded-full bg-[var(--color-guff-primary-fixed)] blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex flex-col">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-[var(--color-guff-primary)] font-black text-2xl tracking-tighter">G</span>
            </div>
            <div>
              <h1 className="text-white text-3xl font-extrabold tracking-tight">GUFF</h1>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Connect, Share, Discover</p>
            </div>
          </div>
          
          <div className="space-y-6 max-w-md">
            <div className="flex items-start gap-4 group">
              <div className="mt-1 w-10 h-10 rounded-xl glass flex items-center justify-center text-white transition-transform group-hover:scale-110">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">End-to-End Encrypted</h3>
                <p className="text-white/70 text-sm mt-1">Your private conversations stay private with military-grade encryption.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 group">
              <div className="mt-1 w-10 h-10 rounded-xl glass flex items-center justify-center text-white transition-transform group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Real-time Messaging</h3>
                <p className="text-white/70 text-sm mt-1">Instant delivery with low latency across all your connected devices.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 group">
              <div className="mt-1 w-10 h-10 rounded-xl glass flex items-center justify-center text-white transition-transform group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Stories & Social Feed</h3>
                <p className="text-white/70 text-sm mt-1">Share life's moments with circles of friends in a high-velocity feed.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Avatar Stack & Social Proof */}
        <div className="relative z-10 mt-12 md:mt-0 flex flex-col gap-2">
          <div className="flex -space-x-3">
            <img alt="User" className="w-10 h-10 rounded-full border-2 border-[var(--color-guff-primary)] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDszct2qXO9XKyU5cizIRcDhXi2tj7yx4Qi9eGvTpPVmBI_axlGeKe0dUIuAOuGajo66x1fiCeSUrwpC-lmGSV1KQrzJBG0aBtPzk3UW7Zp2Mm-IBbbUUOR-Au2vjiQcRI_nyP8_n7-0lMC1TN3e734kXAhM57WUmr3KcBfSwSIoSb14PoLjT5RTwDYWZFMBKPBq59ugBbMh_uGY_Fzpoeehq9P8DgsUwkFQ59e15ybpUs9beFe_B__csUdfJtgZxVUkOoa_-mSXij0"/>
            <img alt="User" className="w-10 h-10 rounded-full border-2 border-[var(--color-guff-primary)] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQXxCxUTj1sn4rlGVhiklFP1uT8QQXo9ezTuYf_1ETml9ERu4ixWmJQ6lzOury5im3lU4QzLfH06HCOzgK4TtTpXzrgefn5tzDi3qJbCKRZzR1RMqgWvv3cUoqmTe0VLPvcHNPOCATYb1dZA20uWsNKzntmNjSD87maA7jB3JZUv4GWdyPDzFdTkwJhGv_ExtWZIVbSCwbEVMFzmFh49vJcA3nWou_Ceuej65hohmS4L40kHOzjOYXc5F2jd-vSLd-n_istzaOVvlf"/>
            <img alt="User" className="w-10 h-10 rounded-full border-2 border-[var(--color-guff-primary)] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjK463IDYJ5GJ2r8k9s6SclmaVV3cPMHBIadOuYo_Z_E1DBfoQtiBB6v6L4b85dJWyfgmLqZXXActB0u9ZOleY2SUKiTasjn_5TGsv9d9OIBcu8R3DhVW7vzx6jwW78t9dZzbmYwcDjdBxr9KOHPwgqO30EbypMn4NnoUc4l35EjKf4TN98Ba3TYqZJYm__hQG-DD6Mn4TPAyknQI-S2ryfd1k1CU3kxQsp72J26O5SpWhSB6UZM-36T1oeyJtlr-NrOx4F_xPKiOn"/>
            <div className="w-10 h-10 rounded-full border-2 border-[var(--color-guff-primary)] bg-[var(--color-guff-primary-container)] flex items-center justify-center text-white text-xs font-bold">+5k</div>
          </div>
          <p className="text-white text-sm">Join <span className="font-bold">10,000+ users</span> sharing securely on GUFF</p>
        </div>
      </section>

      {/* Right Panel: Form Area */}
      <section className="w-full md:w-1/2 bg-[var(--color-guff-surface-bright)] flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-[440px]">
          {/* Auth Card */}
          <div className="bg-[var(--color-guff-surface-container-lowest)] rounded-[24px] shadow-[0_10px_15px_-3px_rgba(15,23,42,0.1)] p-6 md:p-10 border border-[var(--color-guff-outline-variant)]/30">
            {/* Tab Switcher */}
            <div className="bg-[var(--color-guff-surface-container)] flex p-1 rounded-full mb-8 relative">
              <div 
                className="absolute h-[calc(100%-8px)] top-1 left-1 bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out" 
                style={{
                  width: 'calc(50% - 4px)',
                  transform: mode === 'login' ? 'translateX(0%)' : 'translateX(100%)'
                }}
              ></div>
              <button 
                type="button"
                className={`relative z-10 flex-1 py-2 text-xs font-semibold text-center transition-colors ${
                  mode === 'login' ? 'text-[var(--color-guff-primary)] font-bold' : 'text-[var(--color-guff-outline)]'
                }`} 
                onClick={() => { setMode('login'); setError(''); }}
              >
                Login
              </button>
              <button 
                type="button"
                className={`relative z-10 flex-1 py-2 text-xs font-semibold text-center transition-colors ${
                  mode === 'register' ? 'text-[var(--color-guff-primary)] font-bold' : 'text-[var(--color-guff-outline)]'
                }`} 
                onClick={() => { setMode('register'); setError(''); }}
              >
                Register
              </button>
            </div>

            <header className="mb-6">
              <h2 className="text-xl font-bold text-[var(--color-guff-text)] mb-1">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-[var(--color-guff-text-secondary)]">
                {mode === 'login' ? 'Secure access to your dashboard and messages.' : 'Join our encrypted community today.'}
              </p>
            </header>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="relative input-floating-label group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-guff-outline)] group-focus-within:text-[var(--color-guff-primary)] transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input 
                    className="w-full pl-12 pr-4 py-4 bg-transparent border border-[var(--color-guff-outline-variant)] rounded-xl focus:ring-0 focus:border-[var(--color-guff-primary)] transition-all peer text-sm outline-none" 
                    placeholder=" " 
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                  <label className="absolute left-12 top-1/2 -translate-y-1/2 text-[var(--color-guff-outline-variant)] text-sm pointer-events-none transition-all duration-200">Username</label>
                </div>
              )}

              {/* Email Field */}
              <div className="relative input-floating-label group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-guff-outline)] group-focus-within:text-[var(--color-guff-primary)] transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  className="w-full pl-12 pr-4 py-4 bg-transparent border border-[var(--color-guff-outline-variant)] rounded-xl focus:ring-0 focus:border-[var(--color-guff-primary)] transition-all peer text-sm outline-none" 
                  placeholder=" " 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
                <label className="absolute left-12 top-1/2 -translate-y-1/2 text-[var(--color-guff-outline-variant)] text-sm pointer-events-none transition-all duration-200">Email Address</label>
              </div>

              {/* Password Field */}
              <div className="relative input-floating-label group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-guff-outline)] group-focus-within:text-[var(--color-guff-primary)] transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  className="w-full pl-12 pr-12 py-4 bg-transparent border border-[var(--color-guff-outline-variant)] rounded-xl focus:ring-0 focus:border-[var(--color-guff-primary)] transition-all peer text-sm outline-none" 
                  placeholder=" " 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <label className="absolute left-12 top-1/2 -translate-y-1/2 text-[var(--color-guff-outline-variant)] text-sm pointer-events-none transition-all duration-200">Password</label>
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-guff-outline)] hover:text-[var(--color-guff-primary)]" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input className="w-4 h-4 rounded border-[var(--color-guff-outline-variant)] text-[var(--color-guff-primary)] focus:ring-[var(--color-guff-primary)]/20" type="checkbox"/>
                  <span className="text-xs text-[var(--color-guff-text-secondary)]">Remember me</span>
                </label>
                <a className="text-xs text-[var(--color-guff-primary)] font-semibold hover:underline" href="#">Forgot password?</a>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-[var(--color-guff-danger)] rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                className="w-full bg-[var(--color-guff-primary)] hover:bg-[var(--color-guff-primary-hover)] text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Login to Account' : 'Start Sharing'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Social Login Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--color-guff-outline-variant)]/30"></div></div>
              <span className="relative bg-[var(--color-guff-surface-container-lowest)] px-4 text-[10px] font-bold text-[var(--color-guff-outline)] tracking-wider">OR CONTINUE WITH</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center gap-2 py-3 border border-[var(--color-guff-outline-variant)] rounded-xl hover:bg-[var(--color-guff-surface-container-low)] transition-colors text-sm font-medium text-[var(--color-guff-text)] cursor-pointer">
                <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDTixMEWqhET7cluJdvidrh03DcOw0G_OLLZS6L_xG5ao4nQ1sxsRcNG92uc2ckprIjyJnNshNOCl-rSmpKZa12y94MPS1_Bue_yZAVd_2Ok9mdUA3tv_wFO_dvOspn0l8eurCjpB5EcwelIOA1r8D841uPyILGxzZHQyQeRLCQeZ31dmRr9WAtlMCzXPuDCmtz6gLwFo5ayhkdIHlzWF2SpyJhEJVcyxliv88LXV6sSfPg4gg7vx1MHrnnL-EGqvpNeJw5Ed4VTtA"/>
                <span>Google</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-2 py-3 border border-[var(--color-guff-outline-variant)] rounded-xl hover:bg-[var(--color-guff-surface-container-low)] transition-colors text-sm font-medium text-[var(--color-guff-text)] cursor-pointer">
                <svg className="w-5 h-5 text-black fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.16-.52 2.81-1.33z"/>
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </div>

          <footer className="mt-6 text-center">
            <p className="text-[11px] text-[var(--color-guff-text-secondary)] leading-relaxed">
              By signing in, you agree to our <a className="text-[var(--color-guff-primary)] hover:underline" href="#">Terms of Service</a> and <a className="text-[var(--color-guff-primary)] hover:underline" href="#">Privacy Policy</a>.
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
