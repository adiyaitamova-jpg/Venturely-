import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Community guidelines" };

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community guidelines" updated="October 2026">
      <p>Venturely works because people can trust each other. Most members are teenagers, so we hold everyone — including adults — to a high standard.</p>
      <section>
        <h2>Be honest</h2>
        <ul>
          <li>Only claim skills, achievements and contributions that are yours. Credit your teammates.</li>
          <li>Don&apos;t game rankings: no fake projects, padded milestones or feedback trading. We look for patterns and reset scores built on them.</li>
        </ul>
      </section>
      <section>
        <h2>Be kind and professional</h2>
        <ul>
          <li>No harassment, bullying, hate, sexual content or threats. Disagree about ideas, not people.</li>
          <li>Invitations and applications should be specific and respectful. If someone declines, accept it.</li>
        </ul>
      </section>
      <section>
        <h2>Stay safe</h2>
        <ul>
          <li>Keep conversations about the project. Don&apos;t ask for or share personal details like home addresses, phone numbers, school names or photos.</li>
          <li>Never move to private chat apps with someone you don&apos;t know offline without a trusted adult&apos;s awareness. Never agree to meet in person alone.</li>
          <li>Nobody legitimate will ask you for money, passwords or ID. Report it if they do.</li>
        </ul>
      </section>
      <section>
        <h2>Use the tools</h2>
        <ul>
          <li><strong>Block</strong> anyone from their profile menu — they can&apos;t find or contact you, and they&apos;re not notified.</li>
          <li><strong>Report</strong> people, projects or claims that break these rules. A moderator reviews every report.</li>
          <li>If someone is in immediate danger, contact local emergency services first, then {BRAND.safetyEmail}.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
