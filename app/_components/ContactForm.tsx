"use client";

import { useId, useMemo, useRef, useState } from "react";

interface ContactFormState {
  name: string;
  email: string;
  message: string;
}

type FieldErrors = Partial<Record<keyof ContactFormState, string>>;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(form: ContactFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!isValidEmail(form.email.trim())) errors.email = "Email must be a valid email address";
  if (!form.message.trim()) errors.message = "Message is required";

  return errors;
}

function normalizeApiBaseUrl(input: string) {
  return input.replace(/\/+$/, "");
}

export default function ContactForm() {
  const formId = useId();
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  const apiBaseUrl = useMemo(() => {
    const fromEnv = process.env.NEXT_PUBLIC_API_URL;
    return normalizeApiBaseUrl(fromEnv && fromEnv.length > 0 ? fromEnv : "http://localhost:3001");
  }, []);

  const [form, setForm] = useState<ContactFormState>({ name: "", email: "", message: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const hasErrors = useMemo(() => Object.keys(fieldErrors).length > 0, [fieldErrors]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(form);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitState({ status: "error", message: "Please correct the highlighted fields." });
      queueMicrotask(() => errorSummaryRef.current?.focus());
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      const response = await fetch(`${apiBaseUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const serverFields = data?.error?.fields;
        if (serverFields && typeof serverFields === "object") {
          setFieldErrors(serverFields);
        }

        setSubmitState({
          status: "error",
          message: data?.error?.message || "Unable to submit at this time. Please try again.",
        });
        queueMicrotask(() => errorSummaryRef.current?.focus());
        return;
      }

      setSubmitState({ status: "success" });
      setFieldErrors({});
      setForm({ name: "", email: "", message: "" });
    } catch (_e) {
      setSubmitState({ status: "error", message: "Unable to connect to the server. Please try again." });
      queueMicrotask(() => errorSummaryRef.current?.focus());
    }
  }

  function setField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  const nameErrorId = `${formId}-name-error`;
  const emailErrorId = `${formId}-email-error`;
  const messageErrorId = `${formId}-message-error`;

  const isSubmitting = submitState.status === "submitting";

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div
        ref={errorSummaryRef}
        tabIndex={-1}
        aria-live="polite"
        className={
          submitState.status === "error"
            ? "rounded-md border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-[11px] text-rose-200"
            : submitState.status === "success"
              ? "rounded-md border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-200"
              : "sr-only"
        }
      >
        {submitState.status === "error" ? submitState.message : null}
        {submitState.status === "success" ? "Thank you. Your message has been submitted." : null}
      </div>

      <div className="space-y-1 text-sm">
        <label htmlFor={`${formId}-name`} className="text-zinc-200">
          Name
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? nameErrorId : undefined}
          disabled={isSubmitting}
          className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 focus:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-70"
          placeholder="Full name"
        />
        {fieldErrors.name ? (
          <p id={nameErrorId} className="text-[11px] leading-relaxed text-rose-200">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-1 text-sm">
        <label htmlFor={`${formId}-email`} className="text-zinc-200">
          Work email
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => setField("email", event.target.value)}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? emailErrorId : undefined}
          disabled={isSubmitting}
          className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 focus:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-70"
          placeholder="you@company.com"
        />
        {fieldErrors.email ? (
          <p id={emailErrorId} className="text-[11px] leading-relaxed text-rose-200">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-1 text-sm">
        <label htmlFor={`${formId}-message`} className="text-zinc-200">
          How can we help?
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={4}
          value={form.message}
          onChange={(event) => setField("message", event.target.value)}
          aria-invalid={fieldErrors.message ? true : undefined}
          aria-describedby={fieldErrors.message ? messageErrorId : undefined}
          disabled={isSubmitting}
          className="w-full resize-none rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 focus:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-70"
          placeholder="Briefly describe your situation, timelines, and stakeholders."
        />
        {fieldErrors.message ? (
          <p id={messageErrorId} className="text-[11px] leading-relaxed text-rose-200">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-black shadow-subtle transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-80"
      >
        {isSubmitting ? "Submitting…" : "Submit inquiry"}
      </button>

      {hasErrors ? (
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Fields marked with errors must be corrected before submitting.
        </p>
      ) : null}
    </form>
  );
}
