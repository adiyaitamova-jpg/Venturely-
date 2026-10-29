import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Welcome back</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted">Sign in to pick up where your team left off.</p>
      <SignInForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        New to TEAMi?{" "}
        <Link href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"} className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
      {process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === "true" && (
        <div className="mt-8 rounded-lg border border-line bg-surface p-4 text-[13px] text-muted">
          <p className="font-medium text-ink">Exploring the demo?</p>
          <p className="mt-1">
            Sign in as <span className="font-mono text-ink">maya@demo.teami.dev</span> with password{" "}
            <span className="font-mono text-ink">teami-demo-1</span>. All demo accounts are fictional.
          </p>
        </div>
      )}
    </>
  );
}
