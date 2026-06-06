"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import { supabase } from "../../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const { setDeviceId, deviceId } = useAuthStore();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [botField, setBotField] = useState(""); // Honeypot
  
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const getOrCreateDeviceId = () => {
    let currentDeviceId = deviceId;
    if (!currentDeviceId) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      currentDeviceId = (arr[0] % 2147483646) + 1;
      setDeviceId(currentDeviceId);
    }
    return currentDeviceId;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    if (botField) {
      // Honeypot tripped: silently "succeed" to fool the bot, but do nothing
      await new Promise(r => setTimeout(r, 1500));
      return;
    }

    try {
      getOrCreateDeviceId();

      // Hash the phone number if provided
      let phoneHash = null;
      if (phoneNumber) {
        const pepper = process.env.NEXT_PUBLIC_PHONE_PEPPER || 'kurakani_default_pepper';
        const msgUint8 = new TextEncoder().encode(phoneNumber + pepper);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        phoneHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      }

      // Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            phone_hash: phoneHash,
            registration_id: 1, // Fallback placeholder since we removed crypto
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Registration failed - no user returned.");
      }
      
      if (!authData.session) {
        setVerificationSent(true);
      } else {
        router.replace("/feed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      getOrCreateDeviceId();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/feed`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-[var(--color-primary)]/5 border border-[var(--color-outline-variant)]/30">
      <div className="text-center mb-10 space-y-2">
        <h2 className="text-headline-md font-bold text-[var(--color-on-surface)] font-display-lg tracking-tight">Initialize Your Identity</h2>
        <p className="text-body-md text-[var(--color-on-surface-variant)]">
          Establish your unique node in the zero-knowledge ecosystem.
        </p>
      </div>
      
      {error && !Object.keys(fieldErrors).length && (
        <div className="mb-6 p-4 bg-[var(--color-error-container)] text-[var(--color-error)] rounded-xl text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleRegister}>
        {/* Honeypot field (hidden from screen readers and visual layout) */}
        <div aria-hidden="true" style={{ display: 'none', position: 'absolute', left: '-9999px' }}>
          <label htmlFor="website">Website</label>
          <input 
            id="website" 
            type="text" 
            name="website" 
            tabIndex={-1} 
            autoComplete="off" 
            value={botField}
            onChange={(e) => setBotField(e.target.value)}
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-on-surface)] ml-1" htmlFor="name">Display Name</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            <input 
              id="name" 
              type="text" 
              required
              className="input-field pl-11"
              placeholder="Satoshi Nakamoto"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {fieldErrors.username && (
            <p className="text-xs text-[var(--color-error)] mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.username[0]}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-on-surface)] ml-1" htmlFor="email">Workspace Email</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </div>
            <input 
              id="email" 
              type="email" 
              required
              className="input-field pl-11"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-[var(--color-error)] mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.email[0]}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-on-surface)] ml-1" htmlFor="phone">Phone (Optional)</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">
              <span className="material-symbols-outlined text-[20px]">phone</span>
            </div>
            <input 
              id="phone" 
              type="tel"
              className="input-field pl-11"
              placeholder="+1 (555) 000-0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          {fieldErrors.phoneNumber && (
            <p className="text-xs text-[var(--color-error)] mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.phoneNumber[0]}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-on-surface)] ml-1" htmlFor="password">Passphrase</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <input 
              id="password" 
              type={showPassword ? "text" : "password"}
              required
              minLength={12}
              className="input-field pl-11 pr-12"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors bg-transparent border-none p-0 cursor-pointer" 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-[var(--color-error)] mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.password[0]}
            </p>
          )}
        </div>

        {verificationSent && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm flex items-center gap-2 font-medium border border-green-200">
            <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
            Registration successful! Please check your email to verify your identity before signing in.
          </div>
        )}

        <div className="pt-2">
          <button 
            disabled={loading || verificationSent}
            type="submit"
            className="btn-primary w-full flex justify-center items-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            ) : (
              <>
                <span>Create Identity</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-outline-variant)]/40"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-[var(--color-on-surface-variant)] text-xs font-semibold uppercase tracking-wider">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--color-outline-variant)]/60 bg-white hover:bg-gray-50 text-[var(--color-on-surface)] font-medium transition-colors shadow-sm cursor-pointer"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('github')}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--color-outline-variant)]/60 bg-[#24292F] hover:bg-[#1b1f24] text-white font-medium transition-colors shadow-sm cursor-pointer"
          >
            <img src="https://www.svgrepo.com/show/512317/github-142.svg" alt="GitHub" className="w-5 h-5 invert" />
            GitHub
          </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          Already have an identity?{" "}
          <Link href="/login" className="text-[var(--color-primary)] font-semibold hover:underline decoration-[var(--color-primary)]/30 underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
