"use client";
const stats = [
  { value: "Deep Industry Experience", label: "Hands-on expertise in LegalTech & eDiscovery", description: "eDiscovery and digital forensics leadership" },
  { value: "Specialist-Led Consulting", label: "Delivery Model", description: "Direct Principal involvement from day one" },
  { value: "Defensible by Design", label: "Methodology", description: "Documented processes designed for legal scrutiny" },
  { value: "Security & Confidentiality", label: "Data protection at every step", description: "Discretion and care throughout the engagement" },
];

const features = [
  {
    title: "Enterprise-Grade Security",
    description: "Security-first practices with encryption and strict access controls.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: "Defensible Methodology",
    description: "Defensible procedures designed to withstand legal scrutiny and regulatory review.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Rapid Response",
    description: "Availability for critical incidents with clear escalation and communication.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Global Reach",
    description: "Capabilities to handle cross-border investigations and multi-jurisdictional matters.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HomeWhyUsSection() {
  return (
    <section className="relative overflow-hidden py-24">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2000&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/90 to-black/80" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left: Stats */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">Why TattvaQuest</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Built for Organizations That Demand Rigor
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              A new consulting venture led by a Principal Consultant with 20+ years of experience in eDiscovery and Digital Forensics, focused on rigorous, defensible work.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="border-l-2 border-sky-500 pl-4">
                  <div className="text-4xl font-bold text-white">{stat.value}</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-200">{stat.label}</div>
                  <div className="mt-1 text-xs text-zinc-500">{stat.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Features */}
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-sky-500/50 hover:bg-white/10"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 transition-colors group-hover:bg-sky-500/20">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
