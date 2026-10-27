"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInAction } from "@/actions/auth";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignInForm({ next }: { next?: string }) {
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = await signInAction(values, next);
        if (res && !res.ok) setError(res.error);
      })}
    >
      <FormError message={error} />
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" autoFocus {...form.register("email")} />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        aside={
          <Link href="/forgot-password" className="text-xs text-accent hover:underline">
            Forgot password?
          </Link>
        }
      >
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
