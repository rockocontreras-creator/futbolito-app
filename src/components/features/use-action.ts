"use client";

import { useState, useTransition } from "react";

type Result = { ok: true; data: unknown } | { ok: false; error: string };

/** Corre una Server Action y guarda el error para mostrarlo. */
export function useServerAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>, onOk?: (data: unknown) => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onOk?.(res.data);
      else setError(res.error);
    });
  };
  return { pending, error, run, setError };
}
