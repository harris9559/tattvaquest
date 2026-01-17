import ContactForm from "../_components/ContactForm";

export default function ContactPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="section-heading">Contact</p>
        <h1 className="section-title">Start a conversation with TattvaQuest.</h1>
        <p className="section-body">
          Share a brief summary of your incident response, eDiscovery, or compliance automation
          initiatives. Our team will follow up to coordinate next steps.
        </p>
      </header>

      <section
        id="request-demo"
        className="max-w-xl rounded-xl border border-white/5 bg-slate-950/70 p-5 shadow-subtle"
        aria-label="Contact form"
      >
        <ContactForm />
      </section>
    </div>
  );
}
