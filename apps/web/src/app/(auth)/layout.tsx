export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--color-surface)] text-[var(--color-on-surface)] h-screen w-screen overflow-hidden flex">
      {/* Left side: Indigo Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative h-full bg-gradient-to-br from-[#0f0069] to-[#3525cd] overflow-hidden">
        {/* Decorative glow orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-[#4f46e5]/40 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 h-full w-full">
          {/* Brand Header */}
          <div>
            <div className="flex items-center gap-4 mb-16">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <span className="text-white font-black text-2xl tracking-tighter font-display-lg">K</span>
              </div>
              <div>
                <h1 className="text-white text-3xl font-extrabold tracking-tight font-display-lg">Kurakani</h1>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] font-label-md">Connect Securely</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-6 max-w-sm">
              <div className="flex items-start gap-4 group">
                <div className="mt-0.5 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white transition-all group-hover:scale-110">
                  <span className="material-symbols-outlined text-[20px]">encrypted</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base font-headline-sm">Military-Grade Encryption</h3>
                  <p className="text-white/70 text-sm mt-1">End-to-End Encrypted. Your messages stay yours.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="mt-0.5 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white transition-all group-hover:scale-110">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base font-headline-sm">Real-Time Messaging</h3>
                  <p className="text-white/70 text-sm mt-1">Sub-100ms delivery across all connected devices.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="mt-0.5 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white transition-all group-hover:scale-110">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base font-headline-sm">Stories & Social Feed</h3>
                  <p className="text-white/70 text-sm mt-1">Share moments with your circles. Encrypted by default.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col gap-3">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#3525cd] bg-white flex items-center justify-center text-[#3525cd] text-xs font-bold">A</div>
              <div className="w-10 h-10 rounded-full border-2 border-[#3525cd] bg-white flex items-center justify-center text-[#3525cd] text-xs font-bold">S</div>
              <div className="w-10 h-10 rounded-full border-2 border-[#3525cd] bg-white flex items-center justify-center text-[#3525cd] text-xs font-bold">R</div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-[#4f46e5] flex items-center justify-center text-white text-xs font-bold">+12K</div>
            </div>
            <p className="text-white/80 text-sm font-body-md">Join <span className="font-bold text-white">12,000+ users</span> sharing securely on Kurakani</p>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 bg-[var(--color-surface)] overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-12 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center">
                <span className="text-[var(--color-primary)] font-black text-lg font-display-lg">K</span>
              </div>
              <span className="text-2xl font-extrabold text-[var(--color-primary)] tracking-tight font-display-lg">Kurakani</span>
            </div>
          </div>
          
          {children}

          <div className="mt-12 flex items-center justify-center gap-2 text-[var(--color-on-surface-variant)]">
            <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">verified_user</span>
            <span className="text-label-md uppercase tracking-wider text-[var(--color-primary)]">End-to-End Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
