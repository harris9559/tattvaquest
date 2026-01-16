"use client";

import { useState } from "react";

interface ContactFormState {
  name: string;
  email: string;
  message: string;
}

export default function ContactPage() {
  const [form, setForm] = useState<ContactFormState>({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange<K extends keyof ContactFormState>(
    key: K,
    value: ContactFormState[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="section-heading">Contact</p>
        <h1 className="section-title">Start a conversation with TattvaQuest.</h1>
        <p className="section-body max-w-2xl">
          Share a brief summary of your incident response, eDiscovery, or compliance automation
          initiatives. Our team will follow up to coordinate next steps.
        </p>
      </header>

      <section id="request-demo" className="max-w-xl rounded-xl border border-white/5 bg-slate-950/70 p-5 shadow-subtle">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1 text-sm">
            <label htmlFor="name" className="text-zinc-200">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 focus:border-sky-400"
              placeholder="Full name"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label htmlFor="email" className="text-zinc-200">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 focus:border-sky-400"
              placeholder="you@company.com"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label htmlFor="message" className="text-zinc-200">
              How can we help?
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              value={form.message}
              onChange={(event) => handleChange("message", event.target.value)}
              className="w-full resize-none rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 focus:border-sky-400"
              placeholder="Briefly describe your current workflow, timelines, and stakeholders."
            />
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-black shadow-subtle transition hover:bg-sky-400"
          >
            Submit inquiry (frontend only)
          </button>

          <p className="text-[11px] leading-relaxed text-zinc-500">
            This form is for demonstration purposes only. No data is transmitted or stored.
          </p>

          {submitted && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-[11px] text-emerald-200">
              Thank you. Your message has been captured locally in this demo environment.
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
