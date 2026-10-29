import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { getCurrentUser } from "@/server/auth/current-user";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,40%)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
        <p className="text-xs text-faint">TEAMi is built for students aged 13 and up. We never show your email publicly.</p>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-line bg-accent text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid opacity-[0.15] [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
        <p className="relative max-w-sm font-display text-[40px] leading-[1.05] tracking-[-0.01em]">
          The best portfolio is a project you actually <em>finished</em> — with people who made it better.
        </p>
        <div className="relative space-y-3">
          {[
            "Find teammates by skills, availability and shared causes",
            "Rankings based on evidence, never popularity",
            "An AI mentor that gives honest, specific feedback",
          ].map((line) => (
            <p key={line} className="flex items-start gap-2.5 text-[15px] text-paper/85">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-accent-line" aria-hidden /> {line}
            </p>
          ))}
        </div>
      </aside>
    </div>
  );
}
