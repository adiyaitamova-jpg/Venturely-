import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <Logo className="justify-center" />
        <p className="mt-10 font-mono text-sm text-faint">404</p>
        <h1 className="mt-2 font-display text-[44px] leading-tight">We couldn&apos;t find that.</h1>
        <p className="mt-3 text-[15px] text-muted">The page may have moved, or it may be private. If someone shared a profile with you, you might need to sign in.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
