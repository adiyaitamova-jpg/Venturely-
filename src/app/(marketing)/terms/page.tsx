import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="October 2026" intro={<>Template terms for the product. <strong>Not legal advice and not reviewed by counsel</strong> — operators must adapt them before launch.</>}>
      <section>
        <h2>Who can use Venturely</h2>
        <p>You must be at least 13. If local law requires a parent or guardian&apos;s consent for you to use online services, you need it before signing up.</p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>
          You own what you post. You give us permission to display it according to your visibility settings. Only post things that are true and that you have the right to share — claims about
          achievements must be accurate, and verification can be revoked if evidence turns out to be false.
        </p>
      </section>
      <section>
        <h2>Rankings and AI feedback</h2>
        <p>
          Rankings follow the published <Link href="/leaderboard/methodology" className="text-accent underline">methodology</Link> and may change as the formula improves. AI Mentor output is advisory, can be
          wrong, and is not an official evaluation or a prediction of admission to any program.
        </p>
      </section>
      <section>
        <h2>Behaviour</h2>
        <p>
          Follow the <Link href="/guidelines" className="text-accent underline">Community Guidelines</Link>. We may remove content or suspend accounts that break them.
        </p>
      </section>
      <section>
        <h2>Changes and termination</h2>
        <p>You can delete your account at any time. We&apos;ll give notice of material changes to these terms.</p>
      </section>
    </LegalPage>
  );
}
