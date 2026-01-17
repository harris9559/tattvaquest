import Link from "next/link";

const insights = [
  {
    title: "Best Practices for Digital Evidence Preservation in Corporate Investigations",
    excerpt: "A comprehensive guide to maintaining chain of custody and ensuring admissibility of digital evidence in legal proceedings.",
    category: "Digital Forensics",
    date: "Jan 15, 2026",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    readTime: "8 min read",
  },
  {
    title: "Navigating Cross-Border Data Privacy in eDiscovery",
    excerpt: "Understanding the complexities of GDPR, CCPA, and other regulations when conducting international electronic discovery.",
    category: "Compliance",
    date: "Jan 10, 2026",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80",
    readTime: "6 min read",
  },
  {
    title: "The Rise of AI in Legal Technology: Opportunities and Risks",
    excerpt: "How artificial intelligence is transforming legal workflows and what organizations need to consider for responsible adoption.",
    category: "LegalTech",
    date: "Jan 5, 2026",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80",
    readTime: "10 min read",
  },
];

export default function HomeInsightsSection() {
  return (
    <section className="bg-gradient-to-b from-slate-950/50 to-black py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">Insights</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Latest from Our Experts
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-zinc-400">
              Stay informed with our latest thinking on digital forensics, legal technology, and compliance.
            </p>
          </div>
          <Link
            href="/insights"
            className="inline-flex items-center text-sm font-medium text-sky-400 transition-colors hover:text-sky-300"
          >
            View all articles
            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight) => (
            <article
              key={insight.title}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/50 to-slate-950/50 transition-all duration-300 hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/10"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={insight.image}
                  alt={insight.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-full bg-sky-500/10 px-3 py-1 font-medium text-sky-400">
                    {insight.category}
                  </span>
                  <span className="text-zinc-500">{insight.date}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-500">{insight.readTime}</span>
                </div>

                <h3 className="mt-4 text-lg font-semibold leading-snug text-white transition-colors group-hover:text-sky-300">
                  {insight.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400 line-clamp-2">{insight.excerpt}</p>

                <Link
                  href="/insights"
                  className="mt-4 inline-flex items-center text-sm font-medium text-sky-400 transition-colors hover:text-sky-300"
                >
                  Read more
                  <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
