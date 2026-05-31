"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "../../../store/appStore";
import { WebSignalStore } from "../../../lib/crypto/WebSignalStore";
import { generateSignalRegistrationPayload } from "../../../lib/crypto/registration";

export default function LoginPage() {
  const router = useRouter();
  const { setJwt, setUserId, isKeysGenerated } = useAppStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      setLoading(true);
      
      // 1. Generate new cryptographic identity for this device
      const store = new WebSignalStore();
      const serverPayload = await generateSignalRegistrationPayload(store);

      // 2. Hit our strict Zero-Knowledge auth endpoint
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, serverPayload }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
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
    <>
      <div className="mb-8">
        <h2 className="text-headline-md text-content mb-2">Access Portal</h2>
        <p className="text-body-md text-content-muted">
          Enter your credentials to access the encrypted environment.
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-error/10 text-error rounded-lg text-body-md border border-error/20">
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleLogin}>
        <div className="space-y-2">
          <label className="block text-label-md text-content" htmlFor="email">
            Workspace Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </div>
            <input 
              id="email" 
              type="email" 
              required
              className="w-full pl-10 pr-4 py-3 bg-surface border border-elevated rounded-lg text-body-md text-content focus:ring-0 focus:border-brand transition-colors placeholder-content-muted outline-none focus:shadow-[0_0_0_3px_rgba(225,29,72,0.15)]" 
              placeholder="you@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-label-md text-content" htmlFor="password">
              Encrypted Key
            </label>
            <a className="text-label-md text-brand hover:text-brand-hover transition-colors" href="#">
              Recover Key
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
            <input 
              id="password" 
              type="password" 
              required
              className="w-full pl-10 pr-4 py-3 bg-surface border border-elevated rounded-lg text-body-md text-content focus:ring-0 focus:border-brand transition-colors placeholder-content-muted outline-none focus:shadow-[0_0_0_3px_rgba(225,29,72,0.15)]" 
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          type="submit"
          className="w-full py-3 px-4 bg-brand text-white text-label-md rounded-lg hover:bg-brand-hover active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-4 shadow-sm disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Authenticate Session"}
          {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-elevated text-center">
        <p className="text-body-md text-content-muted">
          Require corporate access?{" "}
          <Link href="/register" className="text-label-md text-brand hover:text-brand-hover transition-colors">
            Request Clearance
          </Link>
        </p>
      </div>
    </>
  );
}
