import Link from "next/link";

export default function HomeCapabilitiesSection() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 via-slate-900/95 to-black/95" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-300">Ready to Get Started?</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Let&apos;s Discuss Your Requirements
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-300">
              Whether you&apos;re facing an active incident, planning for future readiness, or need ongoing support, our team is ready to help. Schedule a confidential consultation to discuss your specific needs.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "Free initial consultation",
                "Rapid response for urgent matters",
                "Flexible engagement models",
                "Strict confidentiality",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-zinc-200">
                  <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-lg transition-all duration-300 hover:bg-zinc-100"
              >
                Schedule Consultation
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:border-white/50 hover:bg-white/10"
              >
                Contact Us
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <h3 className="text-xl font-semibold text-white">Quick Contact</h3>
            <p className="mt-2 text-sm text-zinc-400">Fill out this form and we&apos;ll get back to you within 24 hours.</p>

            <form className="mt-6 space-y-4">
              <div>
                <label htmlFor="cta-name" className="block text-sm font-medium text-zinc-300">
                  Name
                </label>
                <input
                  type="text"
                  id="cta-name"
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="cta-email" className="block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <input
                  type="email"
                  id="cta-email"
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label htmlFor="cta-message" className="block text-sm font-medium text-zinc-300">
                  How can we help?
                </label>
                <textarea
                  id="cta-message"
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Brief description of your needs..."
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:shadow-sky-500/40 hover:brightness-110"
              >
                Send Message
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-zinc-500">
              We do not provide legal advice. Technical consulting only.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
