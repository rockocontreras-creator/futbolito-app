"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { registerWithPassword, signInWithPassword } from "@/server/actions/auth";

type ServerFail = { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/** Envía el formulario a la acción; si vuelve un error lo muestra, si sale bien la acción redirige. */
function useSubmit<T extends FieldValues>(
  form: UseFormReturn<T>,
  action: (values: T) => Promise<ServerFail>,
) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const onSubmit = form.handleSubmit(() => {
    setError(null);
    startTransition(async () => {
      const res = await action(form.getValues());
      setError(res.error);
      for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
        if (messages?.[0]) form.setError(field as Path<T>, { message: messages[0] });
      }
    });
  });
  return { pending, error, onSubmit };
}

function PasswordInput({
  id,
  autoComplete,
  invalid,
  ...props
}: React.ComponentProps<"input"> & { invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className="pr-12"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}

function FormError({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive">
      {text}
    </p>
  );
}

export function PasswordSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });
  const { pending, error, onSubmit } = useSubmit(form, (v) => signInWithPassword(v, callbackUrl));
  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="identifier" label="Correo o usuario" error={errors.identifier?.message}>
        <Input
          id="identifier"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="tucorreo@ejemplo.cl o tu usuario"
          aria-invalid={Boolean(errors.identifier) || undefined}
          aria-describedby={errors.identifier ? "identifier-error" : undefined}
          {...form.register("identifier")}
        />
      </Field>
      <Field id="password" label="Contraseña" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          invalid={Boolean(errors.password)}
          {...form.register("password")}
        />
      </Field>
      <FormError text={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const form = useForm<z.input<typeof registerSchema>, unknown, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const { pending, error, onSubmit } = useSubmit(form, (v) => registerWithPassword(v, callbackUrl));
  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="name" label="Nombre" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Como te conocen en la cancha"
          aria-invalid={Boolean(errors.name) || undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...form.register("name")}
        />
      </Field>
      <Field id="email" label="Correo" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="tucorreo@ejemplo.cl"
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...form.register("email")}
        />
      </Field>
      <Field id="password" label="Contraseña" hint="Mínimo 8 caracteres." error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          invalid={Boolean(errors.password)}
          {...form.register("password")}
        />
      </Field>
      <FormError text={error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
