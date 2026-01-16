import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tattvaquest.example"),
  title: {
    default: "TattvaQuest | LegalTech & Data Automation",
    template: "%s | TattvaQuest",
  },
  description:
    "TattvaQuest delivers secure LegalTech automation for incident response, disaster recovery, eDiscovery, and compliance workflows.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="main-shell">
          <header className="border-b border-white/5 bg-black/60 backdrop-blur">
            <div className="main-shell-inner flex items-center justify-between gap-4 py-4">
              <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/90 text-xs font-bold text-black">
                  TQ
                </span>
                <span className="tracking-tight">TattvaQuest</span>
              </Link>
              <nav className="hidden items-center gap-6 text-xs font-medium text-zinc-300 sm:flex">
                {primaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="main-shell-inner flex-1 py-10 sm:py-12">{children}</main>

          <footer className="border-t border-white/5 bg-black/80 pt-6 pb-8">
            <div className="main-shell-inner flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-xs text-zinc-400">
                <div className="font-medium text-zinc-200">TattvaQuest</div>
                <div>
                  © {new Date().getFullYear()} TattvaQuest. All rights reserved.
                </div>
                <div className="max-w-md text-[11px] leading-relaxed text-zinc-500">
                  We provide LegalTech and legal process automation software. We do not
                  provide legal advice or legal representation.
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                {legalNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="underline-offset-4 hover:text-zinc-200 hover:underline"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
