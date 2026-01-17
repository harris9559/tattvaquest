import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tattvaquest.example"),
  title: {
    default: "TattvaQuest | LegalTech & Data Automation",
    template: "%s | TattvaQuest",
  },
  description:
    "TattvaQuest delivers secure LegalTech automation for incident response, disaster recovery, eDiscovery, and compliance workflows.",
  openGraph: {
    type: "website",
    title: "TattvaQuest | LegalTech & Data Automation",
    description:
      "LegalTech and data automation platform for incident response, disaster recovery, eDiscovery, and compliance workflows.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "TattvaQuest | LegalTech & Data Automation",
    description:
      "Secure automation for incident response, eDiscovery, disaster recovery, and compliance workflows.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface NavigationLink {
  label: string;
  href: string;
}

const primaryNav: NavigationLink[] = [
  { label: "Home", href: "/" },
  { label: "Solutions", href: "/solutions" },
  { label: "Technology", href: "/technology" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const legalNav: NavigationLink[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
];

function MobileNav({ primaryNav }: { primaryNav: NavigationLink[] }) {
  return (
    <details className="relative">
      <summary
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-white/10 bg-black/40 text-[11px] text-zinc-100 transition hover:border-sky-500/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        aria-label="Toggle navigation menu"
      >
        <span className="sr-only">Open navigation</span>
        <span className="flex flex-col gap-0.5">
          <span className="h-[1px] w-3.5 bg-zinc-200" />
          <span className="h-[1px] w-3.5 bg-zinc-200" />
        </span>
      </summary>
      <div className="absolute right-0 mt-2 w-44 rounded-lg border border-white/10 bg-black/90 py-2 text-xs shadow-subtle">
        <nav aria-label="Mobile primary navigation" className="flex flex-col">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-zinc-200 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:bg-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </details>
  );
}

function TattvaQuestLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TattvaQuest logo"
    >
      <rect x="0" y="4" width="32" height="32" rx="6" fill="url(#tq-gradient)" />
      <path
        d="M8 14h16M16 14v14"
        stroke="#050509"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <text
        x="42"
        y="27"
        fill="#F9FAFB"
        fontFamily="system-ui, sans-serif"
        fontSize="18"
        fontWeight="600"
        letterSpacing="-0.02em"
      >
        TattvaQuest
      </text>
      <defs>
        <linearGradient id="tq-gradient" x1="0" y1="4" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-textPrimary`}>
        <div className="main-shell">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <TattvaQuestLogo className="h-9 w-auto" />
              </Link>

              <nav
                className="hidden items-center gap-8 text-sm font-medium text-zinc-300 lg:flex"
                aria-label="Primary navigation"
              >
                {primaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative py-1 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="hidden items-center gap-4 lg:flex">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all duration-200 hover:shadow-sky-500/40 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Get Started
                </Link>
              </div>

              <div className="flex items-center gap-3 lg:hidden">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Contact
                </Link>
                <MobileNav primaryNav={primaryNav} />
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-white/10 bg-gradient-to-b from-slate-950 to-black">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
              <div className="grid gap-12 lg:grid-cols-4">
                <div className="lg:col-span-1">
                  <TattvaQuestLogo className="h-8 w-auto" />
                  <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                    Enterprise-grade LegalTech and digital forensics consulting for organizations navigating complex investigations and compliance challenges.
                  </p>
                  <div className="mt-6 flex gap-4">
                    <a href="#" className="text-zinc-500 transition-colors hover:text-sky-400" aria-label="LinkedIn">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </a>
                    <a href="#" className="text-zinc-500 transition-colors hover:text-sky-400" aria-label="Twitter">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Solutions</h4>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li><Link href="/solutions" className="text-zinc-400 transition-colors hover:text-white">Digital Forensics</Link></li>
                    <li><Link href="/solutions" className="text-zinc-400 transition-colors hover:text-white">Incident Response</Link></li>
                    <li><Link href="/solutions" className="text-zinc-400 transition-colors hover:text-white">eDiscovery Support</Link></li>
                    <li><Link href="/solutions" className="text-zinc-400 transition-colors hover:text-white">Compliance Automation</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Company</h4>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li><Link href="/about" className="text-zinc-400 transition-colors hover:text-white">About Us</Link></li>
                    <li><Link href="/technology" className="text-zinc-400 transition-colors hover:text-white">Technology</Link></li>
                    <li><Link href="/contact" className="text-zinc-400 transition-colors hover:text-white">Contact</Link></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">Stay Updated</h4>
                  <p className="mt-4 text-sm text-zinc-400">Subscribe to our newsletter for insights on LegalTech and digital forensics.</p>
                  <form className="mt-4 flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
                    >
                      Subscribe
                    </button>
                  </form>
                </div>
              </div>

              <div className="mt-12 border-t border-white/10 pt-8">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex flex-wrap justify-center gap-6 text-sm">
                    {legalNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="text-zinc-500 transition-colors hover:text-zinc-300"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-500">
                    © {new Date().getFullYear()} TattvaQuest. All rights reserved.
                  </p>
                </div>
                <p className="mt-4 text-center text-xs text-zinc-600">
                  TattvaQuest provides LegalTech software and consulting services. We do not provide legal advice or legal representation.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
