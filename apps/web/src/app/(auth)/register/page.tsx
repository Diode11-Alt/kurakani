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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      setLoading(true);

      // 1. Generate new cryptographic identity for this device
      const store = new WebSignalStore();
      const serverPayload = await generateSignalRegistrationPayload(store);

      // 2. Hit our strict Zero-Knowledge auth endpoint
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
        throw new Error(data.error || "Registration failed");
      }

      // Store basic JWT and ID
      setJwt(data.accessToken);
      setUserId(data.user.id);
      setKeysGenerated(true);
      
      // Redirect to main app
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
        <h2 className="text-headline-md text-content mb-2">Request Clearance</h2>
        <p className="text-body-md text-content-muted">
          Establish your identity on the zero-knowledge network.
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-error/10 text-error rounded-lg text-body-md border border-error/20">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleRegister}>
        <div className="space-y-2">
          <label className="block text-label-md text-content" htmlFor="name">
            Display Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
            <input 
              id="name" 
              type="text" 
              required
              className="w-full pl-10 pr-4 py-3 bg-surface border border-elevated rounded-lg text-body-md text-content focus:ring-0 focus:border-brand outline-none focus:shadow-[0_0_0_3px_rgba(225,29,72,0.15)] placeholder-content-muted transition-colors" 
              placeholder="alex_rivera"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

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
              className="w-full pl-10 pr-4 py-3 bg-surface border border-elevated rounded-lg text-body-md text-content focus:ring-0 focus:border-brand outline-none focus:shadow-[0_0_0_3px_rgba(225,29,72,0.15)] placeholder-content-muted transition-colors" 
              placeholder="you@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-label-md text-content" htmlFor="phone">
            Phone (Optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
              <span className="material-symbols-outlined text-[20px]">phone</span>
            </div>
            <input 
              id="phone" 
              type="tel"
              className="w-full pl-10 pr-4 py-3 bg-surface border border-elevated rounded-lg text-body-md text-content focus:ring-0 focus:border-brand outline-none focus:shadow-[0_0_0_3px_rgba(225,29,72,0.15)] placeholder-content-muted transition-colors" 
              placeholder="+15550100"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-label-md text-content" htmlFor="password">
            Passphrase
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
            <input 
              id="password" 
              type="password" 
              required
              className="w-full pl-10 pr-4 py-3 bg-surface border border-elevated rounded-lg text-body-md text-content focus:ring-0 focus:border-brand outline-none focus:shadow-[0_0_0_3px_rgba(225,29,72,0.15)] placeholder-content-muted transition-colors" 
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
          {loading ? "Initializing..." : "Create Identity"}
          {!loading && <span className="material-symbols-outlined text-[18px]">how_to_reg</span>}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-elevated text-center">
        <p className="text-body-md text-content-muted">
          Already have clearance?{" "}
          <Link href="/login" className="text-label-md text-brand hover:text-brand-hover transition-colors">
            Authenticate
          </Link>
        </p>
      </div>
    </>
  );
}
