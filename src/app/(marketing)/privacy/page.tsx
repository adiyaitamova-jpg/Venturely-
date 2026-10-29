import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="October 2026"
      intro={<>This policy describes how the product is built to handle data. It is a starting point and <strong>has not been reviewed by a lawyer</strong>; operators must have it reviewed for their jurisdictions (e.g. GDPR, UK Children&apos;s Code, COPPA, state student-privacy laws) before launch.</>}
    >
      <section>
        <h2>What we collect — and what we deliberately don&apos;t</h2>
        <ul>
          <li><strong>Account:</strong> email (for sign-in and security messages only — never shown to other members) and a hashed password.</li>
          <li><strong>Profile:</strong> what you choose to add — name, username, bio, skills, interests, languages, availability, portfolio entries, achievements and optional links.</li>
          <li><strong>Optional coarse region</strong> (e.g. “Europe”). We never ask for your birthday, school, address, phone number or exact location.</li>
          <li><strong>Activity on projects</strong> you join (milestones, applications, invitations) so your team can work together.</li>
          <li><strong>AI Mentor history:</strong> your conversations and evaluations, private to you.</li>
        </ul>
      </section>
      <section>
        <h2>Who can see your information</h2>
        <ul>
          <li><strong>Members only</strong> (default): signed-in members can see your profile.</li>
          <li><strong>Public:</strong> anyone with your link can see it. Only public profiles may appear to signed-out visitors.</li>
          <li><strong>Private:</strong> only you; you&apos;re excluded from discovery, AI matching and leaderboards.</li>
          <li>Your email, password, peer-feedback ratings you give, saved lists, blocks, reports and AI history are never shown to other members.</li>
        </ul>
      </section>
      <section>
        <h2>AI processing</h2>
        <p>
          AI features send the minimum data needed to an AI provider (currently Anthropic) through our servers. The Teammate Matcher shares only member-visible profile fields of shortlisted
          candidates (no names, emails or private profiles). Evaluations and Copilot conversations include the project text you choose to share. We don&apos;t use your data to train models.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>Change visibility any time in Settings. Edit or delete any portfolio entry or achievement.</li>
          <li>Clear Copilot history or delete conversations whenever you like.</li>
          <li>Delete your account from Settings → Account; this permanently removes your profile and personal data.</li>
        </ul>
      </section>
      <section>
        <h2>Young members and consent</h2>
        <p>
          TEAMi is for people aged 13 and over. Depending on where a member lives, parental or guardian consent may be required for some processing (for example, the age of digital consent
          ranges from 13 to 16 across the EU). Operators should implement a consent flow appropriate to their launch regions before opening sign-ups there. If you believe a child under 13 has
          created an account, contact {BRAND.safetyEmail} and we&apos;ll remove it.
        </p>
      </section>
      <section>
        <h2>Security</h2>
        <p>Passwords are hashed with bcrypt, sessions use secure HTTP-only cookies, and access to every private action is checked on the server.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions or requests: {BRAND.supportEmail}.</p>
      </section>
    </LegalPage>
  );
}
