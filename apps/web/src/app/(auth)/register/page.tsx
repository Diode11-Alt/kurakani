"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "../../../store/appStore";
import { WebSignalStore } from "../../../lib/crypto/WebSignalStore";
import { generateSignalRegistrationPayload } from "../../../lib/crypto/registration";

export default function RegisterPage() {
  const router = useRouter();
  const { setJwt, setUserId, setKeysGenerated } = useAppStore();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const store = new WebSignalStore();
      const serverPayload = await generateSignalRegistrationPayload(store);

      const res = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username, 
          email, 
          password, 
          ...(phoneNumber ? { phoneNumber } : {}), 
          serverPayload 
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.details && data.details.fieldErrors) {
          setFieldErrors(data.details.fieldErrors);
        }
        throw new Error(data.error || "Registration failed");
      }

      setJwt(data.accessToken);
      setUserId(data.user.id);
      setKeysGenerated(true);
      
      router.replace("/feed");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full card-ember p-8 shadow-lg shadow-black/20">
      <div className="text-center mb-10 space-y-2">
        <h2 className="text-headline-md text-content">Initialize Your Identity</h2>
        <p className="text-body-md text-content-muted">
          Establish your unique node in the zero-knowledge ecosystem.
        </p>
      </div>
      
      {error && !Object.keys(fieldErrors).length && (
        <div className="mb-6 p-4 bg-blaze/10 text-blaze rounded-xl text-sm border border-blaze/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      <form className="space-y-5" onSubmit={handleRegister}>
        {/* Username */}
        <div className="space-y-1">
          <div className="relative group input-floating-label">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand transition-colors">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            <input 
              id="name" 
              type="text" 
              required
              className="w-full pl-12 pr-4 py-4 bg-[#171311] border border-border rounded-xl focus:ring-0 focus:border-brand transition-all peer text-content text-sm outline-none placeholder-transparent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]" 
              placeholder=" "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="name" className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200">
              Display Name
            </label>
          </div>
          {fieldErrors.username && (
            <p className="text-xs text-blaze mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.username[0]}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <div className="relative group input-floating-label">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand transition-colors">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </div>
            <input 
              id="email" 
              type="email" 
              required
              className="w-full pl-12 pr-4 py-4 bg-[#171311] border border-border rounded-xl focus:ring-0 focus:border-brand transition-all peer text-content text-sm outline-none placeholder-transparent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]" 
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="email" className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200">
              Workspace Email
            </label>
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-blaze mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.email[0]}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <div className="relative group input-floating-label">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand transition-colors">
              <span className="material-symbols-outlined text-[20px]">phone</span>
            </div>
            <input 
              id="phone" 
              type="tel"
              className="w-full pl-12 pr-4 py-4 bg-[#171311] border border-border rounded-xl focus:ring-0 focus:border-brand transition-all peer text-content text-sm outline-none placeholder-transparent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]" 
              placeholder=" "
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <label htmlFor="phone" className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200">
              Phone (Optional)
            </label>
          </div>
          {fieldErrors.phoneNumber && (
            <p className="text-xs text-blaze mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.phoneNumber[0]}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="relative group input-floating-label">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted group-focus-within:text-brand transition-colors">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <input 
              id="password" 
              type={showPassword ? "text" : "password"}
              required
              className="w-full pl-12 pr-12 py-4 bg-[#171311] border border-border rounded-xl focus:ring-0 focus:border-brand transition-all peer text-content text-sm outline-none placeholder-transparent focus:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]" 
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="password" className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200">
              Passphrase
            </label>
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted hover:text-brand transition-colors" 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-blaze mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.password[0]}
            </p>
          )}
        </div>

        <div className="pt-2">
          <button 
            disabled={loading}
            type="submit"
            className="btn-primary w-full py-4 flex justify-center items-center gap-2 text-base cursor-pointer"
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
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-content-muted">
          Already have an identity?{" "}
          <Link href="/login" className="text-brand font-semibold hover:underline decoration-brand/30 underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
