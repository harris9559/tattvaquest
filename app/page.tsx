export default function Home() {
  return (
    <div className="space-y-12">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
        <div className="space-y-6">
          <p className="section-heading">LegalTech Incident &amp; Data Automation</p>
          <h1 className="section-title">
            Accelerate incident response and legal workflows without compromising control.
          </h1>
          <p className="section-body">
            TattvaQuest orchestrates incident response, digital evidence, and compliance workflows on
            a single, secure automation layer. Reduce response time from days to hours while keeping
            legal, security, and risk teams aligned.
          </p>
          <dl className="grid gap-3 text-[11px] text-zinc-300 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-950/70 px-3 py-2">
              <dt className="font-medium text-zinc-100">Faster response</dt>
              <dd className="mt-0.5 text-zinc-400">Structured workflows reduce handoffs and rework.</dd>
            </div>
            <div className="rounded-lg bg-slate-950/70 px-3 py-2">
              <dt className="font-medium text-zinc-100">Secure automation</dt>
              <dd className="mt-0.5 text-zinc-400">Policy-driven steps with clear approvals and access.</dd>
            </div>
            <div className="rounded-lg bg-slate-950/70 px-3 py-2">
              <dt className="font-medium text-zinc-100">Audit-ready</dt>
              <dd className="mt-0.5 text-zinc-400">Consistent records for regulators and internal review.</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-black shadow-subtle transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Contact Us
            </a>
            <a
              href="/contact#request-demo"
              className="inline-flex items-center justify-center rounded-full border border-sky-500/70 bg-accentSoft px-6 py-2.5 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Request Demo
            </a>
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
            We do not provide legal advice or legal representation.
          </p>
        </div>
        <div className="space-y-4 rounded-xl border border-white/5 bg-slate-950/70 p-5 shadow-subtle">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
            Automation Snapshot
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs text-zinc-300">
            <div className="space-y-1 rounded-lg bg-slate-900/80 p-3 transition-colors md:hover:bg-slate-900">
              <div className="text-[11px] font-semibold text-zinc-300">Incident Response (IR)</div>
              <p className="text-[11px] text-zinc-400">
                Structured playbooks, evidence intake, and handoffs between security, legal, and
                operations.
              </p>
            </div>
            <div className="space-y-1 rounded-lg bg-slate-900/80 p-3 transition-colors md:hover:bg-slate-900">
              <div className="text-[11px] font-semibold text-zinc-300">Disaster Recovery (DR)</div>
              <p className="text-[11px] text-zinc-400">
                Automated notifications, governance checks, and audit-ready reporting for recovery
                events.
              </p>
            </div>
            <div className="space-y-1 rounded-lg bg-slate-900/80 p-3 transition-colors md:hover:bg-slate-900">
              <div className="text-[11px] font-semibold text-zinc-300">eDiscovery</div>
              <p className="text-[11px] text-zinc-400">
                Evidence collection pipelines, defensible tracking, and export to existing litigation
                support tools.
              </p>
            </div>
            <div className="space-y-1 rounded-lg bg-slate-900/80 p-3 transition-colors md:hover:bg-slate-900">
              <div className="text-[11px] font-semibold text-zinc-300">Compliance &amp; Audit</div>
              <p className="text-[11px] text-zinc-400">
                Policy-driven workflows, attestations, and immutable activity trails for auditors.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <SolutionCard
          title="Incident Response Automation"
          body="Codify IR plans into guided workflows that orchestrate evidence capture, approvals, and documentation across teams."
        />
        <SolutionCard
          title="Disaster Recovery Optimization"
          body="Standardize DR runbooks with automated checkpoints, communication tracks, and compliance sign-offs."
        />
        <SolutionCard
          title="eDiscovery & Evidence Management"
          body="Streamline intake, enrichment, and transfer of digital evidence into your existing litigation support stack."
        />
        <SolutionCard
          title="Compliance & Audit Reporting"
          body="Generate consistent, defensible records with structured data, audit timelines, and exportable summaries."
        />
      </section>
    </div>
  );
}

interface SolutionCardProps {
  title: string;
  body: string;
}

function SolutionCard({ title, body }: SolutionCardProps) {
  return (
    <article className="flex flex-col justify-between rounded-xl border border-white/5 bg-slate-950/70 p-4 shadow-subtle transition-transform transition-colors md:hover:-translate-y-0.5 md:hover:border-sky-500/60 md:hover:bg-slate-950">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-50">{title}</h2>
        <p className="text-xs leading-relaxed text-zinc-400">{body}</p>
      </div>
      <div className="mt-4 text-[11px] font-medium text-sky-300">
        Legal process automation • No legal advice
      </div>
    </article>
  );
}
