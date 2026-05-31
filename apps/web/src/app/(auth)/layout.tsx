export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-base text-content font-sans h-screen w-screen overflow-hidden flex">
      {/* Left side: Imagery (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative h-full bg-surface">
        <img 
          alt="Modern architectural space" 
          className="absolute inset-0 w-full h-full object-cover" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1RHzB5Ot6W726TdSHTUXp8Tba-VScS1g9b55gW7BBGgn0sCIKTK_4peFKJGsYOYio5r9mu3JMMdEcKEI_qA0TI7ZJStPxgL2YV3nZC60C15Wvzx44BDXYlo2BOcnFvyDb75JaayQOPrAkYCPGMSNfY1RfYU8WvCuqL7Ok0W77XcYFyP-kXS27AS7Y7EzE71Bfrhja9SA05tmx8_fKX6y0UFr7JPFn2AJVB7tDE6D2BLUl79LNohT2dPDb2NwlTWZrVZwgPaDf2OQA"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-end p-12 h-full text-white">
          <h1 className="text-display-lg text-5xl md:text-6xl font-bold leading-tight mb-4 text-white">
            The Architecture<br/>of Trust
          </h1>
          <p className="text-body-lg text-lg max-w-md text-white/90">
            Secure, encrypted communications for the modern enterprise. Built on uncompromising privacy standards.
          </p>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 bg-base overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-12">
            <span className="text-display-lg text-3xl font-extrabold text-brand tracking-tight">GUFF</span>
          </div>
          {children}
          
          <div className="mt-12 flex items-center justify-center gap-2 text-content-muted">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span className="text-label-md uppercase tracking-wider text-secure">End-to-End Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
