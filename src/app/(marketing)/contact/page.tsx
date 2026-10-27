import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <LegalPage title="Contact" updated="October 2026">
      <section>
        <h2>General questions &amp; partnerships</h2>
        <p>{BRAND.supportEmail}</p>
      </section>
      <section>
        <h2>Safety concerns</h2>
        <p>
          {BRAND.safetyEmail} — for urgent safety issues involving a member. You can also report any profile or project directly from its menu. In an emergency, contact local emergency services first.
        </p>
      </section>
      <section>
        <h2>Schools &amp; educators</h2>
        <p>Interested in running Venturely with a club or class? Write to {BRAND.supportEmail} and tell us about your students.</p>
      </section>
    </LegalPage>
  );
}
