export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-base text-content h-screen w-screen overflow-hidden flex">
      {/* Left side: Volcanic Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative h-full bg-auth-gradient overflow-hidden">
        {/* Ember particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-brand/60 animate-ember-drift" style={{ animationDelay: '0s' }} />
          <div className="absolute top-[40%] left-[30%] w-1.5 h-1.5 rounded-full bg-spark/50 animate-ember-drift" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[60%] left-[50%] w-1 h-1 rounded-full bg-brand/40 animate-ember-drift" style={{ animationDelay: '4s' }} />
          <div className="absolute top-[30%] left-[70%] w-2.5 h-2.5 rounded-full bg-blaze/30 animate-ember-drift" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[70%] left-[25%] w-1.5 h-1.5 rounded-full bg-brand/50 animate-ember-drift" style={{ animationDelay: '6s' }} />
          <div className="absolute top-[50%] left-[60%] w-1 h-1 rounded-full bg-spark/40 animate-ember-drift" style={{ animationDelay: '3s' }} />
          {/* Decorative glow orbs */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand/8 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-blaze/10 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 h-full w-full">
          {/* Brand Header */}
          <div>
            <div className="flex items-center gap-4 mb-16">
              <div className="w-14 h-14 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center ember-glow-sm">
                <span className="text-brand font-black text-2xl tracking-tighter" style={{ fontFamily: 'var(--font-sora)' }}>G</span>
              </div>
              <div>
                <h1 className="text-white text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-sora)' }}>GUFF</h1>
                <p className="text-content-muted text-[10px] font-bold uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--font-mono)' }}>The Signal Fire</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-6 max-w-sm">
              <div className="flex items-start gap-4 group">
                <div className="mt-0.5 w-10 h-10 rounded-xl glass-dark flex items-center justify-center text-brand transition-all group-hover:scale-110 group-hover:ember-glow-sm">
                  <span className="material-symbols-outlined text-[20px]">encrypted</span>
                </div>
                <div>
                  <h3 className="text-content font-semibold text-base" style={{ fontFamily: 'var(--font-sora)' }}>Military-Grade Encryption</h3>
                  <p className="text-content-muted text-sm mt-1">Signal Protocol E2EE. Your messages stay yours.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="mt-0.5 w-10 h-10 rounded-xl glass-dark flex items-center justify-center text-brand transition-all group-hover:scale-110">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </div>
                <div>
                  <h3 className="text-content font-semibold text-base" style={{ fontFamily: 'var(--font-sora)' }}>Real-Time Messaging</h3>
                  <p className="text-content-muted text-sm mt-1">Sub-100ms delivery across all connected devices.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 group">
                <div className="mt-0.5 w-10 h-10 rounded-xl glass-dark flex items-center justify-center text-spark transition-all group-hover:scale-110">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div>
                  <h3 className="text-content font-semibold text-base" style={{ fontFamily: 'var(--font-sora)' }}>Stories & Social Feed</h3>
                  <p className="text-content-muted text-sm mt-1">Share moments with your circles. Encrypted by default.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col gap-3">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-brand bg-elevated flex items-center justify-center text-brand text-xs font-bold">A</div>
              <div className="w-10 h-10 rounded-full border-2 border-blaze bg-elevated flex items-center justify-center text-blaze text-xs font-bold">S</div>
              <div className="w-10 h-10 rounded-full border-2 border-spark bg-elevated flex items-center justify-center text-spark text-xs font-bold">R</div>
              <div className="w-10 h-10 rounded-full border-2 border-brand bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">+12K</div>
            </div>
            <p className="text-content-secondary text-sm">Join <span className="font-bold text-content">12,000+ users</span> sharing securely on GUFF</p>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 bg-base overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-12 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center">
                <span className="text-brand font-black text-lg" style={{ fontFamily: 'var(--font-sora)' }}>G</span>
              </div>
              <span className="text-2xl font-extrabold text-brand tracking-tight" style={{ fontFamily: 'var(--font-sora)' }}>GUFF</span>
            </div>
          </div>
          <div className="hidden lg:block mb-12">
            <span className="text-3xl font-extrabold text-brand tracking-tight" style={{ fontFamily: 'var(--font-sora)' }}>GUFF</span>
          </div>
          
          {children}

          <div className="mt-12 flex items-center justify-center gap-2 text-content-muted">
            <span className="material-symbols-outlined text-[16px] text-spark">verified_user</span>
            <span className="text-label-md uppercase tracking-wider text-spark">End-to-End Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
