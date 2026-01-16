export const metadata = {
  title: "Technology",
  description:
    "Technology platform for secure legal process automation, evidence handling, and compliance workflows.",
};

export default function TechnologyPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="section-heading">Technology</p>
        <h1 className="section-title">A secure automation layer for legal and incident workflows.</h1>
        <p className="section-body max-w-2xl">
          TattvaQuest is built as a LegalTech and data automation platform that connects your
          existing systems, evidence sources, and collaboration tools. Our focus is on reliability,
          explainability, and defensible handling of operational and legal process data.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-xl border border-white/5 bg-slate-950/70 p-4 shadow-subtle">
          <h2 className="text-sm font-semibold text-zinc-50">Data Automation Engine</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Model incident, discovery, and compliance workflows as repeatable steps with policies,
            SLAs, and evidence checkpoints. Configure flows without custom code-heavy projects.
          </p>
        </article>
        <article className="rounded-xl border border-white/5 bg-slate-950/70 p-4 shadow-subtle">
          <h2 className="text-sm font-semibold text-zinc-50">Security & Governance</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Role-aware access, audit trails, and environment separation so security, legal, and
            operations teams see what they need without overexposure of sensitive data.
          </p>
        </article>
        <article className="rounded-xl border border-white/5 bg-slate-950/70 p-4 shadow-subtle">
          <h2 className="text-sm font-semibold text-zinc-50">Integrations First</h2>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Connect to ticketing, case management, storage, and evidence systems using APIs and
            message-based integrations. TattvaQuest complements your stack instead of replacing it.
          </p>
        </article>
      </section>
    </div>
  );
}
