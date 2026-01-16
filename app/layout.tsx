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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-textPrimary`}>
        <div className="main-shell">
          <header className="sticky top-0 z-20 border-b border-white/5 bg-black/70 backdrop-blur">
            <div className="main-shell-inner flex items-center justify-between gap-4 py-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/90 text-xs font-bold uppercase tracking-tight text-black">
                  TQ
                </span>
                <span className="text-sm tracking-tight">TattvaQuest</span>
              </Link>

              {/* Desktop navigation */}
              <nav
                className="hidden items-center gap-6 text-xs font-medium text-zinc-300 md:flex"
                aria-label="Primary navigation"
              >
                {primaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative pb-1 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Mobile entry points */}
              <div className="flex items-center gap-2 md:hidden">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-black shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Contact
                </Link>
                <MobileNav primaryNav={primaryNav} />
              </div>
            </div>
          </header>

          <main className="main-shell-inner flex-1 pt-8 sm:pt-10 lg:pt-12">{children}</main>

          <footer className="border-t border-white/5 bg-black/80 pt-6 pb-8">
            <div className="main-shell-inner flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1 text-xs text-zinc-400">
                <div className="font-medium text-zinc-200">TattvaQuest</div>
                <div>© {new Date().getFullYear()} TattvaQuest. All rights reserved.</div>
                <div className="max-w-md text-[11px] leading-relaxed text-zinc-500">
                  We provide LegalTech and legal process automation software. We do not provide legal
                  advice or legal representation.
                </div>
              </div>
              <div className="flex flex-col gap-3 text-xs text-zinc-400 sm:items-end">
                <nav className="flex flex-wrap gap-3" aria-label="Legal navigation">
                  {legalNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="underline-offset-4 hover:text-zinc-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <p className="text-[11px] text-zinc-500">
                  For product or partnership inquiries, please use the Contact page.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
