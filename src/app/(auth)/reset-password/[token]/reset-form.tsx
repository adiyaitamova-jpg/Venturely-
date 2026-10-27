"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resetPasswordAction } from "@/actions/auth";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetForm({ token }: { token: string }) {
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<z.input<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const res = await resetPasswordAction(values);
        if (res && !res.ok) setError(res.error);
      })}
    >
      <FormError message={error} />
      <Field label="New password" htmlFor="password" hint="At least 10 characters, mixing letters with numbers or symbols." error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" autoFocus {...form.register("password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm?.message}>
        <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Set new password
      </Button>
    </form>
  );
}
