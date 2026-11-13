"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, MailCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { suggestEmail } from "@/lib/email-check";
import { cleanCode } from "@/lib/email-code";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import {
  confirmEmailAndSignIn,
  registerWithPassword,
  resendEmailCode,
  signInWithPassword,
  type AuthFormResult,
} from "@/server/actions/auth";

type Verify = { email: string; password: string; notice: string | null };

/**
 * Envía el formulario a la acción. Si vuelve un error lo muestra; si la cuenta tiene que confirmar el
 * correo, pasa al paso del código; si sale bien, la acción redirige.
 */
function useSubmit<T extends FieldValues>(
  form: UseFormReturn<T>,
  action: (values: T) => Promise<AuthFormResult>,
  password: (values: T) => string,
) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [verify, setVerify] = useState<Verify | null>(null);
  const onSubmit = form.handleSubmit(() => {
    setError(null);
    startTransition(async () => {
      const values = form.getValues();
      const res = await action(values);
      if (res.ok) {
        setVerify({ email: res.data.verifyEmail, password: password(values), notice: res.data.notice });
        return;
      }
      const fields = Object.entries(res.fieldErrors ?? {});
      // Si el error es de un campo, se muestra solo junto a ese campo.
      setError(fields.length ? null : res.error);
      for (const [field, messages] of fields) {
        if (messages?.[0]) form.setError(field as Path<T>, { message: messages[0] });
      }
    });
  });
  return { pending, error, onSubmit, verify, back: () => setVerify(null) };
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
  const { pending, error, onSubmit, verify, back } = useSubmit(
    form,
    (v) => signInWithPassword(v, callbackUrl),
    (v) => v.password,
  );
  const errors = form.formState.errors;
  if (verify) return <ConfirmEmailStep {...verify} callbackUrl={callbackUrl} onBack={back} />;

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
  const { pending, error, onSubmit, verify, back } = useSubmit(form, registerWithPassword, (v) => v.password);
  const errors = form.formState.errors;
  const suggestion = suggestEmail(useWatch({ control: form.control, name: "email" }) ?? "");
  if (verify) return <ConfirmEmailStep {...verify} callbackUrl={callbackUrl} onBack={back} />;

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
      {suggestion && (
        <p className="-mt-2 text-sm text-muted-foreground">
          ¿Quisiste decir{" "}
          <button
            type="button"
            className="font-bold text-primary underline underline-offset-4"
            onClick={() => form.setValue("email", suggestion, { shouldValidate: true })}
          >
            {suggestion}
          </button>
          ?
        </p>
      )}
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
      <p className="text-center text-[13px] text-muted-foreground">
        Te mandaremos un código a tu correo para confirmar que es tuyo.
      </p>
    </form>
  );
}

/** Paso 2: escribir el código de 6 dígitos que llegó al correo. */
function ConfirmEmailStep({
  email,
  password,
  notice,
  callbackUrl,
  onBack,
}: Verify & { callbackUrl: string; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(notice);
  const [wait, setWait] = useState(notice ? 0 : 60);
  const [pending, startTransition] = useTransition();
  const [sending, startSending] = useTransition();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  function submit(value: string) {
    setError(null);
    startTransition(async () => {
      const res = await confirmEmailAndSignIn({ email, code: value, password }, callbackUrl);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-7" aria-hidden />
        </span>
        <h2 className="text-2xl font-display">Revisa tu correo</h2>
        <p className="text-[15px] text-muted-foreground">
          Te mandamos un código de 6 números a <b className="break-all text-foreground">{email}</b>. Si no
          aparece, mira en spam o promociones.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(code);
        }}
        noValidate
        className="space-y-4"
      >
        <label htmlFor="code" className="sr-only">
          Código de 6 números
        </label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          value={code}
          onChange={(e) => {
            const v = cleanCode(e.target.value);
            setCode(v);
            if (v.length === 6 && !pending) submit(v);
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "code-error" : undefined}
          className="h-16 text-center text-4xl font-score tracking-[0.4em] placeholder:text-muted-foreground/30"
        />
        {error && (
          <p
            id="code-error"
            role="alert"
            className="rounded-lg bg-destructive/8 px-3 py-2 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}
        {info && !error && (
          <p role="status" className="rounded-lg bg-secondary px-3 py-2 text-sm">
            {info}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending || code.length !== 6}>
          {pending ? "Confirmando…" : "Confirmar y entrar"}
        </Button>
      </form>
      <div className="flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Cambiar correo
        </button>
        <button
          type="button"
          disabled={wait > 0 || sending}
          onClick={() =>
            startSending(async () => {
              setError(null);
              const res = await resendEmailCode({ email });
              setInfo(res.ok ? "Listo, te mandamos un código nuevo." : res.error);
              setWait(60);
            })
          }
          className="font-bold text-primary underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {sending ? "Enviando…" : wait > 0 ? `Mandar otro en ${wait} s` : "Mandar otro código"}
        </button>
      </div>
    </div>
  );
}
