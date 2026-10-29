import "server-only";

type Mail = { to: string; subject: string; text: string };

/**
 * Sends transactional email through Resend when RESEND_API_KEY is configured.
 * Without it, development logs the message to the server console so flows like
 * password reset can still be exercised locally. Returns whether it was delivered.
 */
export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "TEAMi <no-reply@teami.dev>";
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[email:dev] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`);
    } else {
      console.warn("[email] RESEND_API_KEY is not set; email not sent:", mail.subject);
    }
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[email] Resend responded", res.status);
    return res.ok;
  } catch (err) {
    console.error("[email] send failed", err);
    return false;
  }
}
