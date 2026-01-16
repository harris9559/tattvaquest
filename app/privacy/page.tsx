export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for TattvaQuest's LegalTech and data automation services (informational template only).",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="section-heading">Privacy Policy</p>
        <h1 className="section-title">How TattvaQuest approaches privacy and data handling.</h1>
        <p className="section-body max-w-2xl">
          The content on this page is provided as a product template example only and does not
          constitute legal advice. Organizations should work with qualified counsel to review and
          finalize their own privacy policies.
        </p>
      </header>

      <section className="space-y-4 text-xs leading-relaxed text-zinc-400">
        <p>
          TattvaQuest provides LegalTech and data automation software that may be configured by
          customers to process operational, security, and case-related data. The specific categories
          of data, retention periods, and legal bases for processing depend on how each customer
          chooses to deploy and govern the platform.
        </p>
        <p>
          This example Privacy Policy section is intended to illustrate structure only. It is not a
          substitute for a tailored privacy notice and should not be relied upon as legal guidance.
        </p>
      </section>
    </div>
  );
}
