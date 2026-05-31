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
      <div className="w-full h-screen flex items-center justify-center bg-base">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden bg-base">
      {/* Left Panel: Volcanic Brand */}
      <section className="w-full md:w-1/2 bg-auth-gradient p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Ember particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-brand/60 animate-ember-drift" style={{ animationDelay: '0s' }} />
          <div className="absolute top-[40%] left-[30%] w-1.5 h-1.5 rounded-full bg-spark/50 animate-ember-drift" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[60%] left-[50%] w-1 h-1 rounded-full bg-brand/40 animate-ember-drift" style={{ animationDelay: '4s' }} />
          <div className="absolute top-[30%] left-[70%] w-2.5 h-2.5 rounded-full bg-blaze/30 animate-ember-drift" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[70%] left-[25%] w-1.5 h-1.5 rounded-full bg-brand/50 animate-ember-drift" style={{ animationDelay: '6s' }} />
          {/* Glow orbs */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand/8 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-blaze/10 blur-[80px]" />
        </div>
        
        <div className="relative z-10 flex flex-col">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center ember-glow-sm">
              <span className="text-brand font-black text-2xl tracking-tighter" style={{ fontFamily: 'var(--font-sora)' }}>G</span>
            </div>
            <div>
              <h1 className="text-white text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-sora)' }}>GUFF</h1>
              <p className="text-content-muted text-[10px] font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)' }}>The Signal Fire</p>
            </div>
          </div>
          
          <div className="space-y-6 max-w-md">
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 w-10 h-10 rounded-xl glass-dark flex items-center justify-center text-brand transition-transform group-hover:scale-110">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-content font-semibold text-base" style={{ fontFamily: 'var(--font-sora)' }}>End-to-End Encrypted</h3>
                <p className="text-content-muted text-sm mt-1">Your private conversations stay private with military-grade encryption.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 w-10 h-10 rounded-xl glass-dark flex items-center justify-center text-brand transition-transform group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-content font-semibold text-base" style={{ fontFamily: 'var(--font-sora)' }}>Real-time Messaging</h3>
                <p className="text-content-muted text-sm mt-1">Instant delivery with low latency across all your connected devices.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 group">
              <div className="mt-0.5 w-10 h-10 rounded-xl glass-dark flex items-center justify-center text-spark transition-transform group-hover:scale-110">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-content font-semibold text-base" style={{ fontFamily: 'var(--font-sora)' }}>Stories & Social Feed</h3>
                <p className="text-content-muted text-sm mt-1">Share life&apos;s moments with circles of friends in a high-velocity feed.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Social proof */}
        <div className="relative z-10 mt-12 md:mt-0 flex flex-col gap-2">
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full border-2 border-brand bg-elevated flex items-center justify-center text-brand text-xs font-bold">A</div>
            <div className="w-10 h-10 rounded-full border-2 border-blaze bg-elevated flex items-center justify-center text-blaze text-xs font-bold">S</div>
            <div className="w-10 h-10 rounded-full border-2 border-spark bg-elevated flex items-center justify-center text-spark text-xs font-bold">R</div>
            <div className="w-10 h-10 rounded-full border-2 border-brand bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">+5k</div>
          </div>
          <p className="text-content-secondary text-sm">Join <span className="font-bold text-content">10,000+ users</span> sharing securely on GUFF</p>
        </div>
      </section>

      {/* Right Panel: Form */}
      <section className="w-full md:w-1/2 bg-base flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-[440px]">
          <div className="card-ember p-6 md:p-10">
            {/* Tab Switcher */}
            <div className="bg-[#171311] flex p-1 rounded-full mb-8 relative">
              <div 
                className="absolute h-[calc(100%-8px)] top-1 left-1 bg-surface rounded-full shadow-sm transition-all duration-300 ease-in-out border border-border" 
                style={{
                  width: 'calc(50% - 4px)',
                  transform: mode === 'login' ? 'translateX(0%)' : 'translateX(100%)'
                }}
              />
              <button 
                type="button"
                className={`relative z-10 flex-1 py-2 text-xs font-semibold text-center transition-colors cursor-pointer ${
                  mode === 'login' ? 'text-brand font-bold' : 'text-content-muted'
                }`} 
                onClick={() => { setMode('login'); setError(''); }}
              >
                Login
              </button>
              <button 
                type="button"
                className={`relative z-10 flex-1 py-2 text-xs font-semibold text-center transition-colors cursor-pointer ${
                  mode === 'register' ? 'text-brand font-bold' : 'text-content-muted'
                }`} 
                onClick={() => { setMode('register'); setError(''); }}
              >
                Register
              </button>
            </div>

            <header className="mb-6">
              <h2 className="text-headline-sm text-content mb-1">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-content-muted">
                {mode === 'login' ? 'Secure access to your dashboard and messages.' : 'Join our encrypted community today.'}
              </p>
            </header>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="relative input-floating-label group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input 
                    className="w-full pl-12 pr-4 py-4 bg-[#171311] border border-border rounded-xl focus:ring-0 focus:border-brand transition-all peer text-sm outline-none text-content placeholder-transparent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]" 
                    placeholder=" " 
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                  <label className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200">Username</label>
                </div>
              )}

              {/* Email */}
              <div className="relative input-floating-label group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  className="w-full pl-12 pr-4 py-4 bg-[#171311] border border-border rounded-xl focus:ring-0 focus:border-brand transition-all peer text-sm outline-none text-content placeholder-transparent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]" 
                  placeholder=" " 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
                <label className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200">Email Address</label>
              </div>

              {/* Password */}
              <div className="relative input-floating-label group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  className="w-full pl-12 pr-12 py-4 bg-[#171311] border border-border rounded-xl focus:ring-0 focus:border-brand transition-all peer text-sm outline-none text-content placeholder-transparent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]" 
                  placeholder=" " 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <label className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200">Password</label>
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted hover:text-brand cursor-pointer" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input className="w-4 h-4 rounded border-border text-brand focus:ring-brand/20 bg-[#171311]" type="checkbox"/>
                  <span className="text-xs text-content-muted">Remember me</span>
                </label>
                <a className="text-xs text-brand font-semibold hover:underline" href="#">Forgot password?</a>
              </div>

              {error && (
                <div className="p-3 bg-blaze/10 text-blaze rounded-xl text-xs font-semibold border border-blaze/20 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                className="btn-primary w-full py-4 flex items-center justify-center gap-2 cursor-pointer text-base"
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
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50"></div></div>
              <span className="relative bg-surface px-4 text-[10px] font-bold text-content-muted tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>OR CONTINUE WITH</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="btn-secondary flex items-center justify-center gap-2 py-3 text-sm cursor-pointer">
                <img alt="Google" className="w-5 h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDTixMEWqhET7cluJdvidrh03DcOw0G_OLLZS6L_xG5ao4nQ1sxsRcNG92uc2ckprIjyJnNshNOCl-rSmpKZa12y94MPS1_Bue_yZAVd_2Ok9mdUA3tv_wFO_dvOspn0l8eurCjpB5EcwelIOA1r8D841uPyILGxzZHQyQeRLCQeZ31dmRr9WAtlMCzXPuDCmtz6gLwFo5ayhkdIHlzWF2SpyJhEJVcyxliv88LXV6sSfPg4gg7vx1MHrnnL-EGqvpNeJw5Ed4VTtA"/>
                <span>Google</span>
              </button>
              <button type="button" className="btn-secondary flex items-center justify-center gap-2 py-3 text-sm cursor-pointer">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.83-.98 2.94 1.07.08 2.16-.52 2.81-1.33z"/>
                </svg>
                <span>Apple</span>
              </button>
            </div>
          </div>

          <footer className="mt-6 text-center">
            <p className="text-[11px] text-content-muted leading-relaxed">
              By signing in, you agree to our <a className="text-brand hover:underline" href="/terms">Terms of Service</a> and <a className="text-brand hover:underline" href="/privacy">Privacy Policy</a>.
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
