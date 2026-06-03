"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import { WebSignalStore } from "../../../lib/crypto/WebSignalStore";
import { generateSignalRegistrationPayload } from "../../../lib/crypto/registration";
import { supabase } from "../../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { setDeviceId, setKeysGenerated, deviceId } = useAuthStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string[] }>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      // 1. Generate new cryptographic identity for this device only if not initialized
      const store = new WebSignalStore();
      const isInit = await store.isInitialized();
      
      let basePayload = null;
      if (!isInit) {
        basePayload = await generateSignalRegistrationPayload(store);
      }
      
      // Determine device ID
      let currentDeviceId = deviceId;
      if (!currentDeviceId) {
        currentDeviceId = Math.floor(Math.random() * 2147483647) + 1; // Random positive integer
        setDeviceId(currentDeviceId);
      }

      // 2. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      const user = authData.user;
      if (!user) {
        throw new Error("Authentication failed - no user returned.");
      }
      
      // Upload new keys for this device session only if they were just generated
      if (!isInit && basePayload) {
        try {
          const { error: idKeyError } = await supabase.from("identity_keys").insert({
            user_id: user.id,
            device_id: currentDeviceId,
            identity_key: basePayload.identityKey,
          });
          // Ignore duplicate key error if we already uploaded keys for this device (code 23505)
          if (idKeyError && idKeyError.code !== '23505') throw idKeyError;

          const { error: spkError } = await supabase.from("signed_pre_keys").insert({
            user_id: user.id,
            device_id: currentDeviceId,
            key_id: basePayload.signedPreKey.keyId,
            public_key: basePayload.signedPreKey.publicKey,
            signature: basePayload.signedPreKey.signature,
          });
          if (spkError && spkError.code !== '23505') throw spkError;

          await supabase.from("one_time_pre_keys").insert(
            basePayload.oneTimePreKeys.map((pk: any) => ({
              user_id: user.id,
              device_id: currentDeviceId,
              key_id: pk.keyId,
              public_key: pk.publicKey,
              used: false,
            }))
          );
        } catch (keyErr: any) {
          console.error("Key upload failed (may already exist):", keyErr);
        }
      }

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
        <h2 className="text-headline-md text-content">Authenticate Identity</h2>
        <p className="text-body-md text-content-muted">
          Enter your credentials to decrypt your session.
        </p>
      </div>
      
      {error && !Object.keys(fieldErrors).length && (
        <div className="mb-6 p-4 bg-blaze/10 text-blaze rounded-xl text-sm border border-blaze/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleLogin}>
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
            <label 
              htmlFor="email"
              className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200"
            >
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
            <label 
              htmlFor="password"
              className="absolute left-12 top-1/2 -translate-y-1/2 text-content-muted text-sm pointer-events-none transition-all duration-200"
            >
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
          <div className="flex justify-end pt-1">
            <a href="#" className="text-sm text-brand hover:text-brand-hover transition-colors font-medium">
              Recover Key
            </a>
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
                <span>Authenticate Session</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-content-muted">
          Require corporate access?{" "}
          <Link href="/register" className="text-brand font-semibold hover:underline decoration-brand/30 underline-offset-4">
            Request Clearance
          </Link>
        </p>
      </div>
    </div>
  );
}
