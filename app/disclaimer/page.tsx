import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important disclaimer explaining that TattvaQuest is not a law firm and does not provide legal advice.",
  openGraph: {
    title: "Disclaimer | TattvaQuest",
    description:
      "Important disclaimer explaining that TattvaQuest is not a law firm and does not provide legal advice or representation.",
    url: "/disclaimer",
    type: "website",
  },
};

export default function DisclaimerPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="section-heading">Disclaimer</p>
        <h1 className="section-title">We do not provide legal advice or legal representation.</h1>
        <p className="section-body">
          TattvaQuest is a LegalTech and data automation company. We provide software that supports
          legal and incident-related processes. We do not provide legal advice, legal opinions, or
          legal representation.
        </p>
      </header>

      <section className="space-y-4 text-xs leading-relaxed text-zinc-400">
        <p>
          Any example workflows, templates, or configurations shown in this product are for
          informational and technical demonstration purposes only. They should not be interpreted as
          recommendations on how to comply with any law or regulation, or how to handle specific
          matters, cases, or disputes.
        </p>
        <p>
          Organizations using TattvaQuest remain responsible for seeking advice from their own
          qualified legal professionals and for ensuring that their use of the platform complies with
          applicable laws, regulations, and professional obligations.
        </p>
      </section>
    </div>
  );
}
