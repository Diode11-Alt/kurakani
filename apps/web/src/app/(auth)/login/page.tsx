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
          // Clear old keys to enforce single-device MVP
          await supabase.from("identity_keys").delete().eq("user_id", user.id);
          await supabase.from("signed_pre_keys").delete().eq("user_id", user.id);
          await supabase.from("one_time_pre_keys").delete().eq("user_id", user.id);

          const { error: idKeyError } = await supabase.from("identity_keys").insert({
            user_id: user.id,
            device_id: currentDeviceId,
            identity_key: basePayload.identityKey,
          });
          if (idKeyError) throw idKeyError;

          const { error: spkError } = await supabase.from("signed_pre_keys").insert({
            user_id: user.id,
            device_id: currentDeviceId,
            key_id: basePayload.signedPreKey.keyId,
            public_key: basePayload.signedPreKey.publicKey,
            signature: basePayload.signedPreKey.signature,
          });
          if (spkError) throw spkError;

          await supabase.from("one_time_pre_keys").insert(
            basePayload.oneTimePreKeys.map((pk: any) => ({
              user_id: user.id,
              device_id: currentDeviceId,
              key_id: pk.keyId,
              public_key: pk.publicKey,
              used: false,
            }))
          );

          // Update registration_id on users table
          await supabase.from("users").update({
            registration_id: basePayload.registrationId
          }).eq("id", user.id);
          
        } catch (keyErr: any) {
          console.error("Key upload failed:", keyErr);
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
    <div className="w-full bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-[var(--color-primary)]/5 border border-[var(--color-outline-variant)]/30">
      <div className="text-center mb-10 space-y-2">
        <h2 className="text-headline-md font-bold text-[var(--color-on-surface)] font-display-lg tracking-tight">Welcome Back</h2>
        <p className="text-body-md text-[var(--color-on-surface-variant)]">
          Enter your credentials to decrypt your session.
        </p>
      </div>
      
      {error && !Object.keys(fieldErrors).length && (
        <div className="mb-6 p-4 bg-[var(--color-error-container)] text-[var(--color-error)] rounded-xl text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      <form className="space-y-6" onSubmit={handleLogin}>
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
              className="input-field pl-11 pr-12"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors" 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          <div className="flex justify-end pt-1">
            <a href="#" className="text-sm text-[var(--color-primary)] hover:opacity-80 transition-colors font-medium">
              Recover Key
            </a>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-[var(--color-error)] mt-1 pl-1 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              {fieldErrors.password[0]}
            </p>
          )}
        </div>

        <div className="pt-2">
          <button 
            disabled={loading}
            type="submit"
            className="btn-primary w-full flex justify-center items-center gap-2"
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
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          Require an account?{" "}
          <Link href="/register" className="text-[var(--color-primary)] font-semibold hover:underline decoration-[var(--color-primary)]/30 underline-offset-4">
            Create Identity
          </Link>
        </p>
      </div>
    </div>
  );
}
