import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isResetTokenValid } from "@/server/services/auth";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = token.length <= 200 && (await isResetTokenValid(token));
  if (!valid) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">This link has expired</h1>
        <p className="mt-2 text-sm text-muted">Reset links work once and expire after an hour. Request a fresh one.</p>
        <Button asChild className="mt-6 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Choose a new password</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted">You&apos;ll be signed out of other devices.</p>
      <ResetForm token={token} />
    </>
  );
}
