const steps = [
  {
    number: "01",
    title: "Initial Consultation",
    description: "We begin with a confidential discussion to understand your situation, define scope, and establish clear objectives.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Evidence Collection",
    description: "Forensically sound acquisition of digital evidence with documented chain of custody and integrity verification.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Analysis & Investigation",
    description: "Deep-dive analysis using advanced tools and methodologies to uncover relevant findings and build timelines.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Reporting & Delivery",
    description: "Comprehensive reports with executive summaries, technical details, and actionable recommendations.",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function HomeProcessSection() {
  return (
    <section className="bg-gradient-to-b from-black to-slate-950/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">Our Process</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How We Work
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            A structured, transparent approach designed for clarity and defensibility, keeping you informed at every stage.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-sky-500/50 via-sky-500/20 to-transparent lg:block" />

          <div className="grid gap-12 lg:gap-0">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`relative flex flex-col items-center gap-8 lg:flex-row ${
                  index % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Content */}
                <div className={`flex-1 ${index % 2 === 0 ? "lg:pr-16 lg:text-right" : "lg:pl-16"}`}>
                  <div
                    className={`inline-flex items-center gap-4 ${
                      index % 2 === 0 ? "lg:flex-row-reverse" : ""
                    }`}
                  >
                    <span className="text-5xl font-bold text-sky-500/20">{step.number}</span>
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="mt-3 text-zinc-400">{step.description}</p>
                </div>

                {/* Center icon */}
                <div className="relative z-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-sky-500 bg-slate-950 text-sky-400 shadow-lg shadow-sky-500/20">
                  {step.icon}
                </div>

                {/* Empty space for alignment */}
                <div className="hidden flex-1 lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
