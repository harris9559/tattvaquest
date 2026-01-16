export const metadata = {
  title: "Solutions",
  description:
    "Solutions for incident response, disaster recovery, eDiscovery, evidence management, and compliance automation.",
};

interface SolutionItem {
  title: string;
  category: string;
  summary: string;
}

const solutions: SolutionItem[] = [
  {
    title: "Incident Response Automation",
    category: "Incident Response (IR)",
    summary:
      "Orchestrate incident intake, triage, approvals, and documentation with guided workflows aligned to your response plans.",
  },
  {
    title: "Disaster Recovery Runbooks",
    category: "Disaster Recovery (DR)",
    summary:
      "Automated DR runbooks with notifications, dependency checks, and evidence of each recovery step for auditors.",
  },
  {
    title: "eDiscovery Intake & Routing",
    category: "eDiscovery",
    summary:
      "Standardize legal hold intake, evidence routing, and export into litigation support technology platforms.",
  },
  {
    title: "Evidence Processing Pipelines",
    category: "Evidence Management",
    summary:
      "Normalize, enrich, and track digital evidence with defensible chains of custody and system-of-record exports.",
  },
  {
    title: "Compliance Controls & Attestations",
    category: "Compliance & Audit",
    summary:
      "Capture control execution, approvals, and attestations in repeatable workflows that feed your audit reports.",
  },
];

export default function SolutionsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="section-heading">Solutions</p>
        <h1 className="section-title">Legal process automation for high-stakes workflows.</h1>
        <p className="section-body max-w-2xl">
          TattvaQuest connects security, legal, and operations teams around shared data and structured
          workflows. We provide LegalTech automation for incident response, disaster recovery,
          eDiscovery, evidence processing, and compliance programs.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {solutions.map((item) => (
          <article
            key={item.title}
            className="flex flex-col justify-between rounded-xl border border-white/5 bg-slate-950/70 p-4 shadow-subtle"
          >
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-300">
                {item.category}
              </p>
              <h2 className="text-sm font-semibold text-zinc-50">{item.title}</h2>
              <p className="text-xs leading-relaxed text-zinc-400">{item.summary}</p>
            </div>
            <div className="mt-4 text-[11px] text-zinc-500">
              Designed to complement your legal counsel, not replace it.
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
