export default function HomeTrustedBySection() {
  const logos = [
    { name: "Fortune 500 Corp", abbr: "F500" },
    { name: "Global Bank", abbr: "GB" },
    { name: "Tech Giant", abbr: "TG" },
    { name: "Law Firm LLP", abbr: "LF" },
    { name: "Insurance Co", abbr: "IC" },
    { name: "Pharma Inc", abbr: "PI" },
    { name: "Energy Corp", abbr: "EC" },
    { name: "Retail Group", abbr: "RG" },
  ];

  return (
    <section className="border-y border-white/5 bg-gradient-to-b from-black to-slate-950/50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Trusted by Leading Organizations Worldwide
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="group flex h-12 items-center justify-center opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            >
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 transition-colors group-hover:border-sky-500/30 group-hover:bg-sky-500/5">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-sky-500/20 to-cyan-500/20 text-xs font-bold text-sky-400">
                  {logo.abbr}
                </div>
                <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200">
                  {logo.name}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Client names shown are representative placeholders. Actual client identities are confidential.
        </p>
      </div>
    </section>
  );
}
