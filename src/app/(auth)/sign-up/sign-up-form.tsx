"use client";

import * as React from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpAction } from "@/actions/auth";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignUpForm() {
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "", ageConfirmed: false as unknown as true },
  });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = await signUpAction(values);
        if (res && !res.ok) {
          setError(res.error);
          for (const [key, messages] of Object.entries(res.fieldErrors ?? {})) {
            form.setError(key as keyof SignUpInput, { message: messages[0] });
          }
        }
      })}
    >
      <FormError message={error} />
      <Field label="Your name" htmlFor="displayName" hint="Shown on your profile. A first name is fine." error={errors.displayName?.message}>
        <Input id="displayName" autoComplete="given-name" autoFocus {...form.register("displayName")} />
      </Field>
      <Field label="Email" htmlFor="email" hint="Used to sign in. Never shown publicly." error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters, mixing letters with numbers or symbols." error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <div className="space-y-1.5">
        <div className="flex items-start gap-2.5">
          <Controller
            control={form.control}
            name="ageConfirmed"
            render={({ field }) => (
              <Checkbox
                id="ageConfirmed"
                className="mt-0.5"
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                aria-invalid={errors.ageConfirmed ? true : undefined}
              />
            )}
          />
          <label htmlFor="ageConfirmed" className="text-[13px] leading-snug text-ink-2">
            I&apos;m 13 or older, and I agree to the{" "}
            <Link href="/terms" className="text-accent underline-offset-2 hover:underline" target="_blank">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy" className="text-accent underline-offset-2 hover:underline" target="_blank">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/guidelines" className="text-accent underline-offset-2 hover:underline" target="_blank">
              Community Guidelines
            </Link>
            .
          </label>
        </div>
        {errors.ageConfirmed && <p className="pl-7 text-[13px] text-negative">{errors.ageConfirmed.message}</p>}
      </div>
      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
