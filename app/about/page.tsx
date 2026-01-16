import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "About TattvaQuest, a LegalTech and data automation company focused on incident response and compliance workflows.",
  openGraph: {
    title: "About | TattvaQuest",
    description:
      "Learn about TattvaQuest, a LegalTech and data automation company focused on dependable legal process automation.",
    url: "/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="section-heading">About</p>
        <h1 className="section-title">Focused on dependable legal process automation.</h1>
        <p className="section-body">
          TattvaQuest is a LegalTech and data management company. We build software that helps
          organizations coordinate incident response, disaster recovery, eDiscovery, and compliance
          workflows in a more consistent, auditable way.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-xl border border-white/5 bg-slate-950/70 p-4 shadow-subtle transition-transform transition-colors md:hover:-translate-y-0.5 md:hover:border-sky-500/60 md:hover:bg-slate-950">
          <h2 className="text-sm font-semibold text-zinc-50">What we do</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            We provide litigation support technology and legal process automation. Our platform
            orchestrates workflows and data; your legal and security teams make the decisions.
          </p>
        </article>
        <article className="rounded-xl border border-white/5 bg-slate-950/70 p-4 shadow-subtle transition-transform transition-colors md:hover:-translate-y-0.5 md:hover:border-sky-500/60 md:hover:bg-slate-950">
          <h2 className="text-sm font-semibold text-zinc-50">What we are not</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            TattvaQuest is not a law firm and does not provide legal advice or legal representation.
            We work alongside your internal and external counsel by improving the quality of data and
            process.
          </p>
        </article>
        <article className="rounded-xl border border-white/5 bg-slate-950/70 p-4 shadow-subtle transition-transform transition-colors md:hover:-translate-y-0.5 md:hover:border-sky-500/60 md:hover:bg-slate-950">
          <h2 className="text-sm font-semibold text-zinc-50">How we work</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            We prioritize clarity, auditability, and alignment. Our implementations are guided by
            your governance requirements, security architecture, and existing tooling.
          </p>
        </article>
      </section>
    </div>
  );
}
