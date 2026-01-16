export const metadata = {
  title: "Terms of Service",
  description:
    "Example Terms of Service structure for TattvaQuest's LegalTech and data automation platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="section-heading">Terms of Service</p>
        <h1 className="section-title">Example SaaS terms structure for the TattvaQuest platform.</h1>
        <p className="section-body max-w-2xl">
          The text on this page is illustrative only and does not represent binding terms. Customers
          should work with qualified legal counsel to prepare and negotiate actual terms of service.
        </p>
      </header>

      <section className="space-y-4 text-xs leading-relaxed text-zinc-400">
        <p>
          This sample section can be used to describe, at a high level, the nature of the TattvaQuest
          service as a LegalTech and litigation support technology platform. It is not intended to
          describe legal services or legal representation of any kind.
        </p>
      </section>
    </div>
  );
}
