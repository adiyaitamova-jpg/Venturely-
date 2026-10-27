"use client";

import * as React from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPasswordAction } from "@/actions/auth";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.input<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  if (sent) {
    return (
      <div>
        <div className="mb-4 grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
          <MailCheck className="size-5" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          If an account exists for that email, we&apos;ve sent a link to reset your password. It expires in one hour.
        </p>
        <Button asChild variant="secondary" className="mt-6 w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reset your password</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted">Enter the email you signed up with and we&apos;ll send you a reset link.</p>
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          const res = await forgotPasswordAction(values);
          if (res.ok) setSent(true);
          else setError(res.error);
        })}
      >
        <FormError message={error} />
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus {...form.register("email")} />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={form.formState.isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
